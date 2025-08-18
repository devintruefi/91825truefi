import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'; // Uses your .env var

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Middleware for protected routes (use in API handlers)
export async function getUserFromRequest(request: Request): Promise<{ id: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  
  // Handle local user tokens (base64 encoded)
  if (token.startsWith('local:')) {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const parts = decoded.split(':');
      if (parts[0] === 'local' && parts[1]) {
        // For local users, just return the user ID without database lookup
        return { id: parts[1] };
      }
    } catch (e) {
      console.error('Failed to decode local token:', e);
    }
  }
  
  // Handle JWT tokens
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const user = await prisma.users.findUnique({ where: { id: decoded.userId } }); // Assumes your users table is 'users'
  return user ? { id: user.id } : null;
} 
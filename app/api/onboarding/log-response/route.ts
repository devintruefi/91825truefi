import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header:', authHeader);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId = '';
    
    // Handle local user tokens (base64 encoded)
    if (token.startsWith('local:')) {
      try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts[0] === 'local' && parts[1]) {
          userId = parts[1];
          console.log('Local user token decoded, userId:', userId);
        }
      } catch (e) {
        console.error('Failed to decode local token:', e);
      }
    }
    
    // Handle JWT tokens
    if (!userId) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.userId || decoded.user_id || decoded.sub;
        console.log('JWT token decoded, userId:', userId, 'full decoded:', decoded);
        
        if (!userId) {
          console.error('No user ID found in JWT token:', decoded);
          return NextResponse.json({ error: 'No user ID in token' }, { status: 401 });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const { question, answer } = await request.json();

    console.log('Logging onboarding response:', {
      userId,
      question,
      answer: typeof answer === 'object' ? JSON.stringify(answer) : String(answer)
    });

    // Log the response to user_onboarding_responses
    await prisma.user_onboarding_responses.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        question,
        answer: typeof answer === 'object' ? JSON.stringify(answer) : String(answer),
        created_at: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging onboarding response:', error);
    return NextResponse.json(
      { error: 'Failed to log response' },
      { status: 500 }
    );
  }
}
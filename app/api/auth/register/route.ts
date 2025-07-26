import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, first_name, last_name } = await req.json();
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    
    const passwordHash = await hashPassword(password);
    const user = await prisma.users.create({
      data: { 
        id: randomUUID(),
        email, 
        password_hash: passwordHash,
        first_name,
        last_name,
        is_active: true,
        is_advisor: false,
        created_at: new Date(),
        updated_at: new Date()
      },
    });
    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
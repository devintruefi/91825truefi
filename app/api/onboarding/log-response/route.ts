import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId = '';
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.user_id || decoded.sub;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { question, answer } = await request.json();

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
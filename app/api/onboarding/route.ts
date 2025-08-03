import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { answers, userId } = await req.json();

    // Validate that we have answers
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 });
    }

    // For demo users or when no authentication is available, use the provided userId
    let user_id = userId;
    
    // Try to get user from auth token if available
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
      }
    } catch (error) {
      console.log('No auth token found, using provided userId');
    }

    if (!user_id) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    // Store each answer in the database
    const responsePromises = Object.entries(answers).map(([questionId, answer]) => {
      return prisma.user_onboarding_responses.create({
        data: {
          user_id: user_id,
          question: questionId,
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
        },
      });
    });

    await Promise.all(responsePromises);

    // Update onboarding progress
    await prisma.onboarding_progress.upsert({
      where: { user_id: user_id },
      update: { 
        current_step: 'completed',
        is_complete: true,
        updated_at: new Date()
      },
      create: {
        user_id: user_id,
        current_step: 'completed',
        is_complete: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding responses saved successfully' 
    });

  } catch (error) {
    console.error('Error saving onboarding responses:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding responses' }, 
      { status: 500 }
    );
  }
} 
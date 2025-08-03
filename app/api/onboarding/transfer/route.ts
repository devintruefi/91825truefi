import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { tempUserId, newUserId, answers } = await req.json();
    
    if (!tempUserId || !newUserId || !answers) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Delete old onboarding responses for temp user
    await prisma.user_onboarding_responses.deleteMany({
      where: { user_id: tempUserId }
    });
    
    await prisma.onboarding_progress.deleteMany({
      where: { user_id: tempUserId }
    });
    
    // Create new onboarding responses for the real user
    const responsePromises = Object.entries(answers).map(([questionId, answer]) => {
      return prisma.user_onboarding_responses.create({
        data: {
          user_id: newUserId,
          question: questionId,
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
        },
      });
    });
    
    await Promise.all(responsePromises);
    
    // Update onboarding progress for new user
    await prisma.onboarding_progress.upsert({
      where: { user_id: newUserId },
      update: { 
        current_step: 'completed',
        is_complete: true,
        updated_at: new Date()
      },
      create: {
        user_id: newUserId,
        current_step: 'completed',
        is_complete: true,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding data transferred successfully' 
    });
  } catch (error) {
    console.error('Error transferring onboarding data:', error);
    return NextResponse.json({ error: 'Failed to transfer data' }, { status: 500 });
  }
} 
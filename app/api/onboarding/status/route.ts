import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/onboarding/status
 * Returns the current onboarding status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check onboarding progress
    const onboardingProgress = await prisma.onboarding_progress.findUnique({
      where: { user_id: user.id }
    });

    // If no record exists, user hasn't started onboarding
    if (!onboardingProgress) {
      return NextResponse.json({
        isOnboarding: true,
        isComplete: false,
        currentStep: 'welcome',
        needsOnboarding: true
      });
    }

    // Return current status
    return NextResponse.json({
      isOnboarding: !onboardingProgress.is_complete,
      isComplete: onboardingProgress.is_complete || false,
      currentStep: onboardingProgress.current_step,
      needsOnboarding: !onboardingProgress.is_complete
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}
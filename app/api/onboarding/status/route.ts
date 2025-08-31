import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { initializeFreshSession } from '@/lib/onboarding/fresh-session';

const prisma = new PrismaClient();

/**
 * GET /api/onboarding/status
 * Returns the current onboarding status for the authenticated user
 */
export async function GET(request: NextRequest) {
  // If ONBOARDING_V2 is enabled, redirect to v2 endpoint
  if (process.env.ONBOARDING_V2 === 'true') {
    // Forward to v2 status endpoint
    const v2Response = await fetch(new URL('/api/onboarding/v2', request.url).toString(), {
      headers: request.headers
    });
    return v2Response;
  }
  
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check onboarding progress
    let onboardingProgress = await prisma.onboarding_progress.findUnique({
      where: { user_id: user.id }
    });

    // If no record exists, initialize fresh session to determine proper starting step
    if (!onboardingProgress) {
      console.log('No onboarding record found in status check, initializing fresh session');
      const freshSession = await initializeFreshSession(user.id);
      onboardingProgress = await prisma.onboarding_progress.findUnique({
        where: { user_id: user.id }
      });
      
      console.log('Fresh session initialized in status check:', {
        currentStep: freshSession.currentStep,
        itemsCollected: freshSession.itemsCollected,
        startedAtConsent: freshSession.shouldStartAtConsent
      });
      
      return NextResponse.json({
        isOnboarding: true,
        isComplete: false,
        currentStep: freshSession.currentStep,
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
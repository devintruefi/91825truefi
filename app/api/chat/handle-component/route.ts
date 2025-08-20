// Handle component interactions from chat UI
import { NextRequest, NextResponse } from 'next/server';
import { getNextStep, ONBOARDING_STEPS } from '@/lib/onboarding/onboarding-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { componentType, action, data, userId, onboardingProgress } = body;

    // Handle dashboard preview "Continue Setup" click
    if (componentType === 'dashboard_preview' && action === 'continue') {
      // Determine next onboarding step
      const currentPhase = onboardingProgress?.phase || 'personal';
      const nextStep = getNextStepFromPhase(currentPhase, onboardingProgress);
      
      if (nextStep) {
        return NextResponse.json({
          success: true,
          action: 'continue_onboarding',
          nextStep: nextStep,
          message: getNextStepMessage(nextStep),
          component: getComponentForStep(nextStep)
        });
      } else {
        // Onboarding complete
        return NextResponse.json({
          success: true,
          action: 'complete_onboarding',
          redirect: '/dashboard?welcome=1',
          message: '🎉 Your setup is complete! Let me show you your personalized dashboard.'
        });
      }
    }

    // Handle dashboard preview "View Dashboard" click
    if (componentType === 'dashboard_preview' && action === 'view_dashboard') {
      return NextResponse.json({
        success: true,
        action: 'navigate',
        redirect: '/dashboard',
        message: 'Opening your dashboard...'
      });
    }

    // Handle other component responses
    if (action === 'skip') {
      const nextStep = getNextStepFromPhase(
        onboardingProgress?.phase || 'personal',
        onboardingProgress
      );
      
      return NextResponse.json({
        success: true,
        action: 'skip_step',
        nextStep: nextStep,
        message: `Skipped. ${getNextStepMessage(nextStep)}`,
        component: getComponentForStep(nextStep)
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      message: 'Component response received'
    });

  } catch (error: any) {
    console.error('Error handling component response:', error);
    return NextResponse.json(
      { error: 'Failed to handle component response', details: error.message },
      { status: 500 }
    );
  }
}

function getNextStepFromPhase(currentPhase: string, progress: any): string | null {
  // Map phases to next logical step
  const phaseFlow: Record<string, string | null> = {
    'personal': 'financial',
    'financial': 'goals',
    'goals': 'preferences',
    'preferences': 'complete',
    'complete': null
  };

  // Check if specific steps within phase are incomplete
  if (currentPhase === 'financial' && !progress?.incomeVerified) {
    return 'income_verification';
  }
  if (currentPhase === 'goals' && (!progress?.goals || progress.goals.length === 0)) {
    return 'goal_selection';
  }
  if (currentPhase === 'preferences' && !progress?.riskTolerance) {
    return 'risk_assessment';
  }

  return phaseFlow[currentPhase] || null;
}

function getNextStepMessage(step: string | null): string {
  if (!step) return "You're all set!";
  
  const messages: Record<string, string> = {
    'financial': "Let's verify your income to personalize your budget.",
    'income_verification': "Please confirm your monthly income.",
    'goals': "What financial goals would you like to achieve?",
    'goal_selection': "Select 1-2 primary financial goals.",
    'preferences': "Let's understand your investment preferences.",
    'risk_assessment': "How comfortable are you with investment risk?",
    'complete': "🎉 Setup complete! Your dashboard is ready."
  };

  return messages[step] || "Let's continue setting up your profile.";
}

function getComponentForStep(step: string | null): any {
  if (!step) return null;

  const components: Record<string, any> = {
    'income_verification': {
      type: 'income_confirm',
      data: {
        detectedIncome: null,
        requiresConfirmation: true
      }
    },
    'goal_selection': {
      type: 'goals_select',
      data: {
        maxGoals: 2,
        options: [
          'build_wealth',
          'reduce_debt',
          'save_home',
          'retirement',
          'emergency_fund'
        ]
      }
    },
    'risk_assessment': {
      type: 'risk_slider',
      data: {
        min: 1,
        max: 10,
        default: 5
      }
    }
  };

  return components[step] || null;
}
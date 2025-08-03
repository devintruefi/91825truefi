import prisma from '@/lib/db';

export interface OnboardingData {
  [questionId: string]: string;
}

/**
 * Get onboarding data for a user
 * This function can be used by Penny to access user onboarding responses
 */
export async function getUserOnboardingData(userId: string): Promise<OnboardingData> {
  try {
    const responses = await prisma.user_onboarding_responses.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });

    // Convert to key-value pairs
    const responseData = responses.reduce((acc, response) => {
      acc[response.question] = response.answer;
      return acc;
    }, {} as Record<string, string>);

    return responseData;
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return {};
  }
}

/**
 * Check if a user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const progress = await prisma.onboarding_progress.findUnique({
      where: { user_id: userId },
    });

    return progress?.is_complete || false;
  } catch (error) {
    console.error('Error checking onboarding completion:', error);
    return false;
  }
}

/**
 * Get specific onboarding answer for a user
 */
export async function getOnboardingAnswer(userId: string, questionId: string): Promise<string | null> {
  try {
    const response = await prisma.user_onboarding_responses.findFirst({
      where: { 
        user_id: userId,
        question: questionId
      },
    });

    return response?.answer || null;
  } catch (error) {
    console.error('Error fetching onboarding answer:', error);
    return null;
  }
}

/**
 * Get onboarding data for Penny's context
 * This provides a structured way for Penny to understand the user
 */
export async function getOnboardingContextForPenny(userId: string): Promise<{
  financialSnapshot: {
    monthlyIncome?: string;
    monthlySpending?: string;
    debtSituation?: string;
    savingsInvestments?: string;
    budgetingHabits?: string;
  };
  lifeGoals: {
    lifeGoals?: string;
    retirementTimeline?: string;
    lifeEvents?: string;
    financialIndependence?: string;
    financialFreedomVision?: string;
  };
  personality: {
    moneyVolatilityFeelings?: string;
    adviceStylePreference?: string;
    investmentApproach?: string;
    coachingStyle?: string;
    financialSafety?: string;
  };
}> {
  const data = await getUserOnboardingData(userId);
  
  return {
    financialSnapshot: {
      monthlyIncome: data.monthly_income,
      monthlySpending: data.monthly_spending,
      debtSituation: data.debt_situation,
      savingsInvestments: data.savings_investments,
      budgetingHabits: data.budgeting_habits,
    },
    lifeGoals: {
      lifeGoals: data.life_goals,
      retirementTimeline: data.retirement_timeline,
      lifeEvents: data.life_events,
      financialIndependence: data.financial_independence,
      financialFreedomVision: data.financial_freedom_vision,
    },
    personality: {
      moneyVolatilityFeelings: data.money_volatility_feelings,
      adviceStylePreference: data.advice_style_preference,
      investmentApproach: data.investment_approach,
      coachingStyle: data.coaching_style,
      financialSafety: data.financial_safety,
    },
  };
} 
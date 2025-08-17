import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPhase, completedPhases, answers, completionPercentage, points, achievements } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Save onboarding progress
    const onboardingData = await prisma.user_onboarding_responses.upsert({
      where: { user_id: userId },
      update: {
        responses: answers,
        completed_sections: completedPhases,
        completion_percentage: completionPercentage,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        responses: answers,
        completed_sections: completedPhases,
        completion_percentage: completionPercentage
      }
    });

    // Update user preferences based on answers
    if (answers.primaryGoals) {
      await prisma.user_preferences.upsert({
        where: { user_id: userId },
        update: {
          financial_goals: answers.primaryGoals,
          risk_tolerance: answers.riskTolerance || 5,
          notification_frequency: answers.notificationFrequency || 'weekly',
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          financial_goals: answers.primaryGoals,
          risk_tolerance: answers.riskTolerance || 5,
          notification_frequency: answers.notificationFrequency || 'weekly'
        }
      });
    }

    // Update user demographics if provided
    if (answers.lifeStage || answers.annualIncome) {
      await prisma.user_demographics.upsert({
        where: { user_id: userId },
        update: {
          life_stage: answers.lifeStage,
          annual_income: answers.annualIncome,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          life_stage: answers.lifeStage,
          annual_income: answers.annualIncome
        }
      });
    }

    // Create initial goals based on selections
    if (answers.primaryGoals && Array.isArray(answers.primaryGoals)) {
      for (const goalType of answers.primaryGoals) {
        const existingGoal = await prisma.goals.findFirst({
          where: {
            user_id: userId,
            name: goalType
          }
        });

        if (!existingGoal) {
          await prisma.goals.create({
            data: {
              user_id: userId,
              name: goalType,
              description: `Auto-generated ${goalType} goal`,
              target_amount: getDefaultTargetAmount(goalType, answers.annualIncome),
              current_amount: 0,
              target_date: getDefaultTargetDate(goalType),
              is_active: true
            }
          });
        }
      }
    }

    // Store money personality in AI context
    if (answers.moneyPersonality || answers.primaryMotivation) {
      await prisma.ai_conversation_context.upsert({
        where: { 
          user_id_unique: {
            user_id: userId,
            id: 1 // Using a fixed ID for the main context
          }
        },
        update: {
          context: {
            moneyPersonality: answers.moneyPersonality,
            primaryMotivation: answers.primaryMotivation,
            lifeStage: answers.lifeStage,
            upcomingLifeEvents: answers.upcomingLifeEvents,
            quickStartTemplate: answers.quickStartTemplate
          },
          created_at: new Date()
        },
        create: {
          user_id: userId,
          context: {
            moneyPersonality: answers.moneyPersonality,
            primaryMotivation: answers.primaryMotivation,
            lifeStage: answers.lifeStage,
            upcomingLifeEvents: answers.upcomingLifeEvents,
            quickStartTemplate: answers.quickStartTemplate
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      onboardingId: onboardingData.id 
    });

  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding progress' },
      { status: 500 }
    );
  }
}

function getDefaultTargetAmount(goalType: string, annualIncome?: number): number {
  const income = annualIncome || 50000;
  
  const targetAmounts: Record<string, number> = {
    emergency_fund: income * 0.5, // 6 months of income
    debt_payoff: income * 0.3,
    home_purchase: income * 0.4, // Down payment
    investments: income * 0.2,
    retirement: income * 20, // Very long term
    travel: 5000,
    education: 20000,
    business: 25000
  };

  return targetAmounts[goalType] || 10000;
}

function getDefaultTargetDate(goalType: string): Date {
  const now = new Date();
  const yearsToAdd: Record<string, number> = {
    emergency_fund: 1,
    debt_payoff: 2,
    home_purchase: 3,
    investments: 5,
    retirement: 30,
    travel: 1,
    education: 4,
    business: 2
  };

  const years = yearsToAdd[goalType] || 3;
  return new Date(now.setFullYear(now.getFullYear() + years));
}
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Simple summary generator for onboarding data
function generateOnboardingSummary(onboardingData: any) {
  return {
    completedAt: new Date().toISOString(),
    stepsCompleted: onboardingData?.completedSteps?.length || 0,
    responses: onboardingData?.responses || {},
    hasPlaidConnection: !!onboardingData?.plaidConnection,
    userId: onboardingData?.userId
  };
}

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, onboardingData } = body;

    // Get userId from auth token if not provided
    let finalUserId = userId;
    const authHeader = request.headers.get('authorization');
    if (!finalUserId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        finalUserId = decoded.user_id || decoded.sub;
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Don't generate dashboard for temporary users
    if (finalUserId.startsWith('temp_')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Cannot generate dashboard for temporary user' 
      }, { status: 400 });
    }

    // Generate summary from unified onboarding state
    const summary = generateOnboardingSummary(onboardingData);
    const responses = onboardingData.responses || {};

    // Create default budget based on income and preferences
    if (responses.monthlyIncome || responses.monthlyExpenses) {
      const monthlyIncome = responses.monthlyIncome || 5000;
      const monthlyExpenses = responses.monthlyExpenses || monthlyIncome * 0.8;

      // Create main budget
      const budget = await prisma.budgets.create({
        data: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          name: 'Monthly Budget',
          description: 'Auto-generated budget based on your profile',
          amount: monthlyIncome,
          period: 'monthly',
          start_date: new Date(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create budget categories based on life stage
      const allocations = getDefaultAllocations(responses.lifeStage);
      
      for (const [category, percentage] of Object.entries(allocations)) {
        if (typeof percentage === 'number') {
          await prisma.budget_categories.create({
            data: {
              id: crypto.randomUUID(),
              budget_id: budget.id,
              category: category,
              amount: (monthlyIncome * percentage) / 100,
              is_fixed: category === 'housing' || category === 'utilities',
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
    }

    // Skip manual account creation if Plaid accounts are connected
    // Plaid accounts are already created during onboarding

    // Create initial financial insights
    const insights = await generateInitialInsights(finalUserId, responses, summary);
    
    for (const insight of insights) {
      await prisma.financial_insights.create({
        data: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          category: insight.category,
          insight: insight.text,
          confidence_score: 0.85,
          is_actionable: true,
          priority: insight.priority,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // Create initial dashboard state
    const netWorth = await calculateNetWorth(finalUserId, responses);
    const monthlyIncome = responses.monthlyIncome || 0;
    const monthlyExpenses = responses.monthlyExpenses || 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    await prisma.user_dashboard_state.upsert({
      where: { user_id: finalUserId },
      update: {
        total_assets: netWorth.assets,
        total_liabilities: netWorth.liabilities,
        net_worth: netWorth.total,
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        savings_rate: savingsRate,
        top_spending_categories: [],
        recent_insights: insights.map(i => i.text),
        goals_progress: {},
        last_refreshed: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        user_id: finalUserId,
        total_assets: netWorth.assets,
        total_liabilities: netWorth.liabilities,
        net_worth: netWorth.total,
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        savings_rate: savingsRate,
        top_spending_categories: [],
        recent_insights: insights.map(i => i.text),
        goals_progress: {},
        last_refreshed: new Date()
      }
    });

    // Mark user as onboarded and update onboarding progress
    await prisma.$transaction([
      prisma.users.update({
        where: { id: finalUserId },
        data: {
          has_completed_onboarding: true,
          onboarding_completed_at: new Date(),
          updated_at: new Date()
        }
      }),
      prisma.onboarding_progress.update({
        where: { user_id: finalUserId },
        data: {
          is_complete: true,
          current_step: 'complete',
          updated_at: new Date()
        }
      })
    ]);

    return NextResponse.json({ 
      success: true,
      dashboardGenerated: true,
      message: 'Dashboard created successfully',
      summary: {
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        netWorth: netWorth.total,
        budgetCreated: true,
        insightsCount: insights.length
      }
    });

  } catch (error: any) {
    console.error('Error generating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function getDefaultAllocations(lifeStage?: string): Record<string, number> {
  const allocations: Record<string, Record<string, number>> = {
    student: {
      housing: 35,
      food: 20,
      transport: 10,
      utilities: 5,
      entertainment: 10,
      savings: 10,
      other: 10
    },
    early_career: {
      housing: 30,
      food: 15,
      transport: 15,
      utilities: 5,
      entertainment: 8,
      savings: 15,
      other: 12
    },
    family: {
      housing: 28,
      food: 18,
      transport: 12,
      utilities: 6,
      childcare: 15,
      savings: 12,
      other: 9
    },
    established: {
      housing: 25,
      food: 12,
      transport: 10,
      utilities: 5,
      entertainment: 8,
      savings: 25,
      investments: 10,
      other: 5
    },
    pre_retirement: {
      housing: 20,
      food: 10,
      transport: 8,
      utilities: 4,
      healthcare: 10,
      savings: 30,
      investments: 15,
      other: 3
    }
  };

  return allocations[lifeStage || ''] || allocations.early_career;
}

function getAccountType(accountType: string): string {
  const typeMap: Record<string, string> = {
    checking: 'depository',
    savings: 'depository',
    'credit-cards': 'credit',
    investments: 'investment',
    retirement: 'investment'
  };
  
  return typeMap[accountType] || 'other';
}

async function calculateNetWorth(userId: string, responses: any): Promise<{ assets: number; liabilities: number; total: number }> {
  // Get accounts from database
  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId, is_active: true }
  });
  
  const assets = accounts
    .filter(acc => acc.type === 'depository' || acc.type === 'investment')
    .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  
  const liabilities = accounts
    .filter(acc => acc.type === 'credit' || acc.type === 'loan')
    .reduce((sum, acc) => sum + Math.abs(Number(acc.balance || 0)), 0);
  
  return {
    assets,
    liabilities,
    total: assets - liabilities
  };
}

async function generateInitialInsights(userId: string, responses: any, summary: any): Promise<Array<{ category: string; text: string; priority: string }>> {
  const insights = [];

  // Emergency fund insight
  if (responses.mainGoal === 'emergency_fund') {
    insights.push({
      category: 'savings',
      text: `Start building your emergency fund with $${Math.round((responses.monthlyIncome || 4000) * 0.1)} per month`,
      priority: 'high'
    });
  }

  // Debt reduction insight
  if (responses.mainGoal === 'reduce_debt') {
    insights.push({
      category: 'debt',
      text: 'Focus on paying off high-interest debt first using the avalanche method',
      priority: 'high'
    });
  }

  // Savings rate insight
  const monthlyIncome = responses.monthlyIncome || 5000;
  const monthlyExpenses = responses.monthlyExpenses || monthlyIncome * 0.8;
  const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
  
  if (savingsRate < 10) {
    insights.push({
      category: 'budget',
      text: `Your savings rate is ${savingsRate.toFixed(1)}%. Try to increase it to at least 10%`,
      priority: 'medium'
    });
  } else {
    insights.push({
      category: 'budget',
      text: `Great job! Your ${savingsRate.toFixed(1)}% savings rate is above average`,
      priority: 'low'
    });
  }

  // Investment insight
  if (responses.mainGoal === 'build_wealth' && !responses.hasConnectedAccounts) {
    insights.push({
      category: 'investment',
      text: 'Consider opening an investment account to start building long-term wealth',
      priority: 'medium'
    });
  }

  // Life stage specific insights
  if (responses.lifeStage === 'family' && responses.dependents > 0) {
    insights.push({
      category: 'goals',
      text: `With ${responses.dependents} dependent(s), consider starting a 529 education savings plan`,
      priority: 'medium'
    });
  }
  
  if (responses.lifeStage === 'pre_retirement') {
    insights.push({
      category: 'retirement',
      text: 'Maximize retirement contributions to take advantage of catch-up contributions',
      priority: 'high'
    });
  }
  
  // Home savings insight
  if (responses.mainGoal === 'save_home') {
    const targetDownPayment = monthlyIncome * 12 * 0.2; // 20% of annual income as rough estimate
    const monthlyTarget = targetDownPayment / 36; // 3 year goal
    insights.push({
      category: 'goals',
      text: `Save $${Math.round(monthlyTarget)} per month for your home down payment goal`,
      priority: 'high'
    });
  }

  return insights;
}
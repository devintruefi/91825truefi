import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, answers } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create default budget based on income and preferences
    if (answers.annualIncome || answers.monthlyExpenses) {
      const monthlyIncome = (answers.annualIncome || 60000) / 12;
      const monthlyExpenses = answers.monthlyExpenses || monthlyIncome * 0.8;

      // Create main budget
      const budget = await prisma.budgets.create({
        data: {
          user_id: userId,
          name: 'Monthly Budget',
          description: 'Auto-generated budget based on your profile',
          amount: monthlyIncome,
          period: 'monthly',
          start_date: new Date(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          is_active: true
        }
      });

      // Create budget categories based on allocation or defaults
      const allocations = answers.budgetAllocation || getDefaultAllocations(answers.lifeStage);
      
      for (const [category, percentage] of Object.entries(allocations)) {
        if (typeof percentage === 'number') {
          await prisma.budget_categories.create({
            data: {
              budget_id: budget.id,
              category: category,
              amount: (monthlyIncome * percentage) / 100,
              is_fixed: category === 'housing' || category === 'utilities'
            }
          });
        }
      }
    }

    // Create manual accounts if provided
    if (answers.manualBalances) {
      for (const [accountType, balance] of Object.entries(answers.manualBalances)) {
        if (typeof balance === 'number' && balance !== 0) {
          await prisma.accounts.create({
            data: {
              user_id: userId,
              name: `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account`,
              type: getAccountType(accountType),
              subtype: accountType,
              balance: balance,
              currency: 'USD',
              is_active: true,
              institution_name: 'Manual Entry'
            }
          });
        }
      }
    }

    // Create initial financial insights
    const insights = await generateInitialInsights(userId, answers);
    
    for (const insight of insights) {
      await prisma.financial_insights.create({
        data: {
          user_id: userId,
          category: insight.category,
          insight: insight.text,
          confidence_score: 0.85,
          is_actionable: true,
          priority: insight.priority
        }
      });
    }

    // Create initial dashboard state
    const netWorth = calculateNetWorth(answers);
    const monthlyIncome = (answers.annualIncome || 0) / 12;
    const monthlyExpenses = answers.monthlyExpenses || 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    await prisma.user_dashboard_state.upsert({
      where: { user_id: userId },
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
        user_id: userId,
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

    // Mark user as onboarded
    await prisma.users.update({
      where: { id: userId },
      data: {
        has_completed_onboarding: true,
        onboarding_completed_at: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      dashboardGenerated: true
    });

  } catch (error) {
    console.error('Error generating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard' },
      { status: 500 }
    );
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
    'early-career': {
      housing: 30,
      food: 15,
      transport: 15,
      utilities: 5,
      entertainment: 8,
      savings: 15,
      other: 12
    },
    'growing-family': {
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
    'pre-retirement': {
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

  return allocations[lifeStage || ''] || allocations['early-career'];
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

function calculateNetWorth(answers: any): { assets: number; liabilities: number; total: number } {
  const assets = (answers.manualBalances?.checking || 0) +
                 (answers.manualBalances?.savings || 0) +
                 (answers.manualBalances?.investments || 0);
  
  const liabilities = Math.abs(answers.manualBalances?.['credit-cards'] || 0) +
                      (answers.existingDebt?.reduce((sum: number, debt: any) => 
                        sum + (debt.amount || 0), 0) || 0);
  
  return {
    assets,
    liabilities,
    total: assets - liabilities
  };
}

async function generateInitialInsights(userId: string, answers: any): Promise<Array<{ category: string; text: string; priority: string }>> {
  const insights = [];

  // Emergency fund insight
  if (answers.primaryGoals?.includes('emergency_fund')) {
    insights.push({
      category: 'savings',
      text: `Start building your emergency fund with $${Math.round((answers.annualIncome || 50000) / 12 * 0.1)} per month`,
      priority: 'high'
    });
  }

  // Debt payoff insight
  if (answers.existingDebt?.length > 0) {
    insights.push({
      category: 'debt',
      text: 'Focus on paying off high-interest debt first using the avalanche method',
      priority: 'high'
    });
  }

  // Savings rate insight
  const monthlyIncome = (answers.annualIncome || 60000) / 12;
  const monthlyExpenses = answers.monthlyExpenses || monthlyIncome * 0.8;
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
  if (answers.primaryGoals?.includes('investments') && !answers.manualBalances?.investments) {
    insights.push({
      category: 'investment',
      text: 'Consider opening an investment account to start building long-term wealth',
      priority: 'medium'
    });
  }

  // Life event preparation
  if (answers.upcomingLifeEvents?.length > 0) {
    const event = answers.upcomingLifeEvents[0];
    insights.push({
      category: 'goals',
      text: `Start preparing for ${event} - you'll need to save approximately $X per month`,
      priority: 'high'
    });
  }

  return insights;
}
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OnboardingChatSessionManager } from '@/lib/onboarding/chat-session-manager';
import { generateOnboardingSummary } from '@/lib/onboarding/unified-onboarding-flow';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Complete onboarding with all database updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, progress } = body;
    
    // Get userId from auth if not provided
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
    
    const responses = progress.responses || {};
    
    // Begin transaction for idempotent updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user demographics (idempotent upsert)
      await tx.user_demographics.upsert({
        where: { user_id: finalUserId },
        update: {
          dependents: responses.dependents || 0,
          household_income: (responses.monthlyIncome || 0) * 12,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          dependents: responses.dependents || 0,
          household_income: (responses.monthlyIncome || 0) * 12,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 2. Update user preferences (idempotent upsert)
      await tx.user_preferences.upsert({
        where: { user_id: finalUserId },
        update: {
          risk_tolerance: String(responses.riskTolerance || 5),
          financial_goals: JSON.stringify([
            responses.mainGoal,
            responses.secondaryGoal
          ].filter(Boolean)),
          currency: 'USD',
          timezone: 'America/New_York',
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          risk_tolerance: String(responses.riskTolerance || 5),
          financial_goals: JSON.stringify([
            responses.mainGoal,
            responses.secondaryGoal
          ].filter(Boolean)),
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'system',
          notifications_enabled: true,
          email_notifications: true,
          push_notifications: true,
          investment_horizon: 'medium',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 3. Create recurring income (idempotent upsert)
      if (responses.monthlyIncome) {
        await tx.recurring_income.upsert({
          where: {
            user_id_source: {
              user_id: finalUserId,
              source: 'Primary Income'
            }
          },
          update: {
            gross_monthly: responses.monthlyIncome,
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: finalUserId,
            source: responses.incomeSource === 'plaid' ? 'Plaid Detected' : 'Primary Income',
            gross_monthly: responses.monthlyIncome,
            frequency: 'monthly',
            next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            inflation_adj: false,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      // 4. Create goals (idempotent - delete and recreate during onboarding)
      await tx.goals.deleteMany({
        where: { 
          user_id: finalUserId,
          is_onboarding_goal: true 
        }
      });
      
      const goalPriorities = ['high', 'medium', 'low'] as const;
      const goals = [responses.mainGoal, responses.secondaryGoal].filter(Boolean);
      
      for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        if (goal) {
          await tx.goals.create({
            data: {
              id: crypto.randomUUID(),
              user_id: finalUserId,
              name: getGoalName(goal),
              description: getGoalDescription(goal),
              target_amount: getGoalTargetAmount(goal, responses.monthlyIncome || 0),
              current_amount: 0,
              target_date: getGoalTargetDate(goal),
              priority: goalPriorities[i],
              is_active: true,
              is_onboarding_goal: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
      
      // 5. Create budget with top 8 categories (idempotent)
      const existingBudget = await tx.budgets.findFirst({
        where: {
          user_id: finalUserId,
          period: 'monthly',
          is_active: true
        }
      });
      
      let budgetId = existingBudget?.id;
      
      if (!existingBudget) {
        const budget = await tx.budgets.create({
          data: {
            id: crypto.randomUUID(),
            user_id: finalUserId,
            name: 'Monthly Budget',
            description: 'Smart budget based on your profile',
            amount: responses.monthlyIncome || 5000,
            period: 'monthly',
            start_date: new Date(),
            end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        budgetId = budget.id;
      }
      
      // 6. Create budget categories (top 8)
      if (budgetId) {
        const categories = responses.budgetCategories || getDefaultBudgetCategories(responses);
        
        // Delete existing categories for clean slate
        await tx.budget_categories.deleteMany({
          where: { budget_id: budgetId }
        });
        
        // Create top 8 categories
        const topCategories = Object.entries(categories)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 8);
        
        for (const [category, amount] of topCategories) {
          await tx.budget_categories.create({
            data: {
              id: crypto.randomUUID(),
              budget_id: budgetId,
              category: category,
              amount: amount as number,
              is_fixed: ['housing', 'rent', 'mortgage', 'utilities', 'insurance'].includes(category),
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
      
      // 7. Create initial cashflow analysis
      const totalExpenses = Object.values(responses.budgetCategories || {})
        .reduce((sum, val) => sum + (val as number), 0);
      
      await tx.cashflow_analysis.upsert({
        where: {
          user_id_period_start: {
            user_id: finalUserId,
            period_start: new Date(new Date().setDate(1)) // First of month
          }
        },
        update: {
          net_cashflow: (responses.monthlyIncome || 0) - totalExpenses,
          breakdown: {
            income: responses.monthlyIncome || 0,
            expenses: totalExpenses,
            categories: responses.budgetCategories || {}
          },
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          period_start: new Date(new Date().setDate(1)),
          period_end: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)),
          net_cashflow: (responses.monthlyIncome || 0) - totalExpenses,
          breakdown: {
            income: responses.monthlyIncome || 0,
            expenses: totalExpenses,
            categories: responses.budgetCategories || {}
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 8. Create financial insights
      const insights = generateInsights(responses);
      
      for (const insight of insights) {
        await tx.financial_insights.create({
          data: {
            id: crypto.randomUUID(),
            user_id: finalUserId,
            category: insight.category,
            insight: insight.text,
            confidence_score: 0.85,
            is_actionable: true,
            priority: insight.priority,
            severity: insight.severity,
            data: insight.data || {},
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      // 9. Mark onboarding complete
      await tx.onboarding_progress.upsert({
        where: { user_id: finalUserId },
        update: {
          is_complete: true,
          current_step: 'complete',
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: finalUserId,
          is_complete: true,
          current_step: 'complete',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 10. Update user
      await tx.users.update({
        where: { id: finalUserId },
        data: {
          has_completed_onboarding: true,
          onboarding_completed_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Complete chat session if exists
      const sessionManager = new OnboardingChatSessionManager(finalUserId);
      await sessionManager.completeSession();
      
      return {
        success: true,
        insights: insights.length
      };
    });
    
    // Queue background enrichers (non-blocking)
    queueBackgroundEnrichers(finalUserId);
    
    // Return redirect with welcome parameter
    return NextResponse.json({
      redirect: '/dashboard?welcome=1',
      onboardingUpdate: { complete: true },
      message: 'Onboarding completed successfully',
      stats: result
    });
    
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
function getGoalName(goal: string): string {
  const names: Record<string, string> = {
    build_wealth: 'Build Wealth',
    reduce_debt: 'Eliminate Debt',
    save_home: 'Save for Home',
    retirement: 'Retirement Planning',
    emergency_fund: 'Emergency Fund'
  };
  return names[goal] || 'Financial Goal';
}

function getGoalDescription(goal: string): string {
  const descriptions: Record<string, string> = {
    build_wealth: 'Grow investments and build long-term wealth',
    reduce_debt: 'Pay off debt and achieve financial freedom',
    save_home: 'Save for home down payment',
    retirement: 'Build retirement savings',
    emergency_fund: 'Build 3-6 months of expenses'
  };
  return descriptions[goal] || '';
}

function getGoalTargetAmount(goal: string, monthlyIncome: number): number {
  const targets: Record<string, number> = {
    emergency_fund: monthlyIncome * 6,
    save_home: monthlyIncome * 12 * 0.2, // 20% down on annual income
    retirement: monthlyIncome * 12 * 10, // 10x annual income
    reduce_debt: 0, // Will be calculated from actual debt
    build_wealth: monthlyIncome * 12 * 5 // 5x annual as starter goal
  };
  return targets[goal] || monthlyIncome * 12;
}

function getGoalTargetDate(goal: string): Date {
  const monthsOut: Record<string, number> = {
    emergency_fund: 12,
    save_home: 36,
    retirement: 240, // 20 years
    reduce_debt: 24,
    build_wealth: 60 // 5 years
  };
  const months = monthsOut[goal] || 12;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

function getDefaultBudgetCategories(responses: any): Record<string, number> {
  const income = responses.monthlyIncome || 5000;
  
  // Smart defaults based on income level
  if (income < 3000) {
    return {
      housing: income * 0.35,
      food: income * 0.20,
      transportation: income * 0.15,
      utilities: income * 0.08,
      healthcare: income * 0.05,
      personal: income * 0.05,
      savings: income * 0.07,
      other: income * 0.05
    };
  } else if (income < 6000) {
    return {
      housing: income * 0.30,
      food: income * 0.15,
      transportation: income * 0.15,
      utilities: income * 0.06,
      healthcare: income * 0.05,
      entertainment: income * 0.05,
      personal: income * 0.07,
      savings: income * 0.12,
      other: income * 0.05
    };
  } else {
    return {
      housing: income * 0.25,
      food: income * 0.12,
      transportation: income * 0.12,
      utilities: income * 0.05,
      healthcare: income * 0.05,
      entertainment: income * 0.08,
      personal: income * 0.08,
      savings: income * 0.20,
      investments: income * 0.05
    };
  }
}

function generateInsights(responses: any): any[] {
  const insights = [];
  const income = responses.monthlyIncome || 0;
  const risk = responses.riskTolerance || 5;
  
  // Savings rate insight
  const totalExpenses = Object.values(responses.budgetCategories || {})
    .reduce((sum, val) => sum + (val as number), 0);
  const savingsRate = income > 0 ? ((income - totalExpenses) / income) * 100 : 0;
  
  if (savingsRate < 10) {
    insights.push({
      category: 'savings',
      text: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 10-15%`,
      priority: 'high',
      severity: 'warning',
      data: { savingsRate }
    });
  } else {
    insights.push({
      category: 'savings',
      text: `Great! Your ${savingsRate.toFixed(1)}% savings rate is healthy`,
      priority: 'low',
      severity: 'info',
      data: { savingsRate }
    });
  }
  
  // Risk-based investment insight
  if (risk >= 7 && !responses.hasConnectedAccounts) {
    insights.push({
      category: 'investment',
      text: 'Your risk tolerance suggests you could benefit from investment accounts',
      priority: 'medium',
      severity: 'info',
      data: { riskTolerance: risk }
    });
  }
  
  // Goal-specific insights
  if (responses.mainGoal === 'emergency_fund') {
    insights.push({
      category: 'goals',
      text: `Build your emergency fund with $${Math.round(income * 0.15)} monthly`,
      priority: 'high',
      severity: 'info',
      data: { targetMonthly: income * 0.15 }
    });
  }
  
  // Dependents insight
  if (responses.dependents && responses.dependents >= 2) {
    insights.push({
      category: 'planning',
      text: `With ${responses.dependents} dependents, consider 529 education savings`,
      priority: 'medium',
      severity: 'info',
      data: { dependents: responses.dependents }
    });
  }
  
  // Plaid connection reminder
  if (!responses.hasConnectedAccounts) {
    insights.push({
      category: 'accounts',
      text: 'Connect your accounts for real-time insights and automatic tracking',
      priority: 'medium',
      severity: 'info',
      data: { action: 'connect_plaid' }
    });
  }
  
  return insights;
}

function queueBackgroundEnrichers(userId: string): void {
  // In production, this would queue jobs to:
  // 1. Pull more transaction history
  // 2. Detect subscriptions and recurring bills
  // 3. Analyze spending patterns
  // 4. Calculate debt payoff scenarios
  // 5. Generate investment recommendations
  
  console.log(`Queued background enrichers for user ${userId}`);
  
  // For now, just log
  setTimeout(async () => {
    console.log(`Running background enrichers for ${userId}...`);
    // Could call additional APIs here
  }, 5000);
}
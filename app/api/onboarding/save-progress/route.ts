import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId = '';
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.user_id || decoded.sub;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { progress, phase } = await request.json();

    // 1. Update onboarding_progress table
    await prisma.onboarding_progress.upsert({
      where: { user_id: userId },
      update: {
        current_step: phase,
        is_complete: phase === 'complete',
        updated_at: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        current_step: phase,
        is_complete: phase === 'complete',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // 2. Update user_demographics with life stage, dependents
    if (progress.lifeStage || progress.dependents !== undefined) {
      const demographics: any = {};
      
      if (progress.lifeStage) {
        demographics.life_stage = progress.lifeStage;
        // Set marital status based on life stage
        if (progress.lifeStage === 'married' || progress.lifeStage === 'parent') {
          demographics.marital_status = 'married';
        } else if (progress.lifeStage === 'student' || progress.lifeStage === 'working') {
          demographics.marital_status = 'single';
        }
      }
      
      if (progress.dependents !== undefined) {
        demographics.dependents = progress.dependents === '3+' ? 3 : parseInt(progress.dependents);
      }
      
      await prisma.user_demographics.upsert({
        where: { user_id: userId },
        update: {
          ...demographics,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          ...demographics,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // 3. Update user_preferences with risk tolerance and investment horizon
    if (progress.riskTolerance) {
      await prisma.user_preferences.upsert({
        where: { user_id: userId },
        update: {
          risk_tolerance: progress.riskTolerance,
          investment_horizon: progress.riskTolerance > 7 ? 'long' : progress.riskTolerance > 4 ? 'medium' : 'short',
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          risk_tolerance: progress.riskTolerance,
          investment_horizon: progress.riskTolerance > 7 ? 'long' : progress.riskTolerance > 4 ? 'medium' : 'short',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // 4. Create goals from selected goals
    if (progress.selectedGoals && Array.isArray(progress.selectedGoals)) {
      for (const goalId of progress.selectedGoals) {
        const goalAmount = progress.goalAmounts?.[goalId] || 10000;
        
        const goalNames: Record<string, string> = {
          'emergency': 'Emergency Fund',
          'debt': 'Pay Off Debt',
          'home': 'Save for Home',
          'retirement': 'Retirement Planning',
          'invest': 'Grow Investments',
          'college': 'College Savings'
        };
        
        const existingGoal = await prisma.goals.findFirst({
          where: {
            user_id: userId,
            name: goalNames[goalId] || goalId
          }
        });
        
        if (!existingGoal) {
          await prisma.goals.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              name: goalNames[goalId] || goalId,
              description: `Goal for ${goalNames[goalId] || goalId}`,
              target_amount: goalAmount,
              current_amount: 0,
              target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
    }

    // 5. Create/update budget if allocations provided
    if (progress.budgetAllocations) {
      // First create the budget
      const budget = await prisma.budgets.upsert({
        where: {
          user_id_name: {
            user_id: userId,
            name: 'Primary Budget'
          }
        },
        update: {
          is_active: true,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          name: 'Primary Budget',
          period: 'monthly',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Then create budget categories
      const monthlyIncome = progress.monthlyIncome ? 
        (progress.monthlyIncome === '10000+' ? 12000 : 
         progress.monthlyIncome.includes('-') ? 
           parseInt(progress.monthlyIncome.split('-')[1]) : 
           3000) : 3000;
      
      for (const [category, percentage] of Object.entries(progress.budgetAllocations)) {
        const amount = (monthlyIncome * (percentage as number)) / 100;
        
        await prisma.budget_categories.upsert({
          where: {
            budget_id_category: {
              budget_id: budget.id,
              category: category
            }
          },
          update: {
            amount: amount,
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            budget_id: budget.id,
            category: category,
            amount: amount,
            is_fixed: category === 'housing' || category === 'utilities',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
    }

    // 6. Save income if detected or entered
    if (progress.monthlyIncome) {
      const incomeAmount = progress.monthlyIncome === '10000+' ? 12000 : 
        progress.monthlyIncome.includes('-') ? 
          parseInt(progress.monthlyIncome.split('-')[1]) : 
          3000;
      
      await prisma.recurring_income.upsert({
        where: {
          user_id_source: {
            user_id: userId,
            source: 'Salary'
          }
        },
        update: {
          gross_monthly: incomeAmount,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          source: 'Salary',
          gross_monthly: incomeAmount,
          frequency: 'monthly',
          next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // 7. Update dashboard state with initial widgets
    if (phase === 'complete' || progress.showDashboardPreview) {
      await prisma.user_dashboard_state.upsert({
        where: { user_id: userId },
        update: {
          widgets: {
            netWorth: true,
            cashflow: true,
            budget: true,
            goals: true,
            accounts: true,
            investments: progress.primaryGoal === 'understand-investments',
            debts: progress.primaryGoal === 'fix-budget'
          },
          last_modified: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          widgets: {
            netWorth: true,
            cashflow: true,
            budget: true,
            goals: true,
            accounts: true,
            investments: progress.primaryGoal === 'understand-investments',
            debts: progress.primaryGoal === 'fix-budget'
          },
          last_modified: new Date()
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      phase: phase,
      dashboardReady: phase === 'complete' || progress.showDashboardPreview
    });

  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}
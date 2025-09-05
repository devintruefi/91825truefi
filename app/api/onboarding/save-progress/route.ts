import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ONBOARDING_STEPS, OnboardingStep } from '@/lib/onboarding/steps';
import { prisma } from '@/lib/prisma';

// Map legacy phase names to new canonical step IDs
const PHASE_TO_STEP_MAP: Record<string, OnboardingStep> = {
  'welcome': 'welcome',
  'consent': 'consent',
  'main-goal': 'main_goal',
  'life-stage': 'life_stage',
  'dependents': 'dependents',
  'jurisdiction': 'jurisdiction',
  'household': 'household',
  'plaid-connection': 'plaid_connection',
  'income-capture': 'income_capture',
  'income-confirmation': 'income_confirmation',
  'manual-income': 'manual_income',
  'pay-structure': 'pay_structure',
  'benefits-equity': 'benefits_equity',
  'expenses-capture': 'expenses_capture',
  'detected-expenses': 'detected_expenses',
  'manual-expenses': 'manual_expenses',
  'quick-accounts': 'quick_accounts',
  'debts-detail': 'debts_detail',
  'housing': 'housing',
  'insurance': 'insurance',
  'emergency-fund': 'emergency_fund',
  'risk-tolerance': 'risk_tolerance',
  'risk-capacity': 'risk_capacity',
  'preferences-values': 'preferences_values',
  'goals-selection': 'goals_selection',
  'goal-parameters': 'goal_parameters',
  'budget-review': 'budget_review',
  'savings-auto-rules': 'savings_auto_rules',
  'plan-tradeoffs': 'plan_tradeoffs',
  'dashboard-preview': 'dashboard_preview',
  'first-actions': 'first_actions',
  'monitoring-preferences': 'monitoring_preferences',
  'celebrate-complete': 'celebrate_complete',
  'complete': 'complete',
  // Legacy mappings
  'preview': 'dashboard_preview',
  'done': 'complete'
};

export async function POST(request: NextRequest) {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      // Check authentication
      const authHeader = request.headers.get('authorization');
      let userId = '';
      
      // Allow saving without auth for initial steps
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          userId = decoded.user_id || decoded.sub;
        } catch (error) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
      }
      
      const body = await request.json();
      const { progress, phase, currentStep, responses, sessionId } = body;
      
      // If no userId from token, try to get from body
      if (!userId && body.userId) {
        userId = body.userId;
      }
      
      if (!userId) {
        // Store in temporary session storage (for unauthenticated users)
        return NextResponse.json({ 
          success: true,
          temporary: true,
          sessionId: sessionId || crypto.randomUUID(),
          message: 'Progress saved temporarily. Login to persist.'
        });
      }

    // Map phase to canonical step ID
    const stepId = PHASE_TO_STEP_MAP[phase] || phase;
    const isValidStep = Object.values(ONBOARDING_STEPS).includes(stepId as OnboardingStep);
    
    if (!isValidStep && phase !== 'complete') {
      console.warn(`Invalid step ID: ${phase}, using as-is`);
    }

    // 1. Update onboarding_progress table
    await prisma.onboarding_progress.upsert({
      where: { user_id: userId },
      update: {
        current_step: stepId,
        is_complete: stepId === 'complete' || phase === 'complete',
        updated_at: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        current_step: stepId,
        is_complete: stepId === 'complete' || phase === 'complete',
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
        phase: stepId || phase || currentStep,
        dashboardReady: stepId === 'complete' || phase === 'complete' || progress?.showDashboardPreview,
        retryCount
      });

    } catch (error: any) {
      console.error(`Error saving onboarding progress (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a database connection error
      if (error.code === 'P2002' || error.code === 'P2025') {
        // Unique constraint or record not found - these are expected, don't retry
        return NextResponse.json(
          { error: 'Data conflict. Please refresh and try again.' },
          { status: 409 }
        );
      }
      
      retryCount++;
      
      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        continue;
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to save progress after multiple attempts',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  }
  
  // Should never reach here
  return NextResponse.json(
    { error: 'Unexpected error in save progress' },
    { status: 500 }
  );
}
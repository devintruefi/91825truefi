import { ONBOARDING_STEPS, OnboardingStep, STEP_CONFIG, ComponentType } from './steps';
import { PrismaClient } from '@prisma/client';
import { calculateOnboardingProgress } from './progress-utils';
import { detectMonthlyIncome } from '../income-detection';
import { detectFinancialProfile } from '../plaid-detection';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface OnboardingState {
  userId: string;
  currentStep: OnboardingStep;
  responses: Record<string, any>;
  progress: Record<string, any>;
  hasPlaidData?: boolean;
  incomeConfirmed?: boolean;
  selectedGoals?: string[];
  is_complete?: boolean;
}

export interface OnboardingContext {
  userId: string;
  sessionId: string;
  prisma: PrismaClient;
}

export class OnboardingManager {
  /**
   * Get detected financial profile from database
   */
  static async getDetectedProfile(userId: string): Promise<any> {
    try {
      const prefs = await prisma.user_preferences.findUnique({
        where: { user_id: userId }
      });
      return (prefs?.financial_goals as any) || null;
    } catch (error) {
      console.error('Error fetching detected profile:', error);
      return null;
    }
  }

  /**
   * Get color for budget category
   */
  static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      housing: '#3B82F6',
      food: '#10B981',
      transport: '#F59E0B',
      utilities: '#8B5CF6',
      insurance: '#EF4444',
      healthcare: '#EC4899',
      entertainment: '#06B6D4',
      shopping: '#F97316',
      personal: '#84CC16',
      savings: '#22C55E',
      emergency: '#6366F1',
      investments: '#14B8A6',
      other: '#6B7280'
    };
    return colors[category.toLowerCase()] || '#6B7280';
  }

  /**
   * Get current step configuration
   */
  static getCurrent(state: OnboardingState): typeof STEP_CONFIG[OnboardingStep] | null {
    if (!state.currentStep || !(state.currentStep in STEP_CONFIG)) {
      return null;
    }
    return STEP_CONFIG[state.currentStep];
  }

  /**
   * Build component payload for current step
   */
  static async buildComponent(state: OnboardingState) {
    const stepConfig = this.getCurrent(state);
    if (!stepConfig) return null;

    // Customize component data based on state
    let componentData = { ...stepConfig.component.data };

    // Dynamic adjustments based on state
    if (state.currentStep === 'income_confirmation') {
      // Try to detect income if not already done
      let detectedIncome = state.progress.detectedIncome;
      if (!detectedIncome && state.hasPlaidData) {
        detectedIncome = await detectMonthlyIncome(state.userId);
        if (detectedIncome) {
          state.progress.detectedIncome = detectedIncome;
        }
      }
      
      // Always provide options for income confirmation
      if (!componentData.options || componentData.options.length === 0) {
        componentData.options = [
          { id: 'yes', label: 'Yes, correct', value: 'confirmed', icon: '✅' },
          { id: 'no', label: 'No, let me adjust', value: 'adjust', icon: '✏️' },
          { id: 'manual', label: 'Enter manually', value: 'manual', icon: '📝' }
        ];
      }
      
      if (detectedIncome) {
        componentData.description = `$${detectedIncome.toLocaleString()} per month detected`;
      } else {
        componentData.description = 'Unable to auto-detect income. Please confirm manually.';
        // Provide manual entry as primary option when detection fails
        componentData.options = [
          { id: 'manual', label: 'Enter income manually', value: 'manual', icon: '📝' },
          { id: 'skip', label: 'Skip for now', value: 'skip', icon: '⏭️' }
        ];
      }
    }

    if (state.currentStep === 'detected_expenses' && state.progress.detectedExpenses) {
      componentData.categories = state.progress.detectedExpenses;
    }
    
    // Handle income_capture step - provide detection if available
    if (state.currentStep === 'income_capture') {
      // Always try to detect income if Plaid is connected
      let detectedIncome = state.progress.detectedIncome;
      
      if (state.hasPlaidData && !detectedIncome) {
        detectedIncome = await detectMonthlyIncome(state.userId);
        if (detectedIncome) {
          state.progress.detectedIncome = detectedIncome;
        }
      }
      
      // Always provide options, with detected income shown if available
      if (detectedIncome && detectedIncome > 0) {
        // Show detected income as first option
        componentData.options = [
          { id: 'use_detected', label: `Use detected income`, value: 'use_detected', icon: '✅', description: `$${detectedIncome.toLocaleString()}/month detected` },
          { id: 'manual', label: 'Enter income manually', value: 'manual', icon: '📝', description: 'Input your income details' },
          { id: 'variable', label: 'My income varies', value: 'variable', icon: '📊', description: 'Set up variable income tracking' },
          { id: 'retry', label: 'Retry detection', value: '__retry__', icon: '🔄', description: 'Try detecting again' }
        ];
        componentData.description = `I detected $${detectedIncome.toLocaleString()} monthly income from your accounts.`;
      } else {
        // No detection available, show manual options
        componentData.options = [
          { id: 'manual', label: 'Enter income manually', value: 'manual', icon: '📝', description: 'Input your income details' },
          { id: 'variable', label: 'My income varies', value: 'variable', icon: '📊', description: 'Set up variable income tracking' },
          { id: 'retry', label: 'Retry detection', value: '__retry__', icon: '🔄', description: 'Try detecting from accounts' },
          { id: 'skip', label: 'Skip for now', value: '__skip__', icon: '⏭️', description: 'Come back to this later' }
        ];
        componentData.description = state.hasPlaidData ? 
          "I couldn't auto-detect your income. Please choose how to proceed." :
          "Let's set up your income information.";
      }
    }
    
    // Pre-fill household step with detected net worth
    if (state.currentStep === 'household' && state.hasPlaidData) {
      const profile = await this.getDetectedProfile(state.userId);
      if (profile?.detectedNetWorth) {
        // Pre-fill the form fields with detected values
        if (componentData.fields) {
          componentData.fields = componentData.fields.map(field => {
            if (field.id === 'household_net_worth') {
              return { 
                ...field, 
                value: profile.detectedNetWorth, 
                placeholder: `Detected: $${profile.detectedNetWorth.toLocaleString()}` 
              };
            }
            return field;
          });
        }
      }
    }
    
    // Provide budget categories from detected spending or defaults
    if (state.currentStep === 'expenses_capture' || state.currentStep === 'detected_expenses') {
      const profile = await this.getDetectedProfile(state.userId);
      
      if (state.hasPlaidData && profile?.detectedExpenses) {
        // Use detected expenses from Plaid
        const categories = Object.entries(profile.detectedExpenses)
          .filter(([_, amount]) => (amount as number) > 0)
          .map(([id, amount]) => ({
            id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
            amount: amount as number
          }));
        
        if (categories.length > 0) {
          componentData.categories = categories;
          componentData.description = 'Based on your last 30 days of spending';
        }
      } else {
        // Default categories with percentage of income
        const defaultCategories = [
          { id: 'housing', label: 'Housing', percent: 28, amount: 0 },
          { id: 'food', label: 'Food & Dining', percent: 12, amount: 0 },
          { id: 'transport', label: 'Transportation', percent: 15, amount: 0 },
          { id: 'utilities', label: 'Utilities', percent: 5, amount: 0 },
          { id: 'insurance', label: 'Insurance', percent: 5, amount: 0 },
          { id: 'healthcare', label: 'Healthcare', percent: 3, amount: 0 },
          { id: 'entertainment', label: 'Entertainment', percent: 5, amount: 0 },
          { id: 'personal', label: 'Personal Care', percent: 3, amount: 0 },
          { id: 'savings', label: 'Savings', percent: 20, amount: 0 },
          { id: 'other', label: 'Other', percent: 4, amount: 0 }
        ];
        componentData.categories = defaultCategories;
      }
      componentData.editable = true;
    }
    
    // Provide budget review with detected or suggested budget
    if (state.currentStep === 'budget_review') {
      const profile = await this.getDetectedProfile(state.userId);
      
      if (state.hasPlaidData && profile?.suggestedBudget) {
        // Use AI-suggested budget based on income and spending
        const categories = Object.entries(profile.suggestedBudget)
          .filter(([_, amount]) => (amount as number) > 0)
          .map(([id, amount]) => ({
            id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
            amount: amount as number,
            color: this.getCategoryColor(id)
          }));
        
        if (categories.length > 0) {
          componentData.categories = categories;
          componentData.description = 'Optimized budget based on your income and spending patterns';
        }
      } else {
        // Default 50/30/20 budget
        const budgetCategories = [
          { id: 'needs', label: 'Needs (Housing, Food, Utilities)', percent: 50, color: '#3B82F6' },
          { id: 'wants', label: 'Wants (Entertainment, Dining)', percent: 30, color: '#10B981' },
          { id: 'savings', label: 'Savings & Debt Payment', percent: 20, color: '#F59E0B' }
        ];
        componentData.categories = budgetCategories;
      }
      componentData.editable = true;
    }

    if (state.currentStep === 'goal_parameters' && state.selectedGoals) {
      componentData.fields = state.selectedGoals.map(goalId => ({
        id: `${goalId}_amount`,
        label: `Target for ${goalId}`,
        type: 'number',
        placeholder: 'Enter target amount',
        required: true
      }));
    }

    return {
      type: stepConfig.component.type,
      stepId: state.currentStep,
      data: componentData
    };
  }

  /**
   * Handle answer and perform DB writes
   */
  static async handleAnswer(
    stepId: OnboardingStep,
    value: any,
    ctx: OnboardingContext
  ): Promise<void> {
    const { userId, prisma } = ctx;

    // Handle special control values - don't process them as real answers
    if (value === '__retry__' || value === '__skip__') {
      // Log the action but don't process as a real answer
      await prisma.user_onboarding_responses.create({
        data: {
          user_id: userId,
          question: stepId,
          answer: value,
          created_at: new Date()
        }
      });
      return; // Don't process further
    }

    // Always log to user_onboarding_responses
    await prisma.user_onboarding_responses.create({
      data: {
        user_id: userId,
        question: stepId,
        answer: typeof value === 'object' ? JSON.stringify(value) : String(value),
        created_at: new Date()
      }
    });

    // Perform step-specific DB writes
    switch (stepId) {
      case 'welcome':
        // Handle both name input and goal selection (from fresh session)
        if (value && typeof value === 'object' && value.name) {
          // Original name input flow
          await prisma.user_identity.upsert({
            where: { user_id: userId },
            update: { full_name: value.name, updated_at: new Date() },
            create: {
              user_id: userId,
              full_name: value.name,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        } else if (typeof value === 'string') {
          // Fresh session sends goal selection at welcome step
          // Store this as the main goal
          console.log('Welcome step received goal selection:', value);
          await prisma.user_preferences.upsert({
            where: { user_id: userId },
            update: {
              financial_goals: {
                ...(await prisma.user_preferences.findUnique({ 
                  where: { user_id: userId } 
                }))?.financial_goals as any || {},
                primary_goal: value
              },
              updated_at: new Date()
            },
            create: {
              id: crypto.randomUUID(),
              user_id: userId,
              theme: 'system',
              notifications_enabled: true,
              email_notifications: true,
              push_notifications: false,
              currency: 'USD',
              timezone: 'America/New_York',
              language: 'en',
              financial_goals: {
                primary_goal: value
              },
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
        break;

      case 'life_stage':
        const maritalStatus = ['married', 'parent'].includes(value) ? 'married' : 
                            ['student', 'working'].includes(value) ? 'single' : null;
        
        // Since user_demographics doesn't exist, store in user_preferences.financial_goals
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              life_stage: value,
              marital_status: maritalStatus
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: {
              life_stage: value,
              marital_status: maritalStatus
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'dependents':
        const numDependents = value === '3+' ? 3 : parseInt(value);
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              dependents: numDependents
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { dependents: numDependents },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'jurisdiction':
        await prisma.user_identity.upsert({
          where: { user_id: userId },
          update: {
            state: value.state,
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            state: value.state,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        // Store country in user_preferences financial_goals
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              country: value.country
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { country: value.country },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'household':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              partner_income: value.partner_income,
              shared_expenses: value.shared_expenses,
              household_net_worth: value.household_net_worth
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: {
              partner_income: value.partner_income,
              shared_expenses: value.shared_expenses,
              household_net_worth: value.household_net_worth
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'income_capture':
        // Handle income_capture button responses
        if (value === 'manual' || value === 'variable') {
          // User wants to enter manually - will go to manual_income step
          break;
        }
        // If a number was provided (from detected income), save it
        const detectedAmount = Number(value);
        if (!isNaN(detectedAmount) && detectedAmount > 0) {
          await prisma.user_preferences.upsert({
            where: { user_id: userId },
            update: {
              financial_goals: {
                ...(await prisma.user_preferences.findUnique({ 
                  where: { user_id: userId } 
                }))?.financial_goals as any || {},
                monthlyIncome: detectedAmount
              },
              updated_at: new Date()
            },
            create: {
              id: crypto.randomUUID(),
              user_id: userId,
              theme: 'system',
              notifications_enabled: true,
              email_notifications: true,
              push_notifications: false,
              currency: 'USD',
              timezone: 'America/New_York',
              language: 'en',
              financial_goals: { monthlyIncome: detectedAmount },
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
        break;
        
      case 'manual_income':
      case 'income_confirmation':
        const incomeAmount = value.actual_income || value.monthly_income || value;
        
        // Handle income_confirmation responses
        if (stepId === 'income_confirmation') {
          if (value === 'confirmed' || value === 'yes') {
            // Use the already detected income - no need to update
            break;
          }
          if (value === 'adjust' || value === 'no' || value === 'manual') {
            // Will go to manual_income step
            break;
          }
        }
        
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              monthlyIncome: incomeAmount
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { monthlyIncome: incomeAmount },
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // Also create recurring_income record
        const effectiveFrom = new Date();
        effectiveFrom.setHours(0, 0, 0, 0); // Normalize to start of day
        
        await prisma.recurring_income.upsert({
          where: {
            user_id_source_effective_from: {
              user_id: userId,
              source: value.income_source || 'Salary',
              effective_from: effectiveFrom
            }
          },
          update: {
            gross_monthly: incomeAmount,
            next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            source: value.income_source || 'Salary',
            gross_monthly: incomeAmount,
            frequency: 'monthly',
            next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            effective_from: effectiveFrom
          }
        });
        break;

      case 'pay_structure':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              payStructure: value
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { payStructure: value },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'benefits_equity':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              employerBenefits: value
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { employerBenefits: value },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'expenses_capture':
      case 'detected_expenses':
      case 'manual_expenses':
      case 'budget_review':
        // Create or update budget
        let budget = await prisma.budgets.findFirst({
          where: {
            user_id: userId,
            name: 'Primary Budget'
          }
        });
        
        if (!budget) {
          budget = await prisma.budgets.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              name: 'Primary Budget',
              description: 'Monthly budget',
              amount: 0,
              period: 'monthly',
              start_date: new Date(),
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        } else {
          await prisma.budgets.update({
            where: { id: budget.id },
            data: {
              is_active: true,
              updated_at: new Date()
            }
          });
        }

        // Update budget categories
        if (value.categories) {
          for (const category of value.categories) {
            await prisma.budget_categories.upsert({
              where: {
                budget_id_category: {
                  budget_id: budget.id,
                  category: category.id || category.name
                }
              },
              update: {
                amount: category.amount,
                updated_at: new Date()
              },
              create: {
                id: crypto.randomUUID(),
                budget_id: budget.id,
                category: category.id || category.name,
                amount: category.amount,
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
        }
        break;

      case 'plaid_connection':
        // Plaid connection is handled by the existing Plaid flow
        // No additional database writes needed here as Plaid creates accounts/connections automatically
        break;

      case 'quick_accounts':
        // Handle assets and liabilities creation
        // This would integrate with existing manual asset/liability creation
        break;

      case 'housing':
        if (value === 'Rent') {
          // Update budget with rent expense
          const budget = await prisma.budgets.findFirst({
            where: { user_id: userId, name: 'Primary Budget' }
          });
          
          if (budget) {
            await prisma.budget_categories.upsert({
              where: {
                budget_id_category: {
                  budget_id: budget.id,
                  category: 'housing'
                }
              },
              update: { updated_at: new Date() },
              create: {
                id: crypto.randomUUID(),
                budget_id: budget.id,
                category: 'housing',
                amount: 0, // Will be set later
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
        }
        break;

      case 'insurance':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              insurance: value
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { insurance: value },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'emergency_fund':
        const monthlyExpenses = 5000; // Calculate from budget
        const targetEmergencyFund = value * monthlyExpenses;
        
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              emergencyFundMonths: value,
              targetEmergencyFund
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: {
              emergencyFundMonths: value,
              targetEmergencyFund
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'risk_tolerance':
        const investmentHorizon = value > 7 ? 'long' : value > 4 ? 'medium' : 'short';
        const riskToleranceStr = String(value); // Convert to string for database
        
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            risk_tolerance: riskToleranceStr,
            investment_horizon: investmentHorizon,
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            risk_tolerance: riskToleranceStr,
            investment_horizon: investmentHorizon,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'risk_capacity':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              riskCapacity: value
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { riskCapacity: value },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'preferences_values':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              investing_values: value
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: { investing_values: value },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'goals_selection':
        const goalNames: Record<string, string> = {
          'emergency': 'Emergency Fund',
          'debt': 'Pay Off Debt',
          'home': 'Save for Home',
          'retirement': 'Retirement Planning',
          'invest': 'Grow Investments',
          'college': 'College Savings'
        };
        
        for (const goalId of value) {
          const existingGoal = await prisma.goals.findFirst({
            where: { user_id: userId, name: goalNames[goalId] || goalId }
          });
          
          if (!existingGoal) {
            await prisma.goals.create({
              data: {
                id: crypto.randomUUID(),
                user_id: userId,
                name: goalNames[goalId] || goalId,
                description: `Goal for ${goalNames[goalId] || goalId}`,
                target_amount: 10000, // Default, will be updated in goal_parameters
                current_amount: 0,
                target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                priority: 'medium',
                is_active: true,
                allocation_method: 'auto',
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
        }
        break;

      case 'goal_parameters':
        // Update goal amounts based on user input
        for (const [key, amount] of Object.entries(value)) {
          const goalId = key.replace('_amount', '');
          const goalNames: Record<string, string> = {
            'emergency': 'Emergency Fund',
            'debt': 'Pay Off Debt',
            'home': 'Save for Home',
            'retirement': 'Retirement Planning',
            'invest': 'Grow Investments',
            'college': 'College Savings'
          };
          
          await prisma.goals.updateMany({
            where: { 
              user_id: userId,
              name: goalNames[goalId] || goalId
            },
            data: {
              target_amount: amount as number,
              updated_at: new Date()
            }
          });
        }
        break;

      case 'savings_auto_rules':
        await prisma.users.update({
          where: { id: userId },
          data: {
            auto_allocation_enabled: value.auto_enabled || false,
            allocation_refresh_frequency: value.frequency || 'monthly',
            updated_at: new Date()
          }
        });
        break;

      case 'plan_tradeoffs':
        // Update goals/budget based on accepted tradeoffs
        if (value.levers) {
          await prisma.user_preferences.upsert({
            where: { user_id: userId },
            update: {
              financial_goals: {
                ...(await prisma.user_preferences.findUnique({ 
                  where: { user_id: userId } 
                }))?.financial_goals as any || {},
                planTradeoffs: value.levers
              },
              updated_at: new Date()
            },
            create: {
              id: crypto.randomUUID(),
              user_id: userId,
              theme: 'system',
              notifications_enabled: true,
              email_notifications: true,
              push_notifications: false,
              currency: 'USD',
              timezone: 'America/New_York',
              language: 'en',
              financial_goals: { planTradeoffs: value.levers },
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
        break;

      case 'monitoring_preferences':
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            notifications_enabled: value.notifications || false,
            financial_goals: {
              ...(await prisma.user_preferences.findUnique({ 
                where: { user_id: userId } 
              }))?.financial_goals as any || {},
              engagement_frequency: value.frequency || 'weekly'
            },
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: value.notifications || false,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: {
              engagement_frequency: value.frequency || 'weekly'
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        break;

      case 'complete':
        // Mark onboarding as complete
        await prisma.onboarding_progress.upsert({
          where: { user_id: userId },
          update: {
            current_step: 'complete',
            is_complete: true,
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            current_step: 'complete',
            is_complete: true,
            updated_at: new Date()
          }
        });
        break;
    }
  }

  /**
   * Determine next step based on current state
   */
  static next(state: OnboardingState): OnboardingStep | 'complete' {
    const currentConfig = this.getCurrent(state);
    
    if (!currentConfig) {
      return 'welcome'; // Default to start
    }

    // Check if step has custom next logic
    if (currentConfig.next) {
      const nextStep = currentConfig.next(state);
      return nextStep;
    }

    // Default linear progression
    const steps = Object.keys(ONBOARDING_STEPS) as OnboardingStep[];
    const currentIndex = steps.indexOf(state.currentStep);
    
    if (currentIndex === -1 || currentIndex === steps.length - 1) {
      return 'complete';
    }

    return steps[currentIndex + 1];
  }

  /**
   * Check if a step should be skipped based on state
   */
  static shouldSkip(step: OnboardingStep, state: OnboardingState): boolean {
    // Skip manual_expenses if we have Plaid data (but keep income steps)
    if (state.hasPlaidData) {
      if (['manual_expenses', 'expenses_capture'].includes(step)) {
        return true;
      }
    }

    // Skip income_confirmation if no Plaid data - go to income_capture instead
    if (!state.hasPlaidData && step === 'income_confirmation') {
      return true;
    }
    
    // Don't skip income_capture even with Plaid - we use it to confirm/adjust detected income
    // Don't skip manual_income - it's used when user wants to adjust income

    // Skip detected expenses if no Plaid data
    if (!state.hasPlaidData && step === 'detected_expenses') {
      return true;
    }

    return false;
  }

  /**
   * Get progress percentage
   */
  static getProgress(state: OnboardingState): number {
    const progress = calculateOnboardingProgress(state.currentStep);
    return progress.percent;
  }
  
  /**
   * Get detailed progress info
   */
  static getDetailedProgress(state: OnboardingState) {
    const progress = calculateOnboardingProgress(state.currentStep);
    // Override with correct visible step count
    const visibleSteps = 19; // Actual steps users see
    const stepMap: Record<string, number> = {
      'consent': 1, 'welcome': 1, 'main_goal': 2, 'life_stage': 3,
      'dependents': 4, 'jurisdiction': 5, 'plaid_connection': 6,
      'household': 7, 'income_confirmation': 8, 'income_capture': 8,
      'manual_income': 8, 'pay_structure': 9, 'benefits_equity': 10,
      'expenses_capture': 11, 'detected_expenses': 11, 'manual_expenses': 11,
      'debts_detail': 12, 'housing': 13, 'insurance': 14,
      'emergency_fund': 15, 'risk_tolerance': 16, 'risk_capacity': 16,
      'goals_selection': 17, 'goal_parameters': 17, 'budget_review': 18,
      'celebrate_complete': 19, 'complete': 19
    };
    
    const stepNumber = stepMap[state.currentStep] || 1;
    return {
      stepNumber,
      totalSteps: visibleSteps,
      percent: Math.round(((stepNumber - 1) / (visibleSteps - 1)) * 100)
    };
  }
}
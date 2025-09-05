/**
 * Onboarding V2 API - Bulletproof state machine with strict contracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  OnboardingStepV2,
  OnboardingStateV2,
  initializeOnboardingState,
  advanceState,
  validateStepInstance,
  calculateProgressV2,
  createStepInstance,
  STEP_CONFIG_V2
} from '@/lib/onboarding/canonical-v2';
import { detectMonthlyIncomeV2, persistDetectedIncome } from '@/lib/income-detection-v2';

// Redis or in-memory cache for state (use Redis in production)
const stateCache = new Map<string, OnboardingStateV2>();

/**
 * GET /api/onboarding/v2 - Get current onboarding state
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request, null);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or initialize state
    let state = await getOnboardingState(userId);
    if (!state) {
      const sessionId = crypto.randomUUID();
      state = initializeOnboardingState(userId, sessionId);
      await saveOnboardingState(state);
    }

    // AUTO-ADVANCE: If current step is 'welcome', immediately advance to 'main_goal'
    // This ensures the first interactive step after consent is always main_goal
    if (state.currentStep === 'welcome') {
      console.log('Auto-advancing from welcome to main_goal');
      
      // Mark welcome as completed
      if (!state.completedSteps.includes('welcome')) {
        state.completedSteps.push('welcome');
      }
      
      // Advance to main_goal
      state.currentStep = 'main_goal';
      state.currentInstance = createStepInstance('main_goal');
      state.lastUpdated = Date.now();
      
      // Save the auto-advanced state
      await saveOnboardingState(state);
    }

    // Calculate progress
    const progress = calculateProgressV2(state.completedSteps, state.currentStep);

    // Get step configuration
    const stepConfig = STEP_CONFIG_V2[state.currentStep];

    // Build component data based on the current step
    const component = buildStepComponent(state.currentStep);

    // Build response
    const response = {
      currentStep: state.currentStep,
      stepInstance: state.currentInstance,
      stepConfig,
      component, // Include the actual component with data
      progress,
      completedSteps: state.completedSteps,
      sessionId: state.sessionId
    };

    // Add income suggestions if on verify_income step
    if (state.currentStep === 'verify_income') {
      const hasPlaid = await checkPlaidConnection(userId);
      if (hasPlaid) {
        const detection = await detectMonthlyIncomeV2(userId);
        if (detection) {
          response['incomeSuggestion'] = {
            amount: detection.monthlyIncome,
            confidence: detection.confidence,
            source: detection.source,
            message: `I detected $${detection.monthlyIncome.toLocaleString()} monthly income from your connected accounts.`
          };
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/v2 - Submit step response and advance state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user ID - pass body to allow userId from request
    const userId = await getUserId(request, body);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, stepId, instanceId, nonce, payload } = body;
    
    // Handle initialize action
    if (action === 'initialize') {
      // Get or initialize state
      let state = await getOnboardingState(userId);
      if (!state) {
        const sessionId = crypto.randomUUID();
        state = initializeOnboardingState(userId, sessionId);
        await saveOnboardingState(state);
      }

      // AUTO-ADVANCE: If current step is 'welcome', immediately advance to 'main_goal'
      if (state.currentStep === 'welcome') {
        console.log('Auto-advancing from welcome to main_goal');
        if (!state.completedSteps.includes('welcome')) {
          state.completedSteps.push('welcome');
        }
        state.currentStep = 'main_goal';
        state.currentInstance = createStepInstance('main_goal');
        state.lastUpdated = Date.now();
        await saveOnboardingState(state);
      }

      // Build component data
      const component = buildStepComponent(state.currentStep);
      const progress = calculateProgressV2(state.completedSteps, state.currentStep);

      return NextResponse.json({
        state: {
          currentStep: state.currentStep,
          currentInstance: state.currentInstance,
          completedSteps: state.completedSteps,
          sessionId: state.sessionId
        },
        component,
        progress
      });
    }

    // Get current state
    const state = await getOnboardingState(userId);
    if (!state) {
      return NextResponse.json(
        { error: 'No onboarding session found' },
        { status: 404 }
      );
    }

    // Validate step instance
    const validation = validateStepInstance(
      state.currentInstance,
      { stepId, instanceId, nonce }
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'OUT_OF_SYNC',
          message: validation.error,
          expected: state.currentStep,
          received: stepId,
          correctInstance: state.currentInstance
        },
        { status: 409 }
      );
    }

    // Process the payload based on step
    await processStepPayload(userId, state.currentStep, payload);

    // Build context for state advancement
    const context = await buildContext(userId, state, payload);

    // Advance state machine
    const { newState, error } = advanceState(state, payload, context);
    
    if (error) {
      return NextResponse.json(
        { error, currentStep: state.currentStep },
        { status: 400 }
      );
    }

    // Save updated state
    await saveOnboardingState(newState);

    // Calculate new progress
    const progress = calculateProgressV2(newState.completedSteps, newState.currentStep);

    // Get next step configuration
    const nextStepConfig = STEP_CONFIG_V2[newState.currentStep];
    
    // Build component data for next step
    const nextComponent = buildStepComponent(newState.currentStep);

    // Build response
    const response = {
      success: true,
      currentStep: newState.currentStep,
      stepInstance: newState.currentInstance,
      stepConfig: nextStepConfig,
      component: nextComponent, // Include the actual component with data
      progress,
      completedSteps: newState.completedSteps
    };

    // Add income suggestions if advancing to verify_income
    if (newState.currentStep === 'verify_income') {
      const hasPlaid = await checkPlaidConnection(userId);
      if (hasPlaid) {
        const detection = await detectMonthlyIncomeV2(userId);
        if (detection) {
          response['incomeSuggestion'] = {
            amount: detection.monthlyIncome,
            confidence: detection.confidence,
            source: detection.source,
            message: `I detected $${detection.monthlyIncome.toLocaleString()} monthly income from your connected accounts.`
          };
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing onboarding step:', error);
    return NextResponse.json(
      { error: 'Failed to process step' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/v2/resync - Resynchronize client with server state
 */
export async function resync(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current state
    let state = await getOnboardingState(userId);
    if (!state) {
      const sessionId = crypto.randomUUID();
      state = initializeOnboardingState(userId, sessionId);
      await saveOnboardingState(state);
    }

    // Calculate progress
    const progress = calculateProgressV2(state.completedSteps, state.currentStep);

    // Get step configuration
    const stepConfig = STEP_CONFIG_V2[state.currentStep];
    
    // Build component data
    const component = buildStepComponent(state.currentStep);

    return NextResponse.json({
      currentStep: state.currentStep,
      stepInstance: state.currentInstance,
      stepConfig,
      component, // Include the actual component with data
      progress,
      completedSteps: state.completedSteps,
      sessionId: state.sessionId,
      resyncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resyncing state:', error);
    return NextResponse.json(
      { error: 'Failed to resync state' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get user ID from JWT token or request body
 */
async function getUserId(request: NextRequest, body?: any): Promise<string | null> {
  // First try to get userId from request body (for onboarding)
  if (body?.userId) {
    console.log('Using userId from request body:', body.userId);
    return body.userId;
  }
  
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded.userId || decoded.sub || decoded.user_id || null;
  } catch (error) {
    console.log('Token verification failed, trying to decode without verification');
    // For onboarding, try to decode without verification
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded.userId || decoded.sub || decoded.user_id || null;
    } catch {
      return null;
    }
  }
}

/**
 * Helper: Get onboarding state from cache/database
 */
async function getOnboardingState(userId: string): Promise<OnboardingStateV2 | null> {
  // Check cache first
  if (stateCache.has(userId)) {
    return stateCache.get(userId)!;
  }

  // Load from database
  const dbState = await prisma.onboarding_progress.findUnique({
    where: { user_id: userId }
  });

  if (!dbState || !dbState.current_step) {
    return null;
  }

  // Reconstruct state from database
  const responses = await prisma.user_onboarding_responses.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'asc' }
  });

  const stepPayloads: Record<string, any> = {};
  const completedSteps: OnboardingStepV2[] = [];

  for (const response of responses) {
    const step = response.question as OnboardingStepV2;
    if (step && step !== dbState.current_step) {
      completedSteps.push(step);
      try {
        stepPayloads[step] = JSON.parse(response.answer);
      } catch {
        stepPayloads[step] = response.answer;
      }
    }
  }

  const state: OnboardingStateV2 = {
    userId,
    sessionId: crypto.randomUUID(),
    currentStep: dbState.current_step as OnboardingStepV2,
    currentInstance: {
      stepId: dbState.current_step as OnboardingStepV2,
      instanceId: crypto.randomUUID(),
      nonce: crypto.randomUUID(),
      createdAt: Date.now()
    },
    completedSteps,
    stepPayloads,
    lastUpdated: dbState.updated_at.getTime()
  };

  // Cache for future use
  stateCache.set(userId, state);
  return state;
}

/**
 * Helper: Save onboarding state
 */
async function saveOnboardingState(state: OnboardingStateV2): Promise<void> {
  // Update cache
  stateCache.set(state.userId, state);

  // Update database
  await prisma.onboarding_progress.upsert({
    where: { user_id: state.userId },
    update: {
      current_step: state.currentStep,
      is_complete: state.currentStep === 'wrap_up' && state.completedSteps.includes('wrap_up'),
      updated_at: new Date()
    },
    create: {
      user_id: state.userId,
      current_step: state.currentStep,
      is_complete: false,
      updated_at: new Date()
    }
  });
}

/**
 * Helper: Process step payload and persist to database
 */
async function processStepPayload(
  userId: string,
  step: OnboardingStepV2,
  payload: any
): Promise<void> {
  // Always log the response
  await prisma.user_onboarding_responses.create({
    data: {
      user_id: userId,
      question: step,
      answer: typeof payload === 'object' ? JSON.stringify(payload) : String(payload),
      created_at: new Date()
    }
  });

  // Step-specific processing
  switch (step) {
    case 'location':
      await prisma.user_identity.upsert({
        where: { user_id: userId },
        update: {
          state: payload.state,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          state: payload.state,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      break;

    case 'verify_income':
      if (payload.choice === 'detected' && payload.amount) {
        await persistDetectedIncome(userId, {
          amount: payload.amount,
          source: payload.source || 'Salary',
          frequency: payload.frequency
        });
      } else if (payload.choice === 'manual' && payload.amount) {
        await persistDetectedIncome(userId, {
          amount: payload.amount,
          source: 'Manual Entry',
          frequency: 'monthly'
        });
      }
      break;

    case 'household_snapshot':
      await prisma.user_preferences.upsert({
        where: { user_id: userId },
        update: {
          financial_goals: {
            ...(await prisma.user_preferences.findUnique({ 
              where: { user_id: userId } 
            }))?.financial_goals as any || {},
            partner_income: payload.partner_income,
            shared_expenses: payload.shared_expenses,
            household_net_worth: payload.household_net_worth
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
            partner_income: payload.partner_income,
            shared_expenses: payload.shared_expenses,
            household_net_worth: payload.household_net_worth
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      break;

    // Add more step-specific processing as needed
  }
}

/**
 * Helper: Build context for state advancement
 */
async function buildContext(
  userId: string,
  state: OnboardingStateV2,
  payload: any
): Promise<any> {
  const context: any = {};

  // Check Plaid connection
  context.hasPlaidConnection = await checkPlaidConnection(userId);

  // Add income context if relevant
  if (state.currentStep === 'verify_income') {
    context.incomeChoice = payload.choice;
    context.incomeAmount = payload.amount;
  }

  return context;
}

/**
 * Helper: Check if user has Plaid connection
 */
async function checkPlaidConnection(userId: string): Promise<boolean> {
  const connections = await prisma.plaid_connections.count({
    where: { 
      user_id: userId,
      is_active: true
    }
  });
  return connections > 0;
}

/**
 * Helper: Build component data for a step
 */
function buildStepComponent(step: OnboardingStepV2): any {
  const config = STEP_CONFIG_V2[step];
  
  switch (step) {
    case 'privacy_consent':
      return {
        type: 'buttons',
        question: 'Before we begin, please review and accept our privacy policy and terms of service.',
        options: [
          { id: 'accept', value: 'accept', label: 'I Accept', icon: '✅' },
          { id: 'decline', value: 'decline', label: 'Not Now', icon: '❌' }
        ]
      };
      
    case 'main_goal':
      return {
        type: 'buttons', 
        question: "What's your main financial goal right now?",
        options: [
          { id: 'debt', value: 'debt_payoff', label: 'Pay off debt', icon: '🎯' },
          { id: 'emergency', value: 'emergency_fund', label: 'Build emergency fund', icon: '🛡️' },
          { id: 'home', value: 'home_purchase', label: 'Save for a home', icon: '🏠' },
          { id: 'retirement', value: 'retirement', label: 'Plan for retirement', icon: '🏖️' },
          { id: 'wealth', value: 'investments', label: 'Build wealth & invest', icon: '📈' },
          { id: 'other', value: 'other', label: 'Something else', icon: '💭' }
        ]
      };
      
    case 'life_stage':
      return {
        type: 'buttons',
        question: 'Which life stage best describes you?',
        options: [
          { id: 'student', value: 'student', label: 'Student', icon: '🎓' },
          { id: 'early_career', value: 'early_career', label: 'Early Career', icon: '💼' },
          { id: 'established', value: 'established', label: 'Established Professional', icon: '📊' },
          { id: 'family', value: 'family', label: 'Growing Family', icon: '👨‍👩‍👧‍👦' },
          { id: 'pre_retirement', value: 'pre_retirement', label: 'Pre-Retirement', icon: '🌅' },
          { id: 'retired', value: 'retired', label: 'Retired', icon: '🏖️' }
        ]
      };
      
    case 'family_size':
      return {
        type: 'buttons',
        question: 'How many people are in your household?',
        options: [
          { id: '1', value: '1', label: 'Just me', icon: '👤' },
          { id: '2', value: '2', label: '2 people', icon: '👥' },
          { id: '3', value: '3', label: '3 people', icon: '👨‍👩‍👧' },
          { id: '4', value: '4', label: '4 people', icon: '👨‍👩‍👧‍👦' },
          { id: '5+', value: '5+', label: '5 or more', icon: '👨‍👩‍👧‍👦' }
        ]
      };
      
    case 'location':
      return {
        type: 'dropdown',
        question: 'Where are you located?',
        fields: [
          {
            id: 'country',
            label: 'Country',
            type: 'select',
            options: [
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' }
            ]
          },
          {
            id: 'state',
            label: 'State/Province',
            type: 'combobox',
            options: [] // Will be populated based on country
          }
        ]
      };
      
    case 'connect_accounts':
      return {
        type: 'plaid',
        question: 'Connect your accounts for personalized insights',
        title: 'Secure Bank Connection',
        subtitle: 'We use bank-level encryption to keep your data safe',
        benefits: [
          'Automatic income detection',
          'Expense categorization',
          'Real-time net worth tracking',
          'Personalized recommendations'
        ]
      };
      
    case 'verify_income':
      return {
        type: 'buttons',
        question: 'Let me confirm your monthly income',
        subtitle: 'This helps me create an accurate budget for you'
      };
      
    case 'budget_review':
      return {
        type: 'pieChart',
        question: 'Here\'s your personalized budget breakdown',
        categories: [
          { id: 'needs', label: 'Needs (Housing, Food, Transportation)', default: 50 },
          { id: 'wants', label: 'Wants (Entertainment, Dining Out)', default: 30 },
          { id: 'savings', label: 'Savings & Debt Payments', default: 20 }
        ]
      };
      
    case 'emergency_fund':
      return {
        type: 'slider',
        question: 'How many months of expenses for your emergency fund?',
        min: 1,
        max: 12,
        default: 3,
        step: 1,
        prefix: '',
        labels: {
          1: '1 month',
          3: '3 months',
          6: '6 months',
          9: '9 months',
          12: '12 months'
        }
      };
      
    case 'risk_comfort':
      return {
        type: 'slider',
        question: 'How comfortable are you with investment risk?',
        min: 1,
        max: 10,
        default: 5,
        step: 1,
        descriptions: {
          low: 'I prefer stable, predictable returns',
          medium: 'I\'m okay with some ups and downs',
          high: 'I\'m comfortable with volatility for higher returns'
        }
      };
      
    case 'wrap_up':
      return {
        type: 'cards',
        question: 'Congratulations! Your personalized financial plan is ready.',
        templates: [
          {
            id: 'dashboard',
            title: 'View Dashboard',
            description: 'See your complete financial overview',
            icon: '📊'
          }
        ]
      };
      
    default:
      // Return a generic form for steps without specific components
      return {
        type: 'form',
        question: `Please complete this step: ${config.label}`,
        fields: []
      };
  }
}
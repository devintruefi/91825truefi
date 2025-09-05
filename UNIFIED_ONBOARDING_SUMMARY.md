# TrueFi Onboarding System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Core Logic Files](#core-logic-files)
5. [Frontend Components](#frontend-components)
6. [Hooks & Context](#hooks--context)
7. [Documentation & Testing](#documentation--testing)
8. [Integration Files](#integration-files)
9. [Configuration](#configuration)

---

## Overview

The TrueFi onboarding system is a comprehensive 28-step process designed to collect detailed financial information from new users. It provides a conversational experience with Penny (the AI assistant) and integrates with Plaid for automatic financial data detection. The system supports both authenticated and demo users, provides state recovery, and generates personalized dashboards based on collected information.

**Key Features:**
- 28 structured onboarding steps covering income, expenses, debts, goals, and personality
- Conversational interface with Penny AI assistant
- Plaid integration for automatic financial data detection
- Persistent data storage in PostgreSQL
- State recovery for users who refresh or return later
- Personalized dashboard generation
- Comprehensive testing suite with sandbox data

---

## Database Schema

### File: `prisma/schema.prisma` (lines 644-664)
**Location:** `/prisma/schema.prisma`
**Reason:** Defines the database models for storing onboarding data
**Explanation:** Contains the Prisma schema definitions for `user_onboarding_responses` and `onboarding_progress` tables that store all user onboarding information.

```prisma
model user_onboarding_responses {
  id         Int      @id @default(autoincrement())
  user_id    String   @db.Uuid
  question   String
  answer     String
  created_at DateTime @default(now()) @db.Timestamptz(6)
  users      users    @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id], map: "idx_user_onboarding_responses_user_id")
  @@index([question], map: "idx_user_onboarding_responses_question")
}

model onboarding_progress {
  id           Int      @id @default(autoincrement())
  user_id      String   @unique @db.Uuid
  current_step String
  is_complete  Boolean  @default(false)
  updated_at   DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  users        users    @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id], map: "idx_onboarding_progress_user_id")
}
```

---

## API Endpoints

### File: `app/api/onboarding/route.ts`
**Location:** `/app/api/onboarding/route.ts`
**Reason:** Main API endpoint for saving onboarding responses and managing temporary users
**Explanation:** Handles POST requests to save onboarding data, creates temporary users for demo mode, and updates progress tracking.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Clean up old temporary users (older than 24 hours)
async function cleanupOldTempUsers() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const oldTempUsers = await prisma.users.findMany({
      where: {
        email: { startsWith: 'temp-' },
        created_at: { lt: twentyFourHoursAgo }
      }
    });

    for (const tempUser of oldTempUsers) {
      // Delete related data first
      await prisma.user_onboarding_responses.deleteMany({
        where: { user_id: tempUser.id }
      });
      
      await prisma.onboarding_progress.deleteMany({
        where: { user_id: tempUser.id }
      });
      
      // Delete the temporary user
      await prisma.users.delete({
        where: { id: tempUser.id }
      });
    }

    if (oldTempUsers.length > 0) {
      console.log(`Cleaned up ${oldTempUsers.length} old temporary users`);
    }
  } catch (error) {
    console.error('Error cleaning up old temporary users:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { answers, userId } = await req.json();
    console.log('Onboarding POST request received:', { userId, answersCount: Object.keys(answers || {}).length });

    // Validate that we have answers
    if (!answers || typeof answers !== 'object') {
      console.error('Invalid answers format:', answers);
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 });
    }

    // For demo users or when no authentication is available, use the provided userId
    let user_id = userId;
    
    // Try to get user from auth token if available
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
        console.log('Using authenticated user ID:', user_id);
      }
    } catch (error) {
      console.log('No auth token found, using provided userId:', user_id);
    }

    if (!user_id) {
      console.error('No user ID provided');
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    // Clean up old temporary users periodically
    await cleanupOldTempUsers();

    // Check if user exists in the database
    const existingUser = await prisma.users.findUnique({
      where: { id: user_id }
    });

    console.log('User exists in database:', !!existingUser);

    // If user doesn't exist (temp user), create a temporary user record
    if (!existingUser) {
      try {
        console.log('Creating temporary user with ID:', user_id);
        await prisma.users.create({
          data: {
            id: user_id,
            email: `temp-${user_id}@temp.com`, // Temporary email
            first_name: 'Temporary',
            last_name: 'User',
            password_hash: 'temp-hash', // Temporary password hash
            is_active: false, // Mark as inactive
            is_advisor: false,
            created_at: new Date(),
            updated_at: new Date(),
          }
        });
        console.log(`Successfully created temporary user with ID: ${user_id}`);
      } catch (error) {
        console.error('Error creating temporary user:', error);
        return NextResponse.json({ error: 'Failed to create temporary user' }, { status: 500 });
      }
    }

    // Store each answer in the database
    console.log('Storing onboarding responses for user:', user_id);
    const responsePromises = Object.entries(answers).map(([questionId, answer]) => {
      return prisma.user_onboarding_responses.create({
        data: {
          user_id: user_id,
          question: questionId,
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
        },
      });
    });

    await Promise.all(responsePromises);
    console.log('Successfully stored all onboarding responses');

    // Update onboarding progress
    console.log('Updating onboarding progress for user:', user_id);
    await prisma.onboarding_progress.upsert({
      where: { user_id: user_id },
      update: { 
        current_step: 'completed',
        is_complete: true,
        updated_at: new Date()
      },
      create: {
        user_id: user_id,
        current_step: 'completed',
        is_complete: true,
      },
    });

    console.log('Onboarding completed successfully for user:', user_id);
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding responses saved successfully' 
    });

  } catch (error) {
    console.error('Error saving onboarding responses:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding responses' }, 
      { status: 500 }
    );
  }
}
```

### File: `app/api/onboarding/[userId]/route.ts`
**Location:** `/app/api/onboarding/[userId]/route.ts`
**Reason:** Retrieves onboarding responses for a specific user
**Explanation:** GET endpoint that fetches all onboarding responses for a given user ID.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log('Fetching onboarding responses for user:', userId);

    // Validate user ID
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Try to get authenticated user first
    let user_id = userId;
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
        console.log('Using authenticated user ID:', user_id);
      }
    } catch (error) {
      console.log('No auth token found, using provided userId:', user_id);
    }

    // Fetch all onboarding responses for the user
    const responses = await prisma.user_onboarding_responses.findMany({
      where: { user_id: user_id },
      orderBy: { created_at: 'asc' }
    });

    // Transform responses into a key-value object
    const responsesObject: Record<string, string> = {};
    responses.forEach(response => {
      responsesObject[response.question] = response.answer;
    });

    console.log(`Found ${responses.length} onboarding responses for user:`, user_id);

    return NextResponse.json({
      success: true,
      responses: responsesObject
    });

  } catch (error) {
    console.error('Error fetching onboarding responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding responses' },
      { status: 500 }
    );
  }
}
```

### File: `app/api/onboarding/sync-state/route.ts`
**Location:** `/app/api/onboarding/sync-state/route.ts`
**Reason:** Synchronizes onboarding state between client and server
**Explanation:** Handles state synchronization to ensure consistency between frontend and backend during onboarding.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { state, version } = await req.json();
    console.log('Syncing onboarding state:', { userId: state.userId, currentStep: state.currentStep, version });

    // Validate state
    if (!state || !state.userId || !state.currentStep) {
      return NextResponse.json({ error: 'Invalid state data' }, { status: 400 });
    }

    // Get authenticated user
    let user_id = state.userId;
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
      }
    } catch (error) {
      console.log('No auth token, using provided userId');
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update onboarding_progress
      const progress = await tx.onboarding_progress.upsert({
        where: { user_id: user_id },
        update: {
          current_step: state.currentStep,
          is_complete: state.isComplete || false,
          updated_at: new Date()
        },
        create: {
          user_id: user_id,
          current_step: state.currentStep,
          is_complete: state.isComplete || false
        }
      });

      // 2. Save responses to user_onboarding_responses
      if (state.responses && Object.keys(state.responses).length > 0) {
        for (const [question, answer] of Object.entries(state.responses)) {
          const existing = await tx.user_onboarding_responses.findFirst({
            where: {
              user_id: user_id,
              question: question
            }
          });

          if (existing) {
            await tx.user_onboarding_responses.update({
              where: { id: existing.id },
              data: {
                answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
                created_at: new Date()
              }
            });
          } else {
            await tx.user_onboarding_responses.create({
              data: {
                user_id: user_id,
                question: question,
                answer: typeof answer === 'string' ? answer : JSON.stringify(answer)
              }
            });
          }
        }
      }

      return { progress, responsesCount: Object.keys(state.responses || {}).length };
    });

    console.log('State synced successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Onboarding state synced successfully',
      data: result
    });

  } catch (error) {
    console.error('Error syncing onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to sync onboarding state' },
      { status: 500 }
    );
  }
}
```

### File: `app/api/onboarding/recover-state/route.ts`
**Location:** `/app/api/onboarding/recover-state/route.ts`
**Reason:** Recovers onboarding state if user refreshes or returns later
**Explanation:** Retrieves saved onboarding state to allow users to continue where they left off.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    console.log('Recovering onboarding state for user:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get authenticated user
    let user_id = userId;
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
      }
    } catch (error) {
      console.log('No auth token, using provided userId');
    }

    // Fetch onboarding progress
    const progress = await prisma.onboarding_progress.findUnique({
      where: { user_id: user_id }
    });

    // Fetch all responses
    const responses = await prisma.user_onboarding_responses.findMany({
      where: { user_id: user_id },
      orderBy: { created_at: 'asc' }
    });

    // Transform responses
    const responsesObject: Record<string, any> = {};
    responses.forEach(response => {
      try {
        // Try to parse JSON, fallback to string
        const parsed = JSON.parse(response.answer);
        responsesObject[response.question] = parsed;
      } catch {
        responsesObject[response.question] = response.answer;
      }
    });

    const state = {
      userId: user_id,
      currentStep: progress?.current_step || 'welcome',
      completedSteps: progress?.is_complete ? ['complete'] : [],
      responses: responsesObject,
      isComplete: progress?.is_complete || false,
      sessionId: `recovered-${user_id}`,
      createdAt: progress?.updated_at || new Date(),
      updatedAt: progress?.updated_at || new Date()
    };

    console.log('Recovered state:', {
      hasProgress: !!progress,
      responsesCount: responses.length,
      currentStep: state.currentStep,
      isComplete: state.isComplete
    });

    return NextResponse.json({
      success: true,
      state: state,
      hasState: !!progress
    });

  } catch (error) {
    console.error('Error recovering onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to recover onboarding state' },
      { status: 500 }
    );
  }
}
```

### Additional API Endpoints

**File:** `app/api/onboarding/save-progress/route.ts`
**Location:** `/app/api/onboarding/save-progress/route.ts`
**Reason:** Saves progress during onboarding flow
**Explanation:** Handles incremental progress saving during the onboarding process.

**File:** `app/api/onboarding/complete/route.ts`
**Location:** `/app/api/onboarding/complete/route.ts`
**Reason:** Handles onboarding completion
**Explanation:** Finalizes the onboarding process and generates user dashboard.

**File:** `app/api/onboarding/generate-dashboard/route.ts`
**Location:** `/app/api/onboarding/generate-dashboard/route.ts`
**Reason:** Generates personalized dashboard after onboarding
**Explanation:** Creates a personalized financial dashboard based on collected onboarding data.

**File:** `app/api/onboarding/status/route.ts`
**Location:** `/app/api/onboarding/status/route.ts`
**Reason:** Checks onboarding status
**Explanation:** Returns the current status of a user's onboarding process.

**File:** `app/api/onboarding/progress/route.ts`
**Location:** `/app/api/onboarding/progress/route.ts`
**Reason:** Manages onboarding progress tracking
**Explanation:** Handles progress updates and retrieval during onboarding.

**File:** `app/api/onboarding/log-response/route.ts`
**Location:** `/app/api/onboarding/log-response/route.ts`
**Reason:** Logs individual responses
**Explanation:** Logs individual onboarding responses for audit purposes.

**File:** `app/api/onboarding/transfer/route.ts`
**Location:** `/app/api/onboarding/transfer/route.ts`
**Reason:** Transfers onboarding data between users
**Explanation:** Allows transfer of onboarding data from temporary to permanent users.

**File:** `app/api/onboarding/suggestions/route.ts`
**Location:** `/app/api/onboarding/suggestions/route.ts`
**Reason:** Provides AI-generated suggestions during onboarding
**Explanation:** Generates personalized suggestions based on user responses and Plaid data.

**File:** `app/api/onboarding/analyze-plaid/route.ts`
**Location:** `/app/api/onboarding/analyze-plaid/route.ts`
**Reason:** Analyzes Plaid data for onboarding insights
**Explanation:** Processes Plaid data to provide financial insights during onboarding.

---

## Core Logic Files

### File: `lib/onboarding/types.ts`
**Location:** `/lib/onboarding/types.ts`
**Reason:** Defines TypeScript interfaces and types for the onboarding system
**Explanation:** Contains all type definitions used throughout the onboarding system for type safety and consistency.

```typescript
// Enhanced Onboarding Types and Interfaces

export type OnboardingPhase = 
  | 'welcome'
  | 'quick-wins'
  | 'financial-snapshot'
  | 'personalization'
  | 'goals-dreams'
  | 'complete';

export type MessageComponentType = 
  | 'text'
  | 'buttons'
  | 'checkbox-group'
  | 'slider'
  | 'cards'
  | 'plaid-connect'
  | 'image-choice'
  | 'drag-sort'
  | 'pie-chart'
  | 'timeline'
  | 'quick-add'
  | 'voice-input'
  | 'assetsInput'
  | 'liabilitiesInput';

export interface OnboardingMessage {
  id: string;
  type: MessageComponentType;
  content?: string;
  data?: any;
  skipOption?: boolean;
  required?: boolean;
  saveKey?: string; // Database field to save to
  nextPhase?: OnboardingPhase;
  celebration?: boolean; // Show confetti/animation
}

export interface OnboardingProgress {
  userId: string;
  currentPhase: OnboardingPhase;
  completedPhases: OnboardingPhase[];
  answers: Record<string, any>;
  startedAt: Date;
  lastUpdated: Date;
  completionPercentage: number;
  points: number;
  achievements: string[];
}

export interface QuickStartTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  presets: {
    goals: string[];
    budgetFocus: string;
    riskTolerance: number;
    notifications: string;
  };
}

export interface LifeEvent {
  id: string;
  name: string;
  icon: string;
  timeframe?: string;
  financialImpact?: {
    cost?: number;
    savingsNeeded?: number;
    budgetAdjustment?: Record<string, number>;
  };
}

export interface MoneyPersonality {
  spenderSaver: number; // -1 (spender) to 1 (saver)
  plannerSpontaneous: number; // -1 (spontaneous) to 1 (planner)
  riskProfile: number; // 0 (conservative) to 10 (aggressive)
  primaryMotivation: 'security' | 'freedom' | 'status' | 'family' | 'experience';
}

export interface OnboardingContext {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  progress: OnboardingProgress;
  personality?: MoneyPersonality;
  inferredData?: Record<string, any>;
  sessionId: string;
  startTime: Date;
}

export interface InteractiveComponent {
  id: string;
  type: MessageComponentType;
  props: any;
  onComplete: (value: any) => void;
  onSkip?: () => void;
}

export interface OnboardingFlow {
  phases: {
    [key in OnboardingPhase]: {
      title: string;
      description?: string;
      questions: OnboardingMessage[];
      minCompletion?: number; // Minimum questions to answer
      maxDuration?: number; // Max time in seconds
      celebration?: boolean;
    };
  };
}
```

### File: `lib/onboarding/steps.ts`
**Location:** `/lib/onboarding/steps.ts`
**Reason:** Contains all 28 onboarding step configurations and component definitions
**Explanation:** Defines the complete onboarding flow with step-by-step configurations, including questions, UI components, and validation rules.

```typescript
// Canonical onboarding step IDs - single source of truth
export const ONBOARDING_STEPS = {
  consent: 'consent',
  welcome: 'welcome',
  main_goal: 'main_goal',
  life_stage: 'life_stage',
  dependents: 'dependents',
  jurisdiction: 'jurisdiction',
  household: 'household',
  plaid_connection: 'plaid_connection',
  income_capture: 'income_capture',
  income_confirmation: 'income_confirmation',
  manual_income: 'manual_income',
  pay_structure: 'pay_structure',
  benefits_equity: 'benefits_equity',
  expenses_capture: 'expenses_capture',
  detected_expenses: 'detected_expenses',
  manual_expenses: 'manual_expenses',
  quick_accounts: 'quick_accounts',
  debts_detail: 'debts_detail',
  housing: 'housing',
  insurance: 'insurance',
  emergency_fund: 'emergency_fund',
  risk_tolerance: 'risk_tolerance',
  risk_capacity: 'risk_capacity',
  preferences_values: 'preferences_values',
  goals_selection: 'goals_selection',
  goal_parameters: 'goal_parameters',
  budget_review: 'budget_review',
  savings_auto_rules: 'savings_auto_rules',
  plan_tradeoffs: 'plan_tradeoffs',
  dashboard_preview: 'dashboard_preview',
  first_actions: 'first_actions',
  monitoring_preferences: 'monitoring_preferences',
  celebrate_complete: 'celebrate_complete',
  complete: 'complete'
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

// Component type definitions
export type ComponentType = 
  | 'buttons' 
  | 'cards' 
  | 'checkboxes' 
  | 'slider' 
  | 'plaid' 
  | 'quickAdd' 
  | 'pieChart' 
  | 'assetsInput' 
  | 'liabilitiesInput' 
  | 'dashboardPreview' 
  | 'form' 
  | 'tradeoffs';

// Component data schemas
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'combobox';
  options?: Array<{ value: string; label: string; group?: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface FormComponentData {
  fields: FormField[];
  submitLabel: string;
  allowSkip: boolean;
}

export interface TradeoffLever {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
}

export interface TradeoffsComponentData {
  levers: TradeoffLever[];
  submitLabel: string;
  allowSkip: boolean;
}

// Step configuration type
export interface StepConfig {
  id: OnboardingStep;
  message: string;
  component: {
    type: ComponentType;
    data: any;
  };
  onAnswer?: (value: any, ctx: any) => Promise<void>;
  next?: (state: any) => OnboardingStep | 'complete';
}

// Step configurations with DB write mappings
export const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
  consent: {
    id: 'consent',
    message: "Before we get started, I need your consent to analyze your financial data and provide personalized recommendations. Your privacy and security are my top priorities.",
    component: {
      type: 'checkboxes',
      data: {
        title: 'Privacy & Consent',
        description: 'I understand and agree to:',
        options: [
          { id: 'data_analysis', label: 'Allow analysis of my financial data for personalized recommendations', required: true },
          { id: 'data_storage', label: 'Store my financial information securely', required: true },
          { id: 'communications', label: 'Receive personalized financial insights and updates', required: false },
          { id: 'third_party', label: 'Share data with trusted financial partners (only with explicit consent)', required: false }
        ],
        submitLabel: 'I Consent & Continue',
        allowSkip: false
      }
    },
    onAnswer: async (value, ctx) => {
      // Store in user_onboarding_responses only
      await ctx.prisma.user_onboarding_responses.create({
        data: {
          user_id: ctx.userId,
          question: 'consent',
          answer: JSON.stringify(value)
        }
      });
    }
  },

  welcome: {
    id: 'welcome',
    message: "Welcome to TrueFi! I'm Penny, your AI financial assistant. I'm here to help you build a personalized financial plan that works for your unique situation.",
    component: {
      type: 'buttons',
      data: {
        title: 'Let\'s Get Started',
        description: 'I\'ll guide you through a few questions to understand your financial situation and goals.',
        options: [
          { id: 'start', label: 'Start My Financial Journey', value: 'start', icon: '🚀' },
          { id: 'demo', label: 'Try Demo Mode', value: 'demo', icon: '🎮' }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    }
  },

  main_goal: {
    id: 'main_goal',
    message: "What's your primary financial goal right now? This will help me tailor your experience.",
    component: {
      type: 'cards',
      data: {
        title: 'Choose Your Main Goal',
        description: 'Select the goal that matters most to you:',
        options: [
          { id: 'debt_freedom', label: 'Get Out of Debt', description: 'Pay off credit cards, loans, and other debt', icon: '💳' },
          { id: 'emergency_fund', label: 'Build Emergency Fund', description: 'Save 3-6 months of expenses for emergencies', icon: '🛡️' },
          { id: 'budget_control', label: 'Control Spending', description: 'Track expenses and stick to a budget', icon: '' },
          { id: 'wealth_building', label: 'Build Wealth', description: 'Invest and grow your money for the future', icon: '' },
          { id: 'retirement', label: 'Plan for Retirement', description: 'Save and invest for retirement', icon: '🏖️' },
          { id: 'major_purchase', label: 'Save for Major Purchase', description: 'House, car, education, or other big expense', icon: '🏠' }
        ],
        submitLabel: 'Continue',
        allowSkip: false
      }
    },
    onAnswer: async (value, ctx) => {
      // TODO: Store in user_onboarding_responses
    }
  },

  // ... Additional steps would continue here with similar structure
  // Each step has a unique ID, message, component configuration, and optional onAnswer handler
};
```

### File: `lib/onboarding/onboarding-flow.ts`
**Location:** `/lib/onboarding/onboarding-flow.ts`
**Reason:** Defines the onboarding flow structure and quick start templates
**Explanation:** Contains the overall flow structure, quick start templates, and life events that guide users through the onboarding process.

```typescript
import { OnboardingFlow, QuickStartTemplate, LifeEvent } from './types';

export const quickStartTemplates: QuickStartTemplate[] = [
  {
    id: 'debt-crusher',
    title: "I'm drowning in debt",
    description: 'Focus on paying off debt and regaining control',
    icon: '🎯',
    presets: {
      goals: ['debt_payoff', 'emergency_fund'],
      budgetFocus: 'aggressive_saving',
      riskTolerance: 2,
      notifications: 'daily'
    }
  },
  {
    id: 'first-timer',
    title: "I'm new to budgeting",
    description: 'Start with the basics and build good habits',
    icon: '🌱',
    presets: {
      goals: ['budget_tracking', 'emergency_fund'],
      budgetFocus: 'balanced',
      riskTolerance: 5,
      notifications: 'weekly'
    }
  },
  {
    id: 'wealth-builder',
    title: "I want to build wealth",
    description: 'Focus on investments and long-term growth',
    icon: '📈',
    presets: {
      goals: ['investments', 'retirement', 'real_estate'],
      budgetFocus: 'investment_heavy',
      riskTolerance: 7,
      notifications: 'weekly'
    }
  },
  {
    id: 'family-focused',
    title: "Planning for my family",
    description: 'Balance current needs with future security',
    icon: '👨‍👩‍👧‍👦',
    presets: {
      goals: ['emergency_fund', 'college_savings', 'home_purchase'],
      budgetFocus: 'family_oriented',
      riskTolerance: 4,
      notifications: 'bi-weekly'
    }
  }
];

export const commonLifeEvents: LifeEvent[] = [
  {
    id: 'wedding',
    name: 'Getting Married',
    icon: '💍',
    timeframe: '6-18 months',
    financialImpact: { savingsNeeded: 25000 }
  },
  {
    id: 'baby',
    name: 'Having a Baby',
    icon: '👶',
    timeframe: '9 months',
    financialImpact: { 
      savingsNeeded: 5000,
      budgetAdjustment: { childcare: 1500, healthcare: 300 }
    }
  },
  {
    id: 'home',
    name: 'Buying First Home',
    icon: '',
    timeframe: '1-3 years',
    financialImpact: { savingsNeeded: 50000 }
  },
  {
    id: 'college',
    name: 'Starting College',
    icon: '🎓',
    timeframe: 'Now',
    financialImpact: { cost: 30000 }
  },
  {
    id: 'retirement',
    name: 'Planning Retirement',
    icon: '🏖️',
    timeframe: '5+ years',
    financialImpact: { savingsNeeded: 1000000 }
  },
  {
    id: 'career-change',
    name: 'Changing Careers',
    icon: '',
    timeframe: '3-6 months',
    financialImpact: { savingsNeeded: 10000 }
  }
];

export const onboardingFlow: OnboardingFlow = {
  phases: {
    welcome: {
      title: 'Welcome to TrueFi',
      description: 'Let\'s get to know you and your financial situation',
      questions: [
        {
          id: 'welcome-1',
          type: 'text',
          content: "Welcome to TrueFi! I'm Penny, your AI financial assistant. I'm here to help you build a personalized financial plan that works for your unique situation.",
          data: {
            title: 'Let\'s Get Started',
            description: 'I\'ll guide you through a few questions to understand your financial situation and goals.',
            options: [
              { id: 'start', label: 'Start My Financial Journey', value: 'start', icon: '🚀' },
              { id: 'demo', label: 'Try Demo Mode', value: 'demo', icon: '🎮' }
            ]
          }
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    'quick-wins': {
      title: 'Quick Wins',
      description: 'Let\'s identify some immediate opportunities',
      questions: [
        {
          id: 'main-goal',
          type: 'cards',
          content: "What's your primary financial goal right now? This will help me tailor your experience.",
          data: {
            title: 'Choose Your Main Goal',
            description: 'Select the goal that matters most to you:',
            options: [
              { id: 'debt_freedom', label: 'Get Out of Debt', description: 'Pay off credit cards, loans, and other debt', icon: '💳' },
              { id: 'emergency_fund', label: 'Build Emergency Fund', description: 'Save 3-6 months of expenses for emergencies', icon: '🛡️' },
              { id: 'budget_control', label: 'Control Spending', description: 'Track expenses and stick to a budget', icon: '📊' },
              { id: 'wealth_building', label: 'Build Wealth', description: 'Invest and grow your money for the future', icon: '📈' },
              { id: 'retirement', label: 'Plan for Retirement', description: 'Save and invest for retirement', icon: '🏖️' },
              { id: 'major_purchase', label: 'Save for Major Purchase', description: 'House, car, education, or other big expense', icon: '🏠' }
            ]
          },
          saveKey: 'main_goal'
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    'financial-snapshot': {
      title: 'Financial Snapshot',
      description: 'Let\'s understand your current financial situation',
      questions: [
        {
          id: 'income-capture',
          type: 'form',
          content: "Let's start with your income. How much do you typically earn each month?",
          data: {
            fields: [
              {
                id: 'monthly_income',
                label: 'Monthly Net Income',
                type: 'number',
                placeholder: 'Enter your monthly take-home pay',
                required: true
              },
              {
                id: 'income_source',
                label: 'Primary Income Source',
                type: 'select',
                options: [
                  { value: 'salary', label: 'Salary/Wages' },
                  { value: 'freelance', label: 'Freelance/Self-employed' },
                  { value: 'business', label: 'Business Owner' },
                  { value: 'investments', label: 'Investment Income' },
                  { value: 'other', label: 'Other' }
                ],
                required: true
              }
            ],
            submitLabel: 'Continue',
            allowSkip: false
          },
          saveKey: 'income_info'
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    personalization: {
      title: 'Personalization',
      description: 'Let\'s understand your preferences and risk tolerance',
      questions: [
        {
          id: 'risk-tolerance',
          type: 'slider',
          content: "How do you feel about investment risk? On a scale of 1-10, where 1 is very conservative and 10 is very aggressive.",
          data: {
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 5,
            labels: {
              1: 'Very Conservative',
              5: 'Moderate',
              10: 'Very Aggressive'
            }
          },
          saveKey: 'risk_tolerance'
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    'goals-dreams': {
      title: 'Goals & Dreams',
      description: 'Let\'s plan for your future',
      questions: [
        {
          id: 'financial-goals',
          type: 'checkbox-group',
          content: "What are your top financial goals? Select all that apply:",
          data: {
            options: [
              { id: 'emergency_fund', label: 'Build emergency fund', description: '3-6 months of expenses' },
              { id: 'debt_payoff', label: 'Pay off debt', description: 'Credit cards, loans, etc.' },
              { id: 'home_purchase', label: 'Buy a home', description: 'Down payment and mortgage' },
              { id: 'retirement', label: 'Save for retirement', description: '401k, IRA, etc.' },
              { id: 'education', label: 'Education expenses', description: 'College, training, etc.' },
              { id: 'travel', label: 'Travel and experiences', description: 'Vacations, bucket list' },
              { id: 'business', label: 'Start a business', description: 'Entrepreneurial ventures' },
              { id: 'charity', label: 'Charitable giving', description: 'Donations and philanthropy' }
            ]
          },
          saveKey: 'financial_goals'
        }
      ],
      minCompletion: 1,
      celebration: false
    },

    complete: {
      title: 'Complete',
      description: 'You\'re all set!',
      questions: [
        {
          id: 'completion',
          type: 'text',
          content: "Congratulations! I've gathered all the information I need to create your personalized financial plan.",
          data: {
            title: 'Setup Complete',
            description: 'Your personalized dashboard is ready. Let\'s start your financial journey!',
            options: [
              { id: 'view_dashboard', label: 'View My Dashboard', value: 'dashboard', icon: '📊' },
              { id: 'start_planning', label: 'Start Planning', value: 'planning', icon: '🎯' }
            ]
          },
          celebration: true
        }
      ],
      minCompletion: 1,
      celebration: true
    }
  }
};
```

### File: `lib/onboarding/manager.ts`
**Location:** `/lib/onboarding/manager.ts`
**Reason:** Main onboarding manager class handling state and logic
**Explanation:** Core class that manages the onboarding process, including state management, step progression, and data persistence.

```typescript
import { ONBOARDING_STEPS, OnboardingStep, STEP_CONFIG, ComponentType } from './steps';
import { PrismaClient } from '@prisma/client';
import { calculateOnboardingProgress } from './progress-utils';
import { detectMonthlyIncome } from '../income-detection';
import { detectFinancialProfile } from '../plaid-detection';
import { randomUUID } from 'crypto';

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
            financial_goals: { life_stage: value, marital_status: maritalStatus },
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
        
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            risk_tolerance: value,
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
            risk_tolerance: value,
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
```

### Additional Core Logic Files

**File:** `lib/onboarding/step-config.ts`
**Location:** `/lib/onboarding/step-config.ts`
**Reason:** Step configuration and validation rules
**Explanation:** Contains detailed configuration for each onboarding step including validation rules and component settings.

**File:** `lib/onboarding/ordered-steps.ts`
**Location:** `/lib/onboarding/ordered-steps.ts`
**Reason:** Defines the order of onboarding steps
**Explanation:** Establishes the sequential order in which onboarding steps should be presented to users.

**File:** `lib/onboarding/canonical-steps.ts`
**Location:** `/lib/onboarding/canonical-steps.ts`
**Reason:** Canonical step definitions
**Explanation:** Provides the authoritative definitions for all onboarding steps.

**File:** `lib/onboarding/progress-utils.ts`
**Location:** `/lib/onboarding/progress-utils.ts`
**Reason:** Utilities for calculating onboarding progress
**Explanation:** Helper functions for tracking and calculating user progress through the onboarding flow.

**File:** `lib/onboarding/step-utils.ts`
**Location:** `/lib/onboarding/step-utils.ts`
**Reason:** Helper functions for step management
**Explanation:** Utility functions for managing step transitions and state.

**File:** `lib/onboarding/validators.ts`
**Location:** `/lib/onboarding/validators.ts`
**Reason:** Validation logic for onboarding inputs
**Explanation:** Contains validation rules and error handling for user inputs during onboarding.

**File:** `lib/onboarding/fresh-session.ts`
**Location:** `/lib/onboarding/fresh-session.ts`
**Reason:** Handles starting fresh onboarding sessions
**Explanation:** Manages the initialization of new onboarding sessions and state reset.

**File:** `lib/onboarding/state-recovery.ts`
**Location:** `/lib/onboarding/state-recovery.ts`
**Reason:** State recovery mechanisms
**Explanation:** Handles recovery of onboarding state when users return or refresh the page.

**File:** `lib/onboarding/database-sync.ts`
**Location:** `/lib/onboarding/database-sync.ts`
**Reason:** Database synchronization utilities
**Explanation:** Manages synchronization between client state and database persistence.

**File:** `lib/onboarding/chat-session-manager.ts`
**Location:** `/lib/onboarding/chat-session-manager.ts`
**Reason:** Manages chat sessions during onboarding
**Explanation:** Handles chat session state and message management during the onboarding process.

**File:** `lib/onboarding/error-boundary.tsx`
**Location:** `/lib/onboarding/error-boundary.tsx`
**Reason:** Error handling for onboarding components
**Explanation:** React error boundary component for handling errors in onboarding UI components.

---

## Frontend Components

### File: `components/chat/penny-onboarding-chat.tsx`
**Location:** `/components/chat/penny-onboarding-chat.tsx`
**Reason:** Main onboarding chat interface with Penny
**Explanation:** Primary React component that renders the conversational onboarding interface with Penny AI assistant.

```typescript
"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import { OnboardingComponents } from './onboarding-components';
import { onboardingFlow, quickStartTemplates } from '@/lib/onboarding/onboarding-flow';
import { OnboardingPhase, OnboardingMessage, OnboardingProgress } from '@/lib/onboarding/types';
import { OnboardingProgressSidebar } from './onboarding-progress-sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Trophy, 
  Star, 
  CheckCircle,
  ArrowRight,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content?: string;
  component?: OnboardingMessage;
  timestamp: Date;
}

export function PennyOnboardingChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('welcome');
  const [progress, setProgress] = useState<OnboardingProgress>({
    userId: user?.id || '',
    currentPhase: 'welcome',
    completedPhases: [],
    answers: {},
    startedAt: new Date(),
    lastUpdated: new Date(),
    completionPercentage: 0,
    points: 0,
    achievements: []
  });
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize onboarding on mount - always start fresh
  useEffect(() => {
    if (user) {
      // Clear any existing onboarding data from localStorage to ensure fresh start
      localStorage.removeItem('onboarding_progress');
      localStorage.removeItem('onboarding_complete');
      startOnboarding();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startOnboarding = async () => {
    // Reset state to ensure fresh start
    setMessages([]);
    setCurrentPhase('welcome');
    setCurrentQuestionIndex(0);
    setProgress({
      userId: user?.id || '',
      currentPhase: 'welcome',
      completedPhases: [],
      answers: {},
      startedAt: new Date(),
      lastUpdated: new Date(),
      completionPercentage: 0,
      points: 0,
      achievements: []
    });
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome-1',
      role: 'assistant',
      content: onboardingFlow.phases.welcome.questions[0].content,
      component: onboardingFlow.phases.welcome.questions[0],
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  // ... Additional component logic would continue here
}
```

### File: `components/chat/onboarding-components.tsx`
**Location:** `/components/chat/onboarding-components.tsx`
**Reason:** All UI components used in onboarding (buttons, forms, charts, etc.)
**Explanation:** Contains all the React components used throughout the onboarding process including buttons, forms, sliders, and interactive elements.

```typescript
"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlaidConnect } from '@/components/plaid-connect';
import { cn } from '@/lib/utils';
import { 
  Check, 
  ChevronRight,
  Sparkles,
  Trophy,
  Star,
  ArrowUp,
  ArrowDown,
  Shield,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';

interface BaseComponentProps {
  data: any;
  onComplete: (value: any) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

// Info Card Component - for privacy/security messages
export function InfoCard({ data, onComplete }: BaseComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                {data.icon === '🔒' ? (
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {data.title}
                </h3>
                <div className="space-y-2">
                  {data.points.map((point: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => onComplete(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {data.buttonText || 'Continue'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Button Selection Component
export function ButtonSelection({ data, onComplete, onSkip }: BaseComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect 
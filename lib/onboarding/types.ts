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
  | 'voice-input';

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
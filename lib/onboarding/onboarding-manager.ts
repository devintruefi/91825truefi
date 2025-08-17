// Comprehensive onboarding flow manager with database integration
export const ONBOARDING_STEPS = {
  MAIN_GOAL: 'main_goal',
  LIFE_STAGE: 'life_stage',
  DEPENDENTS: 'dependents',
  BANK_CONNECTION: 'bank_connection',
  INCOME_CONFIRMATION: 'income_confirmation',
  RISK_TOLERANCE: 'risk_tolerance',
  GOALS_SELECTION: 'goals_selection',
  BUDGET_REVIEW: 'budget_review',
  DASHBOARD_PREVIEW: 'dashboard_preview',
  COMPLETE: 'complete'
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

// Map steps to friendly names for progress display
export const STEP_NAMES: Record<OnboardingStep, string> = {
  main_goal: 'Your Main Goal',
  life_stage: 'Life Stage',
  dependents: 'Family Size',
  bank_connection: 'Connect Accounts',
  income_confirmation: 'Verify Income',
  risk_tolerance: 'Risk Comfort',
  goals_selection: 'Financial Goals',
  budget_review: 'Budget Setup',
  dashboard_preview: 'Preview',
  complete: 'Complete!'
};

// Calculate progress percentage
export function getProgressPercentage(currentStep: OnboardingStep): number {
  const steps = Object.values(ONBOARDING_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return Math.round(((currentIndex + 1) / steps.length) * 100);
}

// Get next step in flow - Updated to connect bank accounts early
export function getNextStep(currentStep: OnboardingStep, progress: any): OnboardingStep {
  switch (currentStep) {
    case ONBOARDING_STEPS.MAIN_GOAL:
      return ONBOARDING_STEPS.BANK_CONNECTION;  // Connect accounts right after goal selection
    case ONBOARDING_STEPS.BANK_CONNECTION:
      // If accounts connected, go to income confirmation
      if (progress.hasConnectedAccounts || progress.plaidData) {
        return ONBOARDING_STEPS.INCOME_CONFIRMATION;
      }
      // If skipped, go to life stage questions
      return ONBOARDING_STEPS.LIFE_STAGE;
    case ONBOARDING_STEPS.INCOME_CONFIRMATION:
      return ONBOARDING_STEPS.LIFE_STAGE;
    case ONBOARDING_STEPS.LIFE_STAGE:
      return ONBOARDING_STEPS.DEPENDENTS;
    case ONBOARDING_STEPS.DEPENDENTS:
      return ONBOARDING_STEPS.RISK_TOLERANCE;
    case ONBOARDING_STEPS.RISK_TOLERANCE:
      return ONBOARDING_STEPS.GOALS_SELECTION;
    case ONBOARDING_STEPS.GOALS_SELECTION:
      return ONBOARDING_STEPS.BUDGET_REVIEW;
    case ONBOARDING_STEPS.BUDGET_REVIEW:
      return ONBOARDING_STEPS.DASHBOARD_PREVIEW;
    case ONBOARDING_STEPS.DASHBOARD_PREVIEW:
      return ONBOARDING_STEPS.COMPLETE;
    default:
      return ONBOARDING_STEPS.COMPLETE;
  }
}

// Generate contextual responses based on user input
export function getContextualResponse(step: OnboardingStep, value: any, userName: string): string {
  switch (step) {
    case ONBOARDING_STEPS.MAIN_GOAL:
      const goalResponses: Record<string, string> = {
        'financial-plan': `Perfect, ${userName}! Building a solid financial plan is smart. To give you advice that actually works for YOUR situation, I'll need to see the full picture. 📊`,
        'fix-budget': `I hear you, ${userName}! Let's get your spending under control. First, I'll need to see where your money's actually going - that's the key to a budget that sticks. 💪`,
        'understand-investments': `Great choice! Before we talk investments, let me understand your current finances so I can recommend strategies that fit your situation perfectly. 📈`,
        'big-event': `How exciting! To build the perfect savings plan for your goal, I need to see what we're working with first. 🎯`,
        'other': `No problem, ${userName}! To give you the best guidance, let's start by getting a complete view of your finances. 🌟`
      };
      return goalResponses[value] || `Great choice, ${userName}! Let's start by understanding your complete financial picture.`;

    case ONBOARDING_STEPS.LIFE_STAGE:
      const stageResponses: Record<string, string> = {
        'student': `Being a student is an exciting time! Let's set you up with smart money habits that will last a lifetime. 🎓`,
        'working': `Perfect! The working years are crucial for building wealth. Let's optimize your finances for growth. 💼`,
        'married': `Congratulations on your marriage! Managing money as a couple has unique opportunities - let's explore them. 💑`,
        'parent': `Parenting comes with new financial responsibilities. I'll help you balance today's needs with tomorrow's dreams. 👨‍👩‍👧‍👦`,
        'retired': `Retirement is a new chapter! Let's make sure your money lasts and works efficiently for you. 🌴`
      };
      return stageResponses[value] || 'Thanks for sharing! This helps me understand your priorities better.';

    case ONBOARDING_STEPS.DEPENDENTS:
      if (value === '0') {
        return `Got it! With no dependents, we can focus entirely on your personal financial goals. This gives you great flexibility! 🎯`;
      } else if (value === '1') {
        return `One dependent - that's an important responsibility. We'll make sure to factor in their needs while building your financial security. 👨‍👧`;
      } else {
        return `With ${value === '3+' ? 'multiple' : value} dependents, family financial planning is crucial. I'll help you protect and provide for everyone! 👨‍👩‍👧‍👦`;
      }

    case ONBOARDING_STEPS.BANK_CONNECTION:
      if (value === 'connected' || value?.publicToken || value?.accounts) {
        return `Awesome! Your accounts are securely connected. I can already see some interesting patterns in your spending and income. This is going to help me give you advice that actually fits your life! 🔗`;
      } else if (value === 'skipped' || value === 'skip') {
        return `No worries at all! You can connect your accounts whenever you're ready. For now, let me ask you a few quick questions so I can still help you out. 📝`;
      } else {
        return `Perfect! I've got your accounts connected. Let me quickly analyze your financial data... 🔍`;
      }

    case ONBOARDING_STEPS.INCOME_CONFIRMATION:
      return `Thanks for confirming! Understanding your income helps me create a realistic budget and savings plan that actually works for your life. 💰`;

    case ONBOARDING_STEPS.RISK_TOLERANCE:
      const risk = parseInt(value);
      if (risk <= 3) {
        return `Safety first - I respect that! We'll focus on stable, low-risk strategies to protect your money while it grows steadily. 🛡️`;
      } else if (risk <= 7) {
        return `A balanced approach - smart thinking! We'll mix stability with growth opportunities for the best of both worlds. ⚖️`;
      } else {
        return `You're comfortable with risk for higher returns - great! We'll explore growth strategies while still maintaining smart safeguards. 🚀`;
      }

    case ONBOARDING_STEPS.GOALS_SELECTION:
      const count = value.selected?.length || 0;
      return `Excellent choices! Working on ${count} goals simultaneously is ambitious but achievable. I'll help you prioritize and track progress on each one. 🎯`;

    case ONBOARDING_STEPS.BUDGET_REVIEW:
      return `Your budget looks good! This is your financial roadmap - we can always adjust it as your life changes. Ready to see everything come together? 📊`;

    default:
      return `Great progress, ${userName}! Let's keep going. 🌟`;
  }
}

// Get milestone messages for celebration points
export function getMilestoneMessage(step: OnboardingStep, userName: string): string | null {
  switch (step) {
    case ONBOARDING_STEPS.BANK_CONNECTION:
      return `🎉 Nice work, ${userName}! You're 40% done and your financial picture is taking shape!`;
    case ONBOARDING_STEPS.GOALS_SELECTION:
      return `⭐ Amazing progress! You're 70% complete - just a few more steps!`;
    case ONBOARDING_STEPS.DASHBOARD_PREVIEW:
      return `🏆 You did it, ${userName}! Your personalized financial dashboard is ready!`;
    default:
      return null;
  }
}

// Determine what component to show based on step
export function getStepComponent(step: OnboardingStep, progress: any) {
  switch (step) {
    case ONBOARDING_STEPS.MAIN_GOAL:
      return {
        type: 'buttons',
        data: {
          options: [
            { id: 'financial-plan', value: 'financial-plan', label: 'Build a complete financial plan', icon: '📋' },
            { id: 'fix-budget', value: 'fix-budget', label: 'Get my spending under control', icon: '💰' },
            { id: 'understand-investments', value: 'understand-investments', label: 'Start investing wisely', icon: '📈' },
            { id: 'big-event', value: 'big-event', label: 'Save for something big', icon: '🎯' },
            { id: 'other', value: 'other', label: 'Something else', icon: '💭' }
          ]
        }
      };

    case ONBOARDING_STEPS.LIFE_STAGE:
      return {
        type: 'buttons',
        data: {
          options: [
            { id: 'student', value: 'student', label: 'Student', icon: '🎓' },
            { id: 'working', value: 'working', label: 'Working Professional', icon: '💼' },
            { id: 'married', value: 'married', label: 'Married', icon: '💑' },
            { id: 'parent', value: 'parent', label: 'Parent', icon: '👨‍👩‍👧‍👦' },
            { id: 'retired', value: 'retired', label: 'Retired', icon: '🌴' }
          ]
        }
      };

    case ONBOARDING_STEPS.DEPENDENTS:
      return {
        type: 'buttons',
        data: {
          options: [
            { id: 'no-dependents', value: '0', label: 'Just me', icon: '👤' },
            { id: '1-dependent', value: '1', label: '1 dependent', icon: '👥' },
            { id: '2-dependents', value: '2', label: '2 dependents', icon: '👨‍👩‍👧' },
            { id: '3-plus-dependents', value: '3+', label: '3 or more', icon: '👨‍👩‍👧‍👦' }
          ]
        }
      };

    case ONBOARDING_STEPS.BANK_CONNECTION:
      return {
        type: 'plaid',
        data: {
          title: 'Let\'s connect your accounts',
          subtitle: 'This is secure and read-only - I can\'t move your money',
          benefits: [
            'See your real spending patterns',
            'Get personalized advice',
            'Track all accounts in one place',
            'Automatic categorization'
          ]
        }
      };

    case ONBOARDING_STEPS.INCOME_CONFIRMATION:
      // This would show detected income with edit option
      const detectedIncome = progress.detectedMonthlyIncome || 5000;
      return {
        type: 'incomeConfirm',
        data: {
          detected: detectedIncome,
          message: `Based on your connected accounts, I see you're earning about $${detectedIncome.toLocaleString()}/month`
        }
      };

    case ONBOARDING_STEPS.RISK_TOLERANCE:
      return {
        type: 'slider',
        data: {
          title: 'How comfortable are you with investment risk?',
          subtitle: 'Higher risk can mean higher returns, but also bigger losses',
          min: 1,
          max: 10,
          default: 5,
          labels: {
            1: 'Very Conservative',
            5: 'Balanced',
            10: 'Very Aggressive'
          },
          descriptions: {
            low: '1-3: Prefer stable, guaranteed returns',
            medium: '4-7: Balance of growth and stability',
            high: '8-10: Comfortable with market volatility'
          }
        }
      };

    case ONBOARDING_STEPS.GOALS_SELECTION:
      return {
        type: 'checkboxes',
        data: {
          title: 'What financial goals are important to you?',
          subtitle: 'Choose up to 5 goals - we\'ll tackle them in priority order',
          options: [
            { 
              id: 'emergency', 
              label: 'Emergency Fund', 
              icon: '🛡️', 
              description: '3-6 months of expenses for peace of mind',
              recommended: true
            },
            { 
              id: 'debt', 
              label: 'Pay Off Debt', 
              icon: '💳', 
              description: 'Eliminate credit cards, loans, etc.',
              recommended: progress.hasDebt
            },
            { 
              id: 'home', 
              label: 'Buy a Home', 
              icon: '🏠', 
              description: 'Save for down payment (typically 10-20%)'
            },
            { 
              id: 'retirement', 
              label: 'Retirement Planning', 
              icon: '🏖️', 
              description: 'Build long-term financial security',
              recommended: true
            },
            { 
              id: 'invest', 
              label: 'Build Wealth', 
              icon: '📈', 
              description: 'Grow money through smart investing'
            },
            { 
              id: 'vacation', 
              label: 'Dream Vacation', 
              icon: '✈️', 
              description: 'Save for that special trip'
            }
          ],
          minSelect: 1,
          maxSelect: 5,
          helpText: '💡 Tip: Start with 2-3 goals for best results'
        }
      };

    case ONBOARDING_STEPS.BUDGET_REVIEW:
      // Auto-generated budget based on income
      const income = progress.monthlyIncome || 5000;
      return {
        type: 'budgetReview',
        data: {
          income: income,
          categories: {
            housing: Math.round(income * 0.3),
            food: Math.round(income * 0.12),
            transportation: Math.round(income * 0.15),
            utilities: Math.round(income * 0.08),
            entertainment: Math.round(income * 0.05),
            savings: Math.round(income * 0.2),
            other: Math.round(income * 0.1)
          }
        }
      };

    case ONBOARDING_STEPS.DASHBOARD_PREVIEW:
      return {
        type: 'dashboardPreview',
        data: {
          netWorth: progress.netWorth || 0,
          monthlyIncome: progress.monthlyIncome || 0,
          monthlyExpenses: progress.monthlyExpenses || 0,
          savingsRate: progress.savingsRate || 0,
          goals: progress.goals || [],
          accounts: progress.accountsCount || 0
        }
      };

    default:
      return null;
  }
}
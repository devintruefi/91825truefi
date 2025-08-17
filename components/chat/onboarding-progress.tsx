"use client"

import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle } from 'lucide-react';
import { ONBOARDING_STEPS, STEP_NAMES, getProgressPercentage, getNextStep } from '@/lib/onboarding/onboarding-manager';

// Helper to get preview text for next step
function getNextStepPreview(currentStep: string): string {
  const nextStepMap: Record<string, string> = {
    [ONBOARDING_STEPS.MAIN_GOAL]: 'Your life stage',
    [ONBOARDING_STEPS.LIFE_STAGE]: 'Family size',
    [ONBOARDING_STEPS.DEPENDENTS]: 'Bank connection',
    [ONBOARDING_STEPS.BANK_CONNECTION]: 'Income verification',
    [ONBOARDING_STEPS.INCOME_CONFIRMATION]: 'Risk comfort',
    [ONBOARDING_STEPS.RISK_TOLERANCE]: 'Financial goals',
    [ONBOARDING_STEPS.GOALS_SELECTION]: 'Budget setup',
    [ONBOARDING_STEPS.BUDGET_REVIEW]: 'Dashboard preview',
    [ONBOARDING_STEPS.DASHBOARD_PREVIEW]: 'All done!'
  };
  return nextStepMap[currentStep] || '';
}

interface OnboardingProgressProps {
  currentStep: string;
  completedSteps: string[];
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  const progress = getProgressPercentage(currentStep as any);
  const steps = Object.values(ONBOARDING_STEPS).filter(s => s !== 'complete');
  
  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg mb-4">
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span className="font-semibold">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {steps.slice(0, 5).map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : 
                    isCurrent ? 'bg-blue-500 text-white animate-pulse' : 
                    'bg-gray-200 dark:bg-gray-700 text-gray-400'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className={`
                  text-[10px] mt-1 text-center max-w-[60px]
                  ${isCurrent ? 'text-blue-600 dark:text-blue-400 font-semibold' : 
                    'text-gray-500 dark:text-gray-400'}
                `}>
                  {STEP_NAMES[step].split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Current Step Name and What's Next */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            Current: {STEP_NAMES[currentStep as any]}
          </p>
          {progress < 100 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Next up: {getNextStepPreview(currentStep)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
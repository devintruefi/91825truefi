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
  const currentStepIndex = Math.max(0, steps.indexOf(currentStep)); // Ensure minimum 0
  const totalSteps = steps.length;
  
  // Calculate what information has been collected based on actual completed steps
  const collectedInfo = completedSteps.length;
  const remainingInfo = Math.max(0, totalSteps - collectedInfo - 1); // -1 for current step, ensure min 0
  
  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg mb-4">
      <div className="space-y-4">
        {/* Header with Step Count */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Step {currentStepIndex + 1} of {totalSteps}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Setting up your personalized financial profile
          </p>
        </div>
        
        {/* Progress Bar with Enhanced Visual */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Overall Progress</span>
            <span className="font-semibold">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
        
        {/* Information Collection Status */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">
                {collectedInfo} items collected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">
                Current step
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">
                {remainingInfo} remaining
              </span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Step Indicators */}
        <div className="flex justify-between items-center">
          {steps.slice(0, Math.min(6, totalSteps)).map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  transition-all duration-300 border-2
                  ${isCompleted ? 'bg-green-500 text-white border-green-500' : 
                    isCurrent ? 'bg-blue-500 text-white border-blue-500 animate-pulse' : 
                    'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <span className={`
                  text-[10px] mt-1 text-center max-w-[60px] leading-tight
                  ${isCurrent ? 'text-blue-600 dark:text-blue-400 font-semibold' : 
                    isCompleted ? 'text-green-600 dark:text-green-400' :
                    'text-gray-500 dark:text-gray-400'}
                `}>
                  {STEP_NAMES[step].split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Current Step Details */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            📍 {STEP_NAMES[currentStep as any]}
          </p>
          {progress < 100 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Coming next: {getNextStepPreview(currentStep)}
            </p>
          )}
        </div>
        
        {/* Privacy Reminder */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Your information is secure and never shared
          </p>
        </div>
      </div>
    </div>
  );
}
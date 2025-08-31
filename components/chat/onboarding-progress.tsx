"use client"

import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
import { 
  ORDERED_STEPS, 
  STEP_CONFIG, 
  calculateProgress,
  type StepId 
} from '@/lib/onboarding/canonical-steps';

interface OnboardingProgressProps {
  currentStep: string;
  completedSteps: string[];
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  // Use canonical progress calculation
  const progressInfo = calculateProgress(currentStep as StepId);
  const { currentIndex, total, percentage, nextLabel } = progressInfo;
  
  // Calculate what information has been collected based on actual completed steps
  const collectedInfo = completedSteps.length;
  const remainingInfo = Math.max(0, total - collectedInfo - 1); // -1 for current step
  
  // Get current step label
  const currentStepLabel = STEP_CONFIG[currentStep as StepId]?.label || currentStep;
  
  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg mb-4">
      <div className="space-y-4">
        {/* Header with Step Count - FIXED to show correct progress */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Step {currentIndex} of {total}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Setting up your personalized financial profile
          </p>
        </div>
        
        {/* Progress Bar with Correct Percentage */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Overall Progress</span>
            <span className="font-semibold">{percentage}% Complete</span>
          </div>
          <Progress value={percentage} className="h-3" />
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
        
        {/* Enhanced Step Indicators - Show first 6 steps */}
        <div className="flex justify-between items-center">
          {ORDERED_STEPS.slice(0, Math.min(6, total)).map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            const stepConfig = STEP_CONFIG[step];
            
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
                  {stepConfig.label.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Current Step Details with FIXED "Coming next" */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            📍 {currentStepLabel}
          </p>
          {nextLabel && percentage < 100 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Coming next: {nextLabel}
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
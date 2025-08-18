"use client"

import { motion } from 'framer-motion';
import { CheckCircle, Circle, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingPhase, OnboardingProgress } from '@/lib/onboarding/types';

interface OnboardingProgressSidebarProps {
  progress: OnboardingProgress;
  currentPhase: OnboardingPhase;
  currentQuestionIndex: number;
  totalQuestionsInPhase: number;
}

const phaseDetails: Record<OnboardingPhase, { title: string; icon: string; description: string }> = {
  'welcome': { 
    title: 'Getting Started', 
    icon: '👋', 
    description: 'Tell us your name and preferences' 
  },
  'quick-wins': { 
    title: 'Your Situation', 
    icon: '🎯', 
    description: 'Current life stage and goals' 
  },
  'financial-snapshot': { 
    title: 'Financial Overview', 
    icon: '📊', 
    description: 'Income, expenses, and accounts' 
  },
  'personalization': { 
    title: 'Personalize', 
    icon: '✨', 
    description: 'Your money personality and preferences' 
  },
  'goals-dreams': { 
    title: 'Goals & Dreams', 
    icon: '🌟', 
    description: 'Prioritize and timeline your goals' 
  },
  'complete': { 
    title: 'All Set!', 
    icon: '🎉', 
    description: 'Review and launch your dashboard' 
  }
};

export function OnboardingProgressSidebar({
  progress,
  currentPhase,
  currentQuestionIndex,
  totalQuestionsInPhase
}: OnboardingProgressSidebarProps) {
  const phaseOrder: OnboardingPhase[] = [
    'welcome', 'quick-wins', 'financial-snapshot', 
    'personalization', 'goals-dreams', 'complete'
  ];

  const getPhaseStatus = (phase: OnboardingPhase) => {
    if (progress.completedPhases.includes(phase)) return 'completed';
    if (phase === currentPhase) return 'current';
    return 'pending';
  };

  const getStepProgress = (phase: OnboardingPhase) => {
    if (phase !== currentPhase) return null;
    return {
      current: currentQuestionIndex + 1,
      total: totalQuestionsInPhase
    };
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r h-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Your Progress</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.completionPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm text-gray-500">{Math.round(progress.completionPercentage)}%</span>
        </div>
      </div>

      {/* Phase Steps */}
      <div className="space-y-3">
        {phaseOrder.map((phase, index) => {
          const status = getPhaseStatus(phase);
          const stepProgress = getStepProgress(phase);
          const details = phaseDetails[phase];
          
          // Skip certain phases for quick setup
          if (progress.answers.onboardingDepth === 'quick' && 
              (phase === 'personalization' || phase === 'goals-dreams')) {
            return null;
          }

          return (
            <motion.div
              key={phase}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex gap-3 p-3 rounded-lg transition-all",
                status === 'current' && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
                status === 'completed' && "opacity-90",
                status === 'pending' && "opacity-50"
              )}
            >
              {/* Step Number / Status Icon */}
              <div className="flex-shrink-0 mt-1">
                {status === 'completed' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </motion.div>
                ) : status === 'current' ? (
                  <div className="relative">
                    <Circle className="h-6 w-6 text-blue-500" />
                    <Loader2 className="h-6 w-6 text-blue-500 absolute inset-0 animate-spin" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600">
                    <span className="text-xs text-gray-500">{index + 1}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{details.icon}</span>
                  <h4 className={cn(
                    "font-medium",
                    status === 'current' && "text-blue-700 dark:text-blue-300"
                  )}>
                    {details.title}
                  </h4>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {details.description}
                </p>

                {/* Step Progress for Current Phase */}
                {stepProgress && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1">
                      {Array.from({ length: stepProgress.total }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1.5 w-6 rounded-full transition-colors",
                            i < stepProgress.current 
                              ? "bg-blue-500" 
                              : "bg-gray-300 dark:bg-gray-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      Step {stepProgress.current} of {stepProgress.total}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Collected Data Summary */}
      {progress.completedPhases.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-3">Information Collected</h4>
          <div className="space-y-2 text-xs">
            {progress.answers.firstName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{progress.answers.firstName}</span>
              </div>
            )}
            {progress.answers.lifeStage && (
              <div className="flex justify-between">
                <span className="text-gray-500">Life Stage:</span>
                <span className="font-medium capitalize">{progress.answers.lifeStage.replace('-', ' ')}</span>
              </div>
            )}
            {progress.answers.primaryGoals && (
              <div className="flex justify-between">
                <span className="text-gray-500">Goals Set:</span>
                <span className="font-medium">{progress.answers.primaryGoals.length} goals</span>
              </div>
            )}
            {progress.answers.annualIncome && (
              <div className="flex justify-between">
                <span className="text-gray-500">Income:</span>
                <span className="font-medium">✓ Added</span>
              </div>
            )}
            {progress.answers.plaidConnected && (
              <div className="flex justify-between">
                <span className="text-gray-500">Bank Accounts:</span>
                <span className="font-medium text-green-600">✓ Connected</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>💡 Tip:</strong> The more information you provide, the better I can personalize your financial insights!
        </p>
      </div>

      {/* Security Badge */}
      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
            Bank-level encryption • Your data is secure
          </p>
        </div>
      </div>
    </div>
  );
}
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { GuideOverlay } from './GuideOverlay'
import { useUser } from '@/contexts/user-context'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Play, X } from 'lucide-react'

interface OnboardingStatus {
  checklist: {
    connectAccounts: boolean
    reviewTransactions: boolean
    verifyAssetsLiabilities: boolean
    budget: boolean
    goals: boolean
    investments: boolean
    aboutMe: boolean
  }
  complete: boolean
  percent: number
}

interface StepDefinition {
  key: keyof OnboardingStatus['checklist']
  targetSelector: string
  title: string
  body: string
  primaryButtonText?: string
  requiresTabSwitch?: string
  onPrimary: (manager: GuidedOnboardingManagerRef) => void
  isComplete: (status: OnboardingStatus) => boolean
}

interface GuidedOnboardingManagerRef {
  switchTab: (tab: string) => void
  fetchStatus: () => Promise<void>
  setActiveTab: (tab: string) => void
}

// Centralized copy for i18n
const COPY = {
  steps: {
    connectAccounts: {
      title: "Let's connect your financial accounts",
      body: "We'll securely link your bank and investment accounts through Plaid. This allows TrueFi to automatically categorize transactions, track spending, and provide personalized insights.",
      primaryButtonText: "Connect accounts"
    },
    reviewTransactions: {
      title: "Review your transactions",
      body: "Your transactions have been imported. Take a moment to review them and fix any incorrect categories. When you're done reviewing, click 'I've done this' below.",
      primaryButtonText: "Go to transactions"
    },
    verifyAssetsLiabilities: {
      title: "Add assets & debts not synced from Plaid",
      body: "Add any assets (like real estate, vehicles) or debts (like personal loans) that weren't automatically imported. This gives you a complete net worth picture.",
      primaryButtonText: "Add assets & debts"
    },
    budget: {
      title: "Customize your budget",
      body: "We've created a baseline budget from your spending patterns. Review and adjust category amounts to match your goals. Don't forget to save your changes!",
      primaryButtonText: "Review budget"
    },
    goals: {
      title: "Set your first financial goal",
      body: "Whether it's saving for a vacation, paying off debt, or building an emergency fund - add at least one goal to help Penny provide personalized guidance.",
      primaryButtonText: "Add goal"
    },
    investments: {
      title: "Review your investment portfolio",
      body: "Check that all your investment holdings were imported correctly. You can add accounts manually or exclude certain accounts from tracking if needed.",
      primaryButtonText: "Review investments"
    },
    aboutMe: {
      title: "Complete your financial profile",
      body: "Tell us about your tax situation, risk tolerance, and preferences across 7 quick sections. This helps Penny provide truly personalized financial guidance.",
      primaryButtonText: "Complete profile"
    }
  },
  completion: {
    title: "Setup complete! 🎉",
    description: "Your financial profile is ready. Penny can now provide personalized guidance."
  },
  resumePill: {
    text: "Resume setup"
  }
}

const CANONICAL_STEPS: StepDefinition[] = [
  {
    key: 'connectAccounts',
    targetSelector: '#onb-connect-accounts-btn',
    title: COPY.steps.connectAccounts.title,
    body: COPY.steps.connectAccounts.body,
    primaryButtonText: COPY.steps.connectAccounts.primaryButtonText,
    onPrimary: (manager) => {
      const button = document.querySelector('#onb-connect-accounts-btn') as HTMLButtonElement
      if (button) {
        button.click()
      }
    },
    isComplete: (status) => status.checklist.connectAccounts
  },
  {
    key: 'reviewTransactions', 
    targetSelector: '#tab-transactions',
    title: COPY.steps.reviewTransactions.title,
    body: COPY.steps.reviewTransactions.body,
    primaryButtonText: COPY.steps.reviewTransactions.primaryButtonText,
    requiresTabSwitch: 'transactions',
    onPrimary: (manager) => {
      manager.switchTab('transactions')
      // After tab switch, try to focus first editable transaction
      setTimeout(() => {
        const editButton = document.querySelector('[data-onb="tx-category-edit"]') as HTMLButtonElement
        if (editButton) {
          editButton.focus()
        }
      }, 100)
    },
    isComplete: (status) => status.checklist.reviewTransactions
  },
  {
    key: 'verifyAssetsLiabilities',
    targetSelector: '#tab-assets',
    title: COPY.steps.verifyAssetsLiabilities.title,
    body: COPY.steps.verifyAssetsLiabilities.body,
    primaryButtonText: COPY.steps.verifyAssetsLiabilities.primaryButtonText,
    requiresTabSwitch: 'assets',
    onPrimary: (manager) => {
      manager.switchTab('assets')
      // Focus add asset button after tab switch
      setTimeout(() => {
        const addButton = document.querySelector('#onb-add-asset-btn') as HTMLButtonElement
        if (addButton) {
          addButton.focus()
        }
      }, 100)
    },
    isComplete: (status) => status.checklist.verifyAssetsLiabilities
  },
  {
    key: 'budget',
    targetSelector: '#tab-budget',
    title: COPY.steps.budget.title,
    body: COPY.steps.budget.body,
    primaryButtonText: COPY.steps.budget.primaryButtonText,
    requiresTabSwitch: 'budget',
    onPrimary: (manager) => {
      manager.switchTab('budget')
      setTimeout(() => {
        const saveButton = document.querySelector('#onb-budget-save-btn') as HTMLButtonElement
        if (saveButton) {
          saveButton.focus()
        }
      }, 100)
    },
    isComplete: (status) => status.checklist.budget
  },
  {
    key: 'goals',
    targetSelector: '#tab-goals', 
    title: COPY.steps.goals.title,
    body: COPY.steps.goals.body,
    primaryButtonText: COPY.steps.goals.primaryButtonText,
    requiresTabSwitch: 'goals',
    onPrimary: (manager) => {
      manager.switchTab('goals')
      setTimeout(() => {
        const addButton = document.querySelector('#onb-add-goal-btn') as HTMLButtonElement
        if (addButton) {
          addButton.focus()
        }
      }, 100)
    },
    isComplete: (status) => status.checklist.goals
  },
  {
    key: 'investments',
    targetSelector: '#tab-investments',
    title: COPY.steps.investments.title, 
    body: COPY.steps.investments.body,
    primaryButtonText: COPY.steps.investments.primaryButtonText,
    requiresTabSwitch: 'investments',
    onPrimary: (manager) => {
      manager.switchTab('investments')
    },
    isComplete: (status) => status.checklist.investments
  },
  {
    key: 'aboutMe',
    targetSelector: '#tab-about',
    title: COPY.steps.aboutMe.title,
    body: COPY.steps.aboutMe.body,
    primaryButtonText: COPY.steps.aboutMe.primaryButtonText,
    requiresTabSwitch: 'about',
    onPrimary: (manager) => {
      manager.switchTab('about')
      setTimeout(() => {
        const saveButton = document.querySelector('#onb-about-save-btn') as HTMLButtonElement
        if (saveButton) {
          saveButton.focus()
        }
      }, 100)
    },
    isComplete: (status) => status.checklist.aboutMe
  }
]

interface GuidedOnboardingManagerProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  fetchOnboardingStatus: () => Promise<void>
}

export function GuidedOnboardingManager({ 
  activeTab, 
  setActiveTab, 
  fetchOnboardingStatus 
}: GuidedOnboardingManagerProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [currentStepKey, setCurrentStepKey] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [showResumePill, setShowResumePill] = useState(false)
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set())

  // Check if guided onboarding is enabled
  const isEnabled = process.env.NEXT_PUBLIC_GUIDED_ONBOARDING === 'true'
  
  // Debug logging
  console.log('GuidedOnboardingManager Debug:', {
    isEnabled,
    environmentVariable: process.env.NEXT_PUBLIC_GUIDED_ONBOARDING,
    user: !!user,
    userId: user?.id,
    status,
    statusComplete: status?.complete
  })

  // Fetch status and determine current step
  const fetchStatus = useCallback(async () => {
    console.log('fetchStatus called:', { userId: user?.id, isEnabled })
    if (!user?.id || !isEnabled) return

    try {
      const response = await fetch(`/api/dashboard-onboarding/status?userId=${user.id}`)
      
      console.log('API Response status:', response.status)
      
      if (response.ok) {
        const newStatus = await response.json()
        console.log('Onboarding status received:', newStatus)
        setStatus(newStatus)
        
        // If complete, hide tour and show celebration if not already shown
        if (newStatus.complete) {
          setIsActive(false)
          setShowResumePill(false)
          
          if (!localStorage.getItem('onboarding_celebrated')) {
            localStorage.setItem('onboarding_celebrated', 'true')
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            })
            toast({
              title: COPY.completion.title,
              description: COPY.completion.description,
            })
          }
          return
        }

        // Find first incomplete step
        const firstIncomplete = CANONICAL_STEPS.find(step => !step.isComplete(newStatus))
        if (firstIncomplete) {
          // For new users or if saved step is already complete, always use first incomplete
          const savedStepKey = `onboarding.step.${user.id}` // User-specific key
          const savedStep = localStorage.getItem(savedStepKey)
          
          // Check if saved step is still valid and incomplete
          const savedStepObj = savedStep ? CANONICAL_STEPS.find(s => s.key === savedStep) : null
          const isSavedStepValid = savedStepObj && !savedStepObj.isComplete(newStatus)
          
          // Use saved step only if it's valid and incomplete, otherwise use first incomplete
          const stepToUse = isSavedStepValid ? savedStep : firstIncomplete.key
          setCurrentStepKey(stepToUse)
          localStorage.setItem(savedStepKey, stepToUse) // Always save current step
          
          console.log('Step selection:', {
            firstIncomplete: firstIncomplete.key,
            savedStep,
            isSavedStepValid,
            selectedStep: stepToUse,
            checklist: newStatus.checklist
          })
          
          // For new users (no completed steps), auto-start the tour
          // For returning users, check if we should continue where we left off
          const isNewUser = Object.values(newStatus.checklist).every(v => !v)
          const hasCompletedSomeSteps = Object.values(newStatus.checklist).some(v => v)
          
          if (isNewUser && !isActive) {
            // Auto-start tour for new users
            console.log('Auto-starting tour for new user')
            setIsActive(true)
            setShowResumePill(false)
          } else if (hasCompletedSomeSteps && !isActive) {
            // For users who have made progress, check if they just completed a step
            const justCompletedStep = savedStep && savedStepObj && savedStepObj.isComplete(newStatus)
            if (justCompletedStep) {
              // They just completed a step, auto-advance to next
              console.log('User completed step, auto-advancing...')
              setIsActive(true)
              setShowResumePill(false)
            } else {
              // Show resume pill for returning users
              setShowResumePill(true)
            }
          } else if (!isActive) {
            // Default: show resume pill
            setShowResumePill(true)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching onboarding status:', error)
    }
  }, [user, isEnabled, toast]) // Remove isActive from deps to prevent re-creation

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll for status changes when tour is active and waiting for account connection
  useEffect(() => {
    if (!isActive || !user?.id || !isEnabled) return
    if (currentStepKey !== 'connectAccounts') return // Only poll during account connection step

    // Poll every 5 seconds to detect external changes (like Plaid connection)
    const interval = setInterval(() => {
      console.log('Polling for account connection...')
      fetchStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [isActive, user, isEnabled, currentStepKey, fetchStatus])

  // Listen for custom events that signal data changes
  useEffect(() => {
    const handleOnboardingSync = () => {
      console.log('Onboarding sync event received')
      fetchStatus()
    }

    const handlePlaidSuccess = () => {
      console.log('Plaid success detected, refreshing status...')
      setTimeout(() => fetchStatus(), 1000) // Wait a bit for backend to process
    }

    window.addEventListener('onboarding-sync', handleOnboardingSync)
    window.addEventListener('plaid-success', handlePlaidSuccess)

    return () => {
      window.removeEventListener('onboarding-sync', handleOnboardingSync)
      window.removeEventListener('plaid-success', handlePlaidSuccess)
    }
  }, [fetchStatus])

  // Create manager reference for step actions
  const managerRef: GuidedOnboardingManagerRef = {
    switchTab: setActiveTab,
    fetchStatus,
    setActiveTab
  }

  const currentStep = currentStepKey ? CANONICAL_STEPS.find(s => s.key === currentStepKey) : null
  const currentStepIndex = currentStep ? CANONICAL_STEPS.indexOf(currentStep) : -1

  const handlePrimary = () => {
    if (currentStep) {
      currentStep.onPrimary(managerRef)
    }
  }

  const handleSkip = () => {
    if (currentStepKey) {
      setSkippedSteps(prev => new Set([...prev, currentStepKey]))
      advanceToNextStep()
    }
  }

  const handleDone = async () => {
    // For certain steps that require manual confirmation, mark them complete
    if (currentStepKey && ['reviewTransactions', 'verifyAssetsLiabilities', 'budget', 'goals', 'investments', 'aboutMe'].includes(currentStepKey)) {
      try {
        console.log('Marking step complete:', {
          step: currentStepKey,
          userId: user?.id,
          userObject: user
        })
        
        const markResponse = await fetch('/api/onboarding/mark-step-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            step: currentStepKey,
            userId: user?.id 
          })
        })
        
        if (markResponse.ok) {
          const responseData = await markResponse.json()
          console.log(`Step ${currentStepKey} marked as complete, response:`, responseData)
          
          // Immediately update local status to reflect completion
          if (status) {
            const updatedStatus = {
              ...status,
              checklist: {
                ...status.checklist,
                [currentStepKey]: true
              }
            }
            setStatus(updatedStatus)
            
            // Advance to next step immediately
            advanceToNextStep()
            
            // Add a small delay before fetching fresh status to ensure DB write completes
            setTimeout(() => {
              fetchStatus()
            }, 500)
          }
          return
        } else {
          const errorData = await markResponse.json()
          console.error('Failed to mark step complete:', errorData)
        }
      } catch (error) {
        console.error('Error marking step complete:', error)
      }
    }
    
    // Fallback: Re-fetch status to check if actually complete
    await fetchStatus()
    
    // Give a moment for state to update after fetch
    setTimeout(async () => {
      // Fetch again to get fresh status
      const response = await fetch(`/api/dashboard-onboarding/status?userId=${user?.id}`)
      
      if (response.ok) {
        const freshStatus = await response.json()
        
        if (currentStep && currentStep.isComplete(freshStatus)) {
          // Step is complete, advance to next
          setStatus(freshStatus)
          advanceToNextStep()
        } else {
          toast({
            title: "Please complete the step",
            description: currentStepKey === 'reviewTransactions' 
              ? "Edit at least one transaction category to mark this step complete."
              : "Complete the required action for this step, then click 'I've done this'.",
            variant: "default"
          })
        }
      }
    }, 500)
  }

  const advanceToNextStep = () => {
    if (!currentStep || !status || !user) return
    
    const nextIncompleteStep = CANONICAL_STEPS
      .slice(currentStepIndex + 1)
      .find(step => !step.isComplete(status))
    
    const savedStepKey = `onboarding.step.${user.id}` // User-specific key
    
    if (nextIncompleteStep) {
      setCurrentStepKey(nextIncompleteStep.key)
      localStorage.setItem(savedStepKey, nextIncompleteStep.key)
      
      // Keep the tour active to show the next step
      setIsActive(true)
      setShowResumePill(false)
      
      // If the next step requires a tab switch, do it
      if (nextIncompleteStep.requiresTabSwitch) {
        setTimeout(() => {
          setActiveTab(nextIncompleteStep.requiresTabSwitch)
        }, 100)
      }
    } else {
      // All steps complete
      setIsActive(false)
      setShowResumePill(false)
      localStorage.removeItem(savedStepKey)
      
      // Show completion celebration
      if (!localStorage.getItem('onboarding_celebrated')) {
        localStorage.setItem('onboarding_celebrated', 'true')
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
        toast({
          title: COPY.completion.title,
          description: COPY.completion.description,
        })
      }
    }
  }

  const handleClose = () => {
    setIsActive(false)
    setShowResumePill(true)
  }

  const handleResume = () => {
    setIsActive(true)
    setShowResumePill(false)
  }

  // Don't render if not enabled, no user, or onboarding complete
  console.log('Render conditions:', {
    isEnabled,
    hasUser: !!user,
    hasStatus: !!status,
    statusComplete: status?.complete,
    shouldRender: isEnabled && user && status && !status.complete
  })
  
  if (!isEnabled || !user || !status || status.complete) return null

  return (
    <>
      {/* Main guide overlay */}
      {isActive && currentStep && (
        <GuideOverlay
          targetSelector={currentStep.targetSelector}
          title={currentStep.title}
          body={currentStep.body}
          primaryButtonText={currentStep.primaryButtonText}
          onPrimary={handlePrimary}
          onSkip={handleSkip}
          onDone={handleDone}
          onClose={handleClose}
          isVisible={true}
          stepNumber={currentStepIndex + 1}
          totalSteps={CANONICAL_STEPS.length}
        />
      )}

      {/* Resume pill */}
      {showResumePill && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleResume}
            className="shadow-lg"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            {COPY.resumePill.text}
          </Button>
        </div>
      )}
    </>
  )
}

// Export the hook for external status updates
export function useGuidedOnboardingSync() {
  const { user } = useUser()
  
  return useCallback(async () => {
    if (!user?.id) return
    
    // Trigger a custom event to sync the manager
    window.dispatchEvent(new CustomEvent('onboarding-sync'))
  }, [user])
}
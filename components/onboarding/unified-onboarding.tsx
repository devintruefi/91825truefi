'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlaidLink } from 'react-plaid-link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  OnboardingStateManager, 
  getOnboardingStateManager 
} from '@/lib/onboarding/onboarding-state-manager';
import {
  UnifiedOnboardingStep,
  UNIFIED_ONBOARDING_STEPS,
  getStepMessage,
  STEP_CONFIG
} from '@/lib/onboarding/unified-onboarding-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, CreditCard, Target, Users, DollarSign, Shield, Check } from 'lucide-react';

interface UnifiedOnboardingProps {
  userId?: string;
  onComplete?: () => void;
}

export function UnifiedOnboarding({ userId, onComplete }: UnifiedOnboardingProps) {
  const router = useRouter();
  const [stateManager, setStateManager] = useState<OnboardingStateManager | null>(null);
  const [currentStep, setCurrentStep] = useState<UnifiedOnboardingStep>(UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [plaidToken, setPlaidToken] = useState<string | null>(null);
  
  // Form state for current step
  const [formData, setFormData] = useState<any>({});
  
  // Initialize state manager
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        setLoading(true);
        const manager = getOnboardingStateManager(userId);
        await manager.initialize(userId);
        
        const state = manager.getState();
        if (state) {
          setCurrentStep(state.currentStep);
          setFormData(state.responses || {});
          const progressInfo = manager.getProgress();
          setProgress(progressInfo.percentage);
        }
        
        setStateManager(manager);
      } catch (err) {
        console.error('Failed to initialize onboarding:', err);
        setError('Failed to load onboarding. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeOnboarding();
  }, [userId]);
  
  // Create Plaid link token
  const createPlaidLinkToken = useCallback(async () => {
    try {
      const response = await fetch('/api/plaid/create_link_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({ userId: userId || stateManager?.getState()?.userId })
      });
      
      if (!response.ok) throw new Error('Failed to create Plaid token');
      
      const data = await response.json();
      setPlaidToken(data.link_token);
    } catch (err) {
      console.error('Failed to create Plaid token:', err);
      setError('Unable to connect to banking service. You can skip this step for now.');
    }
  }, [userId, stateManager]);
  
  // Handle Plaid success
  const handlePlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    if (!stateManager) return;
    
    try {
      setSaving(true);
      
      // Exchange public token for access token
      const response = await fetch('/api/plaid/exchange_public_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({
          public_token: publicToken,
          userId: userId || stateManager.getState()?.userId
        })
      });
      
      if (!response.ok) throw new Error('Failed to exchange token');
      
      const data = await response.json();
      
      // Update state with Plaid connection
      await stateManager.updatePlaidConnection({
        itemId: data.item_id,
        accessToken: data.access_token,
        accounts: metadata.accounts.map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
          balance: acc.balances.current || 0
        })),
        institution: {
          id: metadata.institution.institution_id,
          name: metadata.institution.name
        },
        connectedAt: new Date()
      });
      
      // Analyze connected accounts for income
      await analyzeConnectedAccounts(data.access_token);
      
      // Move to next step
      await handleNextStep();
      
    } catch (err) {
      console.error('Failed to process Plaid connection:', err);
      setError('Failed to connect accounts. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [stateManager, userId]);
  
  // Analyze connected accounts
  const analyzeConnectedAccounts = async (accessToken: string) => {
    try {
      const response = await fetch('/api/onboarding/analyze-plaid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({ access_token: accessToken })
      });
      
      if (response.ok) {
        const analysis = await response.json();
        if (analysis.estimatedMonthlyIncome) {
          setFormData((prev: any) => ({
            ...prev,
            monthlyIncome: analysis.estimatedMonthlyIncome,
            monthlyExpenses: analysis.estimatedMonthlyExpenses || prev.monthlyExpenses
          }));
        }
      }
    } catch (err) {
      console.error('Failed to analyze accounts:', err);
    }
  };
  
  // Handle moving to next step
  const handleNextStep = async () => {
    if (!stateManager) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate current step
      const stepConfig = STEP_CONFIG[currentStep];
      if (!stepConfig.validation(formData)) {
        setError('Please complete all required fields');
        return;
      }
      
      // Save current step responses
      await stateManager.updateResponses(formData);
      
      // Complete current step and get next
      const nextStep = await stateManager.completeStep(currentStep);
      
      if (nextStep) {
        setCurrentStep(nextStep);
        const progressInfo = stateManager.getProgress();
        setProgress(progressInfo.percentage);
      } else {
        // Onboarding complete
        await handleComplete();
      }
      
    } catch (err: any) {
      console.error('Failed to proceed:', err);
      setError(err.message || 'Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle going back
  const handlePreviousStep = async () => {
    if (!stateManager) return;
    
    try {
      const previousStep = await stateManager.goToPreviousStep();
      if (previousStep) {
        setCurrentStep(previousStep);
        const progressInfo = stateManager.getProgress();
        setProgress(progressInfo.percentage);
      }
    } catch (err) {
      console.error('Failed to go back:', err);
    }
  };
  
  // Handle skipping current step
  const handleSkipStep = async () => {
    if (!stateManager) return;
    
    try {
      setSaving(true);
      const nextStep = await stateManager.skipStep('User chose to skip');
      if (nextStep) {
        setCurrentStep(nextStep);
        const progressInfo = stateManager.getProgress();
        setProgress(progressInfo.percentage);
      }
    } catch (err: any) {
      setError(err.message || 'This step cannot be skipped');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle onboarding completion
  const handleComplete = async () => {
    if (!stateManager) return;
    
    try {
      setSaving(true);
      
      // Generate dashboard
      const response = await fetch('/api/onboarding/generate-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({
          userId: userId || stateManager.getState()?.userId,
          onboardingData: stateManager.getState()
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate dashboard');
      
      // Clear onboarding state
      await stateManager.clearState();
      
      // Call completion callback or redirect
      if (onComplete) {
        onComplete();
      } else {
        router.push('/dashboard');
      }
      
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS:
        return <ConnectAccountsStep 
          formData={formData}
          setFormData={setFormData}
          plaidToken={plaidToken}
          onPlaidSuccess={handlePlaidSuccess}
          onCreateToken={createPlaidLinkToken}
          onSkip={handleSkipStep}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.MAIN_GOAL:
        return <MainGoalStep 
          formData={formData}
          setFormData={setFormData}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.LIFE_STAGE:
        return <LifeStageStep 
          formData={formData}
          setFormData={setFormData}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.FAMILY_CONTEXT:
        return <FamilyContextStep 
          formData={formData}
          setFormData={setFormData}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.INCOME_VERIFICATION:
        return <IncomeVerificationStep 
          formData={formData}
          setFormData={setFormData}
          hasConnectedAccounts={formData.hasConnectedAccounts}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.REVIEW_CONFIRM:
        return <ReviewConfirmStep 
          formData={formData}
          setFormData={setFormData}
        />;
        
      case UNIFIED_ONBOARDING_STEPS.COMPLETE:
        return <CompleteStep />;
        
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const stepConfig = STEP_CONFIG[currentStep];
  const canGoBack = currentStep !== UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS;
  const canSkip = stepConfig?.canSkip || false;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {Object.values(UNIFIED_ONBOARDING_STEPS).indexOf(currentStep) + 1} of 6</span>
            <span className="text-sm font-medium">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Step card */}
        <Card>
          <CardHeader>
            <CardTitle>{stepConfig?.title}</CardTitle>
            <CardDescription>{stepConfig?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePreviousStep}
            disabled={!canGoBack || saving}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            {canSkip && (
              <Button
                variant="ghost"
                onClick={handleSkipStep}
                disabled={saving}
              >
                Skip for now
              </Button>
            )}
            
            <Button
              onClick={handleNextStep}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === UNIFIED_ONBOARDING_STEPS.REVIEW_CONFIRM ? 'Complete Setup' : 'Continue'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components

function ConnectAccountsStep({ formData, setFormData, plaidToken, onPlaidSuccess, onCreateToken, onSkip }: any) {
  useEffect(() => {
    if (!plaidToken) {
      onCreateToken();
    }
  }, [plaidToken, onCreateToken]);
  
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <CreditCard className="h-16 w-16 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect Your Financial Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Securely link your bank accounts, credit cards, and investments for a complete financial picture
        </p>
      </div>
      
      {plaidToken ? (
        <PlaidLink
          token={plaidToken}
          onSuccess={onPlaidSuccess}
          onExit={() => console.log('Plaid exit')}
        >
          <Button className="w-full" size="lg">
            <Shield className="mr-2 h-5 w-5" />
            Connect Accounts Securely
          </Button>
        </PlaidLink>
      ) : (
        <Button className="w-full" size="lg" disabled>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading Banking Service...
        </Button>
      )}
      
      <div className="text-center">
        <Button variant="link" onClick={onSkip} className="text-sm">
          I'll connect my accounts later
        </Button>
      </div>
      
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your data is encrypted and secure. We use bank-level security and never store your login credentials.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function MainGoalStep({ formData, setFormData }: any) {
  const goals = [
    { value: 'build_wealth', label: 'Build Wealth', icon: '💰' },
    { value: 'reduce_debt', label: 'Reduce Debt', icon: '🎯' },
    { value: 'save_home', label: 'Save for a Home', icon: '🏠' },
    { value: 'retirement', label: 'Plan for Retirement', icon: '🏖️' },
    { value: 'emergency_fund', label: 'Build Emergency Fund', icon: '🛡️' },
    { value: 'other', label: 'Something Else', icon: '✨' }
  ];
  
  return (
    <div className="space-y-6">
      <RadioGroup
        value={formData.mainGoal || ''}
        onValueChange={(value) => setFormData({ ...formData, mainGoal: value })}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.value}>
              <RadioGroupItem
                value={goal.value}
                id={goal.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={goal.value}
                className="flex items-center justify-between rounded-lg border-2 border-muted bg-white p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{goal.icon}</span>
                  <span className="font-medium">{goal.label}</span>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
      
      {formData.mainGoal === 'other' && (
        <div>
          <Label htmlFor="customGoal">Tell us more about your goal</Label>
          <Input
            id="customGoal"
            value={formData.customGoal || ''}
            onChange={(e) => setFormData({ ...formData, customGoal: e.target.value })}
            placeholder="Describe your financial goal..."
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}

function LifeStageStep({ formData, setFormData }: any) {
  const stages = [
    { value: 'student', label: 'Student', description: 'In school or recent graduate' },
    { value: 'early_career', label: 'Early Career', description: 'Starting my professional journey' },
    { value: 'established', label: 'Established', description: 'Growing in my career' },
    { value: 'family', label: 'Family Focused', description: 'Raising a family' },
    { value: 'pre_retirement', label: 'Pre-Retirement', description: 'Planning for retirement' },
    { value: 'retired', label: 'Retired', description: 'Enjoying retirement' }
  ];
  
  return (
    <div className="space-y-6">
      <RadioGroup
        value={formData.lifeStage || ''}
        onValueChange={(value) => setFormData({ ...formData, lifeStage: value })}
      >
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.value}>
              <RadioGroupItem
                value={stage.value}
                id={stage.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={stage.value}
                className="flex flex-col rounded-lg border-2 border-muted bg-white p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="font-medium">{stage.label}</span>
                <span className="text-sm text-muted-foreground mt-1">{stage.description}</span>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

function FamilyContextStep({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="maritalStatus">Marital Status</Label>
        <Select
          value={formData.maritalStatus || ''}
          onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
        >
          <SelectTrigger id="maritalStatus" className="mt-2">
            <SelectValue placeholder="Select your marital status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="married">Married</SelectItem>
            <SelectItem value="partnered">Partnered</SelectItem>
            <SelectItem value="divorced">Divorced</SelectItem>
            <SelectItem value="widowed">Widowed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="dependents">Number of Dependents</Label>
        <Select
          value={String(formData.dependents || 0)}
          onValueChange={(value) => setFormData({ ...formData, dependents: parseInt(value) })}
        >
          <SelectTrigger id="dependents" className="mt-2">
            <SelectValue placeholder="Select number of dependents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="5">5 or more</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function IncomeVerificationStep({ formData, setFormData, hasConnectedAccounts }: any) {
  return (
    <div className="space-y-6">
      {hasConnectedAccounts && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            We've analyzed your connected accounts to estimate your income. Please verify these amounts.
          </AlertDescription>
        </Alert>
      )}
      
      <div>
        <Label htmlFor="monthlyIncome">Monthly Income (after tax)</Label>
        <div className="relative mt-2">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="monthlyIncome"
            type="number"
            value={formData.monthlyIncome || ''}
            onChange={(e) => setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="pl-9"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="monthlyExpenses">Estimated Monthly Expenses</Label>
        <div className="relative mt-2">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="monthlyExpenses"
            type="number"
            value={formData.monthlyExpenses || ''}
            onChange={(e) => setFormData({ ...formData, monthlyExpenses: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Include rent, food, transportation, and other regular expenses
        </p>
      </div>
    </div>
  );
}

function ReviewConfirmStep({ formData, setFormData }: any) {
  const goalLabels: Record<string, string> = {
    build_wealth: 'Build Wealth',
    reduce_debt: 'Reduce Debt',
    save_home: 'Save for a Home',
    retirement: 'Plan for Retirement',
    emergency_fund: 'Build Emergency Fund',
    other: formData.customGoal || 'Custom Goal'
  };
  
  const lifeStageLabels: Record<string, string> = {
    student: 'Student',
    early_career: 'Early Career',
    established: 'Established',
    family: 'Family Focused',
    pre_retirement: 'Pre-Retirement',
    retired: 'Retired'
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold">Your Information Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Main Goal:</span>
            <p className="font-medium">{goalLabels[formData.mainGoal] || 'Not specified'}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Life Stage:</span>
            <p className="font-medium">{lifeStageLabels[formData.lifeStage] || 'Not specified'}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Marital Status:</span>
            <p className="font-medium capitalize">{formData.maritalStatus || 'Not specified'}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Dependents:</span>
            <p className="font-medium">{formData.dependents || 0}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Monthly Income:</span>
            <p className="font-medium">${formData.monthlyIncome?.toLocaleString() || 0}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Monthly Expenses:</span>
            <p className="font-medium">${formData.monthlyExpenses?.toLocaleString() || 0}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Accounts Connected:</span>
            <p className="font-medium">{formData.hasConnectedAccounts ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="confirmedData"
            checked={formData.confirmedData || false}
            onCheckedChange={(checked) => setFormData({ ...formData, confirmedData: checked })}
          />
          <Label htmlFor="confirmedData" className="text-sm font-normal">
            I confirm that the information above is accurate
          </Label>
        </div>
        
        <div className="flex items-start space-x-2">
          <Checkbox
            id="consentToAnalysis"
            checked={formData.consentToAnalysis || false}
            onCheckedChange={(checked) => setFormData({ ...formData, consentToAnalysis: checked })}
          />
          <Label htmlFor="consentToAnalysis" className="text-sm font-normal">
            I consent to TrueFi analyzing my financial data to provide personalized insights and recommendations
          </Label>
        </div>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="text-center py-12">
      <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
      <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
      <p className="text-muted-foreground mb-8">
        Your personalized financial dashboard is being prepared...
      </p>
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
    </div>
  );
}
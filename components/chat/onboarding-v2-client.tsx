"use client"

import { useState, useEffect, useCallback } from 'react';
import { OnboardingComponents } from './onboarding-components';

interface OnboardingV2ClientProps {
  userId: string;
  token: string;
  onComplete?: () => void;
}

interface OnboardingPayload {
  currentStep: string;
  stepInstance: {
    stepId: string;
    instanceId: string;
    nonce: string;
    createdAt: number;
  };
  stepConfig: {
    label: string;
    component: string;
  };
  component: any;
  progress: {
    orderedSteps: string[];
    completed: string[];
    current: string;
    remainingCount: number;
    itemsCollected: number;
    percentComplete: number;
    nextStep: string | null;
    nextLabel: string | null;
  };
  completedSteps: string[];
  sessionId: string;
}

export function OnboardingV2Client({ userId, token, onComplete }: OnboardingV2ClientProps) {
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch current onboarding state
  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/onboarding/v2', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch onboarding state: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched onboarding state:', data);
      setPayload(data);
    } catch (err) {
      console.error('Error fetching onboarding state:', err);
      setError('Failed to load onboarding. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Resync with server state
  const resync = useCallback(async () => {
    try {
      console.log('Resyncing with server...');
      
      const response = await fetch('/api/onboarding/v2/resync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Resync failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resync successful:', data);
      setPayload(data);
      setError(null);
    } catch (err) {
      console.error('Resync error:', err);
      setError('Failed to sync with server. Please refresh the page.');
    }
  }, [token]);

  // Submit step response
  const submitStep = useCallback(async (value: any) => {
    if (!payload || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const body = {
        stepId: payload.stepInstance.stepId,
        instanceId: payload.stepInstance.instanceId,
        nonce: payload.stepInstance.nonce,
        payload: value
      };

      console.log('Submitting step:', body);

      const response = await fetch('/api/onboarding/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.status === 409) {
        // OUT_OF_SYNC - immediately resync
        console.warn('Out of sync detected, resyncing...', data);
        await resync();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || `Submit failed: ${response.status}`);
      }

      console.log('Step submitted successfully:', data);
      setPayload(data);

      // Check if onboarding is complete
      if (data.currentStep === 'wrap_up' && data.completedSteps.includes('wrap_up')) {
        onComplete?.();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [payload, token, resync, onComplete, submitting]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render error state with retry
  if (error && !payload) {
    return (
      <div className="rounded-xl border p-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
        <p className="text-sm text-red-800 dark:text-red-200 mb-3">{error}</p>
        <button
          onClick={fetchState}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!payload) return null;

  // Get the component renderer
  const ComponentRenderer = OnboardingComponents[payload.component?.type as keyof typeof OnboardingComponents];

  if (!ComponentRenderer) {
    // Fallback for unsupported component types
    return (
      <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
          Unsupported component type: {payload.component?.type}
        </p>
        <button
          onClick={resync}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          Resync
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Progress Header */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {payload.stepConfig.label} ({payload.progress.itemsCollected} items collected)
          </span>
          <span className="text-sm text-gray-500">
            {payload.progress.percentComplete}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${payload.progress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Error banner if present */}
      {error && (
        <div className="rounded-lg border p-3 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Component */}
      <ComponentRenderer
        data={{
          ...payload.component,
          question: payload.component?.question || `Complete ${payload.stepConfig.label}`
        }}
        onComplete={submitStep}
        onSkip={() => submitStep({ skipped: true })}
        disabled={submitting}
      />

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 overflow-x-auto">
            {JSON.stringify({ 
              step: payload.currentStep,
              instance: payload.stepInstance.instanceId,
              completed: payload.completedSteps 
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
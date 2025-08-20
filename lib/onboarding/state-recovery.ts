// State recovery system for onboarding with localStorage and database sync
import { OnboardingStep } from './onboarding-manager';

const STORAGE_KEY = 'truefi_onboarding_state';
const STATE_HISTORY_KEY = 'truefi_onboarding_history';
const MAX_HISTORY = 5;
const STATE_EXPIRY_HOURS = 24;

export interface OnboardingState {
  userId?: string;
  currentStep: OnboardingStep | string;
  responses: Record<string, any>;
  timestamp: number;
  sessionId: string;
  progress: {
    hasConnectedAccounts?: boolean;
    plaidData?: any;
    mainGoal?: string;
    lifeStage?: string;
    dependents?: number;
    riskTolerance?: number;
    goals?: any[];
    budget?: any;
  };
}

export interface StateHistory {
  states: OnboardingState[];
  lastSave: number;
}

// Generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if state is expired
function isStateExpired(timestamp: number): boolean {
  const expiryTime = STATE_EXPIRY_HOURS * 60 * 60 * 1000;
  return Date.now() - timestamp > expiryTime;
}

// Save state to localStorage with history
export function saveOnboardingState(state: OnboardingState): boolean {
  try {
    // Update timestamp
    state.timestamp = Date.now();
    
    // Save current state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Update history
    const historyStr = localStorage.getItem(STATE_HISTORY_KEY);
    const history: StateHistory = historyStr ? JSON.parse(historyStr) : { states: [], lastSave: 0 };
    
    // Add to history (keep only last MAX_HISTORY states)
    history.states.unshift(state);
    if (history.states.length > MAX_HISTORY) {
      history.states = history.states.slice(0, MAX_HISTORY);
    }
    history.lastSave = Date.now();
    
    localStorage.setItem(STATE_HISTORY_KEY, JSON.stringify(history));
    
    return true;
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
    return false;
  }
}

// Retrieve state from localStorage
export function getOnboardingState(): OnboardingState | null {
  try {
    const stateStr = localStorage.getItem(STORAGE_KEY);
    if (!stateStr) return null;
    
    const state: OnboardingState = JSON.parse(stateStr);
    
    // Check if state is expired
    if (isStateExpired(state.timestamp)) {
      clearOnboardingState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to retrieve onboarding state:', error);
    return null;
  }
}

// Get previous state from history (for rollback)
export function getPreviousState(stepsBack: number = 1): OnboardingState | null {
  try {
    const historyStr = localStorage.getItem(STATE_HISTORY_KEY);
    if (!historyStr) return null;
    
    const history: StateHistory = JSON.parse(historyStr);
    
    if (history.states.length > stepsBack) {
      return history.states[stepsBack];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to retrieve previous state:', error);
    return null;
  }
}

// Clear all onboarding state
export function clearOnboardingState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATE_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear onboarding state:', error);
  }
}

// Sync state to database
export async function syncStateToDatabase(state: OnboardingState, token?: string): Promise<boolean> {
  try {
    if (!state.userId && !token) {
      console.warn('No userId or token available for sync');
      return false;
    }
    
    const response = await fetch('/api/onboarding/save-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        userId: state.userId,
        currentStep: state.currentStep,
        responses: state.responses,
        progress: state.progress,
        sessionId: state.sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to sync state to database:', error);
    return false;
  }
}

// Recover state from database
export async function recoverStateFromDatabase(userId: string, token?: string): Promise<OnboardingState | null> {
  try {
    const response = await fetch(`/api/onboarding/progress?userId=${userId}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error(`Recovery failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.progress) {
      const recoveredState: OnboardingState = {
        userId,
        currentStep: data.progress.current_step || 'main_goal',
        responses: data.responses || {},
        timestamp: Date.now(),
        sessionId: generateSessionId(),
        progress: data.progress || {}
      };
      
      // Save recovered state to localStorage
      saveOnboardingState(recoveredState);
      
      return recoveredState;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to recover state from database:', error);
    return null;
  }
}

// Retry mechanism for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  console.error('Operation failed after all retries:', lastError);
  return null;
}

// Create or restore onboarding session
export async function initializeOnboardingSession(userId?: string, token?: string): Promise<OnboardingState> {
  // Try to get existing state from localStorage
  let state = getOnboardingState();
  
  // If no local state and we have userId, try to recover from database
  if (!state && userId) {
    state = await recoverStateFromDatabase(userId, token);
  }
  
  // If still no state, create new session
  if (!state) {
    state = {
      userId,
      currentStep: 'main_goal',
      responses: {},
      timestamp: Date.now(),
      sessionId: generateSessionId(),
      progress: {}
    };
    saveOnboardingState(state);
  }
  
  return state;
}

// Export state for debugging
export function exportStateForDebug(): string {
  const state = getOnboardingState();
  const history = localStorage.getItem(STATE_HISTORY_KEY);
  
  return JSON.stringify({
    currentState: state,
    history: history ? JSON.parse(history) : null,
    timestamp: new Date().toISOString()
  }, null, 2);
}
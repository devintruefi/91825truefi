// Centralized state management for onboarding
// Handles persistence, recovery, and synchronization

import { 
  OnboardingState, 
  OnboardingResponses, 
  UnifiedOnboardingStep,
  UNIFIED_ONBOARDING_STEPS,
  PlaidConnectionData
} from './unified-onboarding-flow';

const STATE_KEY = 'truefi_onboarding_state_v2';
const BACKUP_KEY = 'truefi_onboarding_backup_v2';
const STATE_VERSION = '2.0';

export class OnboardingStateManager {
  private state: OnboardingState | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  
  constructor(private userId?: string) {
    this.loadState();
  }
  
  // Initialize or recover state
  async initialize(userId?: string): Promise<OnboardingState> {
    this.userId = userId || this.userId;
    
    // Try to recover from localStorage first
    let recoveredState = this.loadFromLocalStorage();
    
    // If no local state and we have userId, try database recovery
    if (!recoveredState && this.userId) {
      recoveredState = await this.recoverFromDatabase();
    }
    
    // If still no state, create new
    if (!recoveredState) {
      this.state = this.createNewState();
    } else {
      this.state = recoveredState;
      // Update userId if provided
      if (this.userId && this.state.userId !== this.userId) {
        this.state.userId = this.userId;
      }
    }
    
    // Save initial state
    this.saveState();
    
    return this.state;
  }
  
  // Create new onboarding state
  private createNewState(): OnboardingState {
    return {
      userId: this.userId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentStep: UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS,
      completedSteps: [],
      responses: {},
      isComplete: false,
      sessionId: this.generateSessionId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // Get current state
  getState(): OnboardingState | null {
    return this.state;
  }
  
  // Update responses for current step
  async updateResponses(responses: Partial<OnboardingResponses>): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    
    // Merge responses
    this.state.responses = {
      ...this.state.responses,
      ...responses
    };
    
    this.state.updatedAt = new Date();
    
    // Save immediately
    await this.saveState();
  }
  
  // Update Plaid connection data
  async updatePlaidConnection(plaidData: PlaidConnectionData): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    
    this.state.plaidConnection = plaidData;
    this.state.responses.hasConnectedAccounts = true;
    this.state.responses.plaidAccountIds = plaidData.accounts.map(a => a.id);
    
    // Calculate income from connected accounts if possible
    const incomeAccounts = plaidData.accounts.filter(a => 
      a.type === 'depository' || a.subtype?.includes('checking')
    );
    
    if (incomeAccounts.length > 0 && !this.state.responses.monthlyIncome) {
      // This would need more sophisticated income detection
      // For now, just mark that accounts are connected
      this.state.responses.hasConnectedAccounts = true;
    }
    
    this.state.updatedAt = new Date();
    await this.saveState();
  }
  
  // Move to next step
  async completeStep(step: UnifiedOnboardingStep): Promise<UnifiedOnboardingStep | null> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    
    // Add to completed steps if not already there
    if (!this.state.completedSteps.includes(step)) {
      this.state.completedSteps.push(step);
    }
    
    // Determine next step
    const { getNextStep } = await import('./unified-onboarding-flow');
    const nextStep = getNextStep(step, this.state.responses, this.state.completedSteps);
    
    if (nextStep) {
      this.state.currentStep = nextStep;
    } else {
      // Onboarding complete
      this.state.isComplete = true;
      this.state.currentStep = UNIFIED_ONBOARDING_STEPS.COMPLETE;
    }
    
    this.state.updatedAt = new Date();
    await this.saveState();
    
    // Sync to database
    await this.syncToDatabase();
    
    return nextStep;
  }
  
  // Go back to previous step
  async goToPreviousStep(): Promise<UnifiedOnboardingStep | null> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    
    const { getPreviousStep } = await import('./unified-onboarding-flow');
    const previousStep = getPreviousStep(this.state.currentStep, this.state.completedSteps);
    
    if (previousStep) {
      this.state.currentStep = previousStep;
      this.state.updatedAt = new Date();
      await this.saveState();
    }
    
    return previousStep;
  }
  
  // Skip current step (if allowed)
  async skipStep(reason?: string): Promise<UnifiedOnboardingStep | null> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    
    const { canSkipStep } = await import('./unified-onboarding-flow');
    
    if (!canSkipStep(this.state.currentStep, this.state.responses)) {
      throw new Error('Current step cannot be skipped');
    }
    
    // Store skip reason for account connection
    if (this.state.currentStep === UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS) {
      this.state.responses.skipPlaidReason = reason || 'User chose to skip';
      this.state.responses.hasConnectedAccounts = false;
    }
    
    // Move to next step
    return this.completeStep(this.state.currentStep);
  }
  
  // Save state to localStorage
  private async saveState(): Promise<void> {
    if (!this.state) return;
    
    try {
      // Save current state
      localStorage.setItem(STATE_KEY, JSON.stringify({
        ...this.state,
        version: STATE_VERSION,
        savedAt: new Date().toISOString()
      }));
      
      // Create backup
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        ...this.state,
        version: STATE_VERSION,
        savedAt: new Date().toISOString()
      }));
      
      // Debounced database sync
      this.scheduleDatabaseSync();
      
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }
  
  // Load state from localStorage
  private loadFromLocalStorage(): OnboardingState | null {
    try {
      const savedState = localStorage.getItem(STATE_KEY);
      if (!savedState) {
        // Try backup
        const backupState = localStorage.getItem(BACKUP_KEY);
        if (backupState) {
          const parsed = JSON.parse(backupState);
          if (parsed.version === STATE_VERSION) {
            return this.hydrateState(parsed);
          }
        }
        return null;
      }
      
      const parsed = JSON.parse(savedState);
      
      // Check version compatibility
      if (parsed.version !== STATE_VERSION) {
        // Would need migration logic here
        console.warn('Onboarding state version mismatch');
        return null;
      }
      
      // Check if state is too old (24 hours)
      const savedAt = new Date(parsed.savedAt);
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSave > 24) {
        console.warn('Onboarding state expired');
        return null;
      }
      
      return this.hydrateState(parsed);
      
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      return null;
    }
  }
  
  // Convert saved state back to proper types
  private hydrateState(saved: any): OnboardingState {
    return {
      ...saved,
      createdAt: new Date(saved.createdAt),
      updatedAt: new Date(saved.updatedAt),
      plaidConnection: saved.plaidConnection ? {
        ...saved.plaidConnection,
        connectedAt: new Date(saved.plaidConnection.connectedAt)
      } : undefined
    };
  }
  
  // Load state on construction
  private loadState(): void {
    const recovered = this.loadFromLocalStorage();
    if (recovered) {
      this.state = recovered;
    }
  }
  
  // Schedule database sync (debounced)
  private scheduleDatabaseSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.syncToDatabase();
    }, 2000); // 2 second debounce
  }
  
  // Sync state to database
  async syncToDatabase(): Promise<boolean> {
    if (!this.state || this.syncInProgress) {
      return false;
    }
    
    // Don't sync temporary users until they register
    if (this.state.userId.startsWith('temp_') && !this.userId) {
      return false;
    }
    
    this.syncInProgress = true;
    
    try {
      const token = localStorage.getItem('token');
      if (!token && !this.state.userId.startsWith('temp_')) {
        console.warn('No auth token for database sync');
        return false;
      }
      
      const response = await fetch('/api/onboarding/sync-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          state: this.state,
          version: STATE_VERSION
        })
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update state with any server-side changes
      if (result.updatedState) {
        this.state = this.hydrateState(result.updatedState);
        this.saveState(); // Save updated state locally
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to sync onboarding state:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  // Recover state from database
  async recoverFromDatabase(): Promise<OnboardingState | null> {
    if (!this.userId || this.userId.startsWith('temp_')) {
      return null;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      
      const response = await fetch(`/api/onboarding/recover-state?userId=${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      if (result.state) {
        const recovered = this.hydrateState(result.state);
        
        // Save recovered state locally
        this.state = recovered;
        this.saveState();
        
        return recovered;
      }
      
      return null;
      
    } catch (error) {
      console.error('Failed to recover state from database:', error);
      return null;
    }
  }
  
  // Clear all onboarding data
  async clearState(): Promise<void> {
    this.state = null;
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }
  
  // Transfer temporary user data to registered user
  async transferToUser(newUserId: string): Promise<void> {
    if (!this.state) {
      throw new Error('No state to transfer');
    }
    
    const oldUserId = this.state.userId;
    this.state.userId = newUserId;
    this.userId = newUserId;
    
    // Save with new user ID
    await this.saveState();
    await this.syncToDatabase();
    
    // Clean up old temporary user data if needed
    if (oldUserId.startsWith('temp_')) {
      try {
        await fetch('/api/onboarding/cleanup-temp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tempUserId: oldUserId })
        });
      } catch (error) {
        console.error('Failed to cleanup temp user:', error);
      }
    }
  }
  
  // Get progress information
  getProgress(): {
    percentage: number;
    currentStep: UnifiedOnboardingStep;
    completedSteps: UnifiedOnboardingStep[];
    isComplete: boolean;
  } {
    if (!this.state) {
      return {
        percentage: 0,
        currentStep: UNIFIED_ONBOARDING_STEPS.CONNECT_ACCOUNTS,
        completedSteps: [],
        isComplete: false
      };
    }
    
    const { calculateProgress } = require('./unified-onboarding-flow');
    
    return {
      percentage: calculateProgress(this.state.completedSteps),
      currentStep: this.state.currentStep,
      completedSteps: this.state.completedSteps,
      isComplete: this.state.isComplete
    };
  }
  
  // Validate current state
  async validateState(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this.state) {
      return {
        isValid: false,
        errors: ['No onboarding state found'],
        warnings: []
      };
    }
    
    const { validateOnboardingCompletion } = await import('./unified-onboarding-flow');
    const validation = validateOnboardingCompletion(this.state);
    
    return {
      isValid: validation.isValid,
      errors: validation.missingSteps.map(step => `Step "${step}" is incomplete`),
      warnings: validation.warnings
    };
  }
  
  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Export state for debugging
  exportState(): string {
    return JSON.stringify({
      state: this.state,
      version: STATE_VERSION,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Singleton instance for app-wide state management
let managerInstance: OnboardingStateManager | null = null;

export function getOnboardingStateManager(userId?: string): OnboardingStateManager {
  if (!managerInstance) {
    managerInstance = new OnboardingStateManager(userId);
  } else if (userId && managerInstance['userId'] !== userId) {
    // Update user ID if different
    managerInstance['userId'] = userId;
  }
  
  return managerInstance;
}

export function resetOnboardingStateManager(): void {
  if (managerInstance) {
    managerInstance.clearState();
    managerInstance = null;
  }
}
// Database synchronization for onboarding
// Ensures every answer is saved to the correct tables immediately

export interface DatabaseSyncConfig {
  userId: string;
  token: string;
  step: string;
  value: any;
  progress: any;
}

// Save to user_onboarding_responses for audit trail
export async function logResponse(config: DatabaseSyncConfig) {
  try {
    const response = await fetch('/api/onboarding/log-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify({
        question: config.step,
        answer: config.value
      })
    });
    
    if (!response.ok) {
      console.error('Failed to log response:', await response.text());
    }
    return response.ok;
  } catch (error) {
    console.error('Error logging response:', error);
    return false;
  }
}

// Save to specific database tables based on step
export async function syncToDatabase(config: DatabaseSyncConfig) {
  const { userId, token, step, value, progress } = config;
  
  try {
    // Always log the raw response first
    await logResponse(config);
    
    // Then save to specific tables based on step
    switch (step) {
      case 'main_goal':
        await saveUserPreferences(userId, token, { primary_goal: value });
        break;
        
      case 'life_stage':
        await saveUserDemographics(userId, token, { 
          life_stage: value,
          marital_status: value === 'married' ? 'married' : 
                         value === 'parent' ? 'married' : 'single'
        });
        break;
        
      case 'dependents':
        await saveUserDemographics(userId, token, { 
          dependents: value === '3+' ? 3 : parseInt(value) 
        });
        break;
        
      case 'bank_connection':
        if (value !== 'skipped' && value.publicToken) {
          await savePlaidConnection(userId, token, value);
        }
        break;
        
      case 'income_confirmation':
        await saveRecurringIncome(userId, token, value);
        break;
        
      case 'risk_tolerance':
        await saveUserPreferences(userId, token, { 
          risk_tolerance: value,
          investment_horizon: value > 7 ? 'long' : value > 4 ? 'medium' : 'short'
        });
        break;
        
      case 'goals_selection':
        await saveGoals(userId, token, value);
        break;
        
      case 'budget_review':
        await saveBudget(userId, token, value);
        break;
    }
    
    // Update onboarding progress
    await updateOnboardingProgress(userId, token, step, progress);
    
    return true;
  } catch (error) {
    console.error('Database sync error:', error);
    return false;
  }
}

// Save user preferences
async function saveUserPreferences(userId: string, token: string, data: any) {
  const response = await fetch('/api/user/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, ...data })
  });
  return response.ok;
}

// Save user demographics
async function saveUserDemographics(userId: string, token: string, data: any) {
  const response = await fetch('/api/user/demographics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, ...data })
  });
  return response.ok;
}

// Save Plaid connection and fetch accounts
async function savePlaidConnection(userId: string, token: string, plaidData: any) {
  // Exchange public token for access token
  const exchangeResponse = await fetch('/api/plaid/exchange-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      publicToken: plaidData.publicToken,
      institutionId: plaidData.metadata?.institution?.institution_id,
      institutionName: plaidData.metadata?.institution?.name
    })
  });
  
  if (exchangeResponse.ok) {
    // Fetch accounts and transactions
    await fetch('/api/plaid/sync-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Detect recurring income
    await fetch('/api/plaid/detect-income', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
  
  return exchangeResponse.ok;
}

// Save recurring income
async function saveRecurringIncome(userId: string, token: string, income: number) {
  const response = await fetch('/api/user/income', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      source: 'Salary',
      gross_monthly: income,
      frequency: 'monthly'
    })
  });
  return response.ok;
}

// Save financial goals
async function saveGoals(userId: string, token: string, goalsData: any) {
  const { selected, amounts } = goalsData;
  
  for (const goalId of selected) {
    const goalNames: Record<string, string> = {
      'emergency': 'Emergency Fund',
      'debt': 'Debt Payoff',
      'home': 'Home Purchase',
      'retirement': 'Retirement',
      'invest': 'Investment Growth',
      'vacation': 'Dream Vacation'
    };
    
    await fetch('/api/user/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        name: goalNames[goalId] || goalId,
        target_amount: amounts?.[goalId] || 10000,
        target_date: getGoalTargetDate(goalId)
      })
    });
  }
  
  return true;
}

// Save budget
async function saveBudget(userId: string, token: string, budgetData: any) {
  const response = await fetch('/api/user/budget', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      name: 'Primary Budget',
      categories: budgetData.categories || budgetData
    })
  });
  return response.ok;
}

// Update onboarding progress
async function updateOnboardingProgress(userId: string, token: string, currentStep: string, progress: any) {
  const response = await fetch('/api/onboarding/update-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      current_step: currentStep,
      progress_data: progress,
      is_complete: currentStep === 'complete'
    })
  });
  return response.ok;
}

// Helper function to determine goal target dates
function getGoalTargetDate(goalType: string): string {
  const now = new Date();
  const targetYears: Record<string, number> = {
    'emergency': 1,
    'debt': 2,
    'home': 3,
    'retirement': 30,
    'invest': 5,
    'vacation': 1
  };
  
  const years = targetYears[goalType] || 3;
  now.setFullYear(now.getFullYear() + years);
  return now.toISOString();
}

// Refresh dashboard after updates
export async function refreshDashboard(userId: string, token: string) {
  try {
    const response = await fetch('/api/dashboard/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });
    return response.ok;
  } catch (error) {
    console.error('Dashboard refresh error:', error);
    return false;
  }
}
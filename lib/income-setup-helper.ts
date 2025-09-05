/**
 * Helper utility to setup income for dashboard
 * This helps ensure users have accurate income data
 */

export async function checkAndSetupIncome(userId: string): Promise<{
  hasIncome: boolean;
  needsSetup: boolean;
  detectedAmount?: number;
  confidence?: number;
}> {
  try {
    // First check if user already has recurring income
    const incomeResponse = await fetch(`/api/income/detect?userId=${userId}`);
    const incomeData = await incomeResponse.json();
    
    if (incomeData.hasIncome) {
      return {
        hasIncome: true,
        needsSetup: false
      };
    }
    
    // Try to detect income from transactions
    const detectResponse = await fetch('/api/income/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    const detectData = await detectResponse.json();
    
    if (detectData.detected) {
      return {
        hasIncome: false,
        needsSetup: true,
        detectedAmount: detectData.income?.monthlyAmount,
        confidence: detectData.income?.confidence
      };
    }
    
    return {
      hasIncome: false,
      needsSetup: true
    };
    
  } catch (error) {
    console.error('Error checking income setup:', error);
    return {
      hasIncome: false,
      needsSetup: true
    };
  }
}

export async function saveUserIncome(
  userId: string,
  monthlyAmount: number,
  source: string = 'manual',
  frequency: string = 'monthly',
  employer?: string,
  isNet: boolean = false
): Promise<boolean> {
  try {
    const response = await fetch('/api/income', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        monthlyAmount,
        source,
        frequency,
        employer,
        isNet
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving user income:', error);
    return false;
  }
}
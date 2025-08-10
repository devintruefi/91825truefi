const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';


export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_advisor: boolean;
  created_at: string;
}

export interface FinancialData {
  accounts: Account[];
  recent_transactions: Transaction[];
  goals?: Goal[];
  summary: FinancialSummary;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  priority?: string;
  is_active?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  available_balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  name: string;
  merchant_name?: string;
  category: string;
  date: string;
  pending: boolean;
  account_name?: string;
}

export interface FinancialSummary {
  total_balance: number;
  total_available: number;
  account_count: number;
  transaction_count: number;
  category_breakdown: Record<string, number>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('API Request URL:', url); // Debug log
    console.log('API Request options:', options); // Debug log
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('API Response status:', response.status); // Debug log
    console.log('API Response headers:', Object.fromEntries(response.headers.entries())); // Debug log

    if (!response.ok) {
      // Try to get detailed error information
      let errorMessage = `API request failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.log('Error response:', errorData); // Debug log
        
        if (errorData.detail) {
          // Handle Pydantic validation errors
          if (Array.isArray(errorData.detail)) {
            const validationErrors = errorData.detail.map((err: any) => 
              `${err.loc?.join('.') || 'field'}: ${err.msg}`
            ).join(', ');
            errorMessage = `Validation error: ${validationErrors}`;
          } else {
            errorMessage = `API request failed: ${errorData.detail}`;
          }
        } else if (errorData.message) {
          errorMessage = `API request failed: ${errorData.message}`;
        }
      } catch (e) {
        console.log('Could not parse error response:', e);
        // If we can't parse JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // User Management
  async createUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    is_advisor?: boolean;
  }): Promise<User> {
    // Temporarily disable backend user creation
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      is_advisor: userData.is_advisor || false,
      created_at: new Date().toISOString()
    }
    // setUser(demoUser) // Assuming setUser is available in the context
    // localStorage.setItem('current_user_id', demoUser.id)
    // localStorage.setItem('current_user_data', JSON.stringify(demoUser))
    return Promise.resolve(demoUser as User); // Return a dummy user for now
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  // Plaid Integration
  async createLinkToken(userId: string, userEmail: string): Promise<{ link_token: string }> {
    return this.request<{ link_token: string }>('/plaid/link-token', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, user_email: userEmail }),
    });
  }

  async linkPlaidAccount(data: {
    user_id: string;
    public_token: string;
    institution_id: string;
  }): Promise<{ success: boolean; message: string; accounts_count: number }> {
    return this.request('/plaid/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Financial Data
  async getFinancialData(userId: string): Promise<FinancialData> {
    return this.request<FinancialData>(`/financial-data/${userId}`);
  }

  async getAccounts(userId: string): Promise<Account[]> {
    return this.request<Account[]>(`/accounts/${userId}`);
  }

  async getTransactions(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    return this.request<Transaction[]>(`/transactions/${userId}?limit=${limit}&offset=${offset}`);
  }

  // Advanced Features
  async refreshAccounts(userId: string, accountIds?: string[]): Promise<{
    success: boolean;
    accounts_updated: number;
    message: string;
  }> {
    return this.request('/plaid/refresh-accounts', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, account_ids: accountIds }),
    });
  }

  // Account Management
  async deleteAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  async getPlaidConnections(userId: string): Promise<Array<{
    id: string;
    institution_name: string;
    plaid_item_id: string;
    is_active: boolean;
    created_at: string;
    last_sync_at?: string;
    accounts_count: number;
  }>> {
    return this.request(`/plaid/connections/${userId}`, {
      method: 'GET',
    });
  }

  async deletePlaidConnection(userId: string, connectionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/plaid/connections/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ connectionId }),
    });
  }

  async getSpendingAnalytics(userId: string, startDate?: string, endDate?: string): Promise<{
    total_spending: number;
    spending_by_category: Record<string, number>;
    spending_by_month: Record<string, number>;
    top_merchants: Array<{ merchant: string; amount: number }>;
    average_daily_spending: number;
    spending_trend: string;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request(`/analytics/spending/${userId}?${params.toString()}`);
  }

  async getBudgetStatus(userId: string): Promise<{
    user_id: string;
    monthly_budget: number;
    total_spent: number;
    remaining_budget: number;
    categories: Array<{
      category: string;
      budget_amount: number;
      spent_amount: number;
      remaining_amount: number;
      percentage_used: number;
    }>;
    status: string;
  }> {
    return this.request(`/budget/${userId}`);
  }

  async getNetWorth(userId: string): Promise<{
    net_worth: number;
    total_assets: number;
    total_liabilities: number;
    net_worth_by_type: Record<string, number>;
    account_count: number;
    last_updated: string;
  }> {
    return this.request(`/analytics/net-worth/${userId}`);
  }

  // Transaction Management
  async updateTransactionCategory(transactionId: string, category: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    transaction_id: string;
    updated_category: string;
  }> {
    return this.request(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify({ category, notes }),
    });
  }

  async bulkUpdateSimilarTransactions(userId: string, transactionName: string, category: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    updated_count: number;
    updated_transactions: string[];
  }> {
    return this.request('/transactions/bulk-update-similar', {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, transaction_name: transactionName, category, notes }),
    });
  }
}

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser environment
    return process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
  }
  
  // Server environment
  return process.env.BACKEND_URL || '/api';
};

// Create and export a singleton instance of ApiClient
export const apiClient = new ApiClient(getBaseUrl()); 
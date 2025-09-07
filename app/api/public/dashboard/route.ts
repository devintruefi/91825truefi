import { NextRequest, NextResponse } from 'next/server';
import { 
  getMockAccounts, 
  getMockTransactions, 
  getMockGoals,
  getMockBudget,
  getMockInvestments,
  getMockSpendingData,
  getMockAssets
} from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  // Return all mock data for public dashboard
  return NextResponse.json({
    accounts: getMockAccounts(),
    recent_transactions: getMockTransactions(),
    goals: getMockGoals(),
    budget: getMockBudget(),
    investments: getMockInvestments(),
    spending: getMockSpendingData(),
    assets: getMockAssets(),
    pagination: {
      total: getMockTransactions().length,
      limit: 10,
      offset: 0,
      hasMore: false
    }
  });
}
import prisma from '@/lib/db';

export interface PositionMetrics {
  security_id: string | null;
  security_name: string;
  ticker: string | null;
  quantity: number;
  cost_basis: number;
  market_value: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  account_id?: string | null;
  account_name?: string;
}

export interface PortfolioMetrics {
  total_cost_basis: number;
  total_market_value: number;
  total_unrealized_gain: number;
  total_unrealized_gain_pct: number;
  position_count: number;
}

export interface InvestmentMetricsResult {
  positions: PositionMetrics[];
  portfolio: PortfolioMetrics;
}

export async function getPositionMetrics(userId: string): Promise<InvestmentMetricsResult> {
  // Get user's investment accounts
  const investmentAccounts = await prisma.accounts.findMany({
    where: {
      user_id: userId,
      OR: [
        { type: 'investment' },
        { type: 'brokerage' },
        { 
          subtype: { 
            in: ['401k', '403b', '457b', 'ira', 'roth', '401a', 'brokerage', 'hsa', '529'] 
          } 
        }
      ],
      is_active: true
    }
  });

  const accountIds = investmentAccounts.map(a => a.id);
  const accountMap = new Map(investmentAccounts.map(a => [a.id, a.name]));

  // Get holdings for these accounts
  const holdings = await prisma.holdings.findMany({
    where: {
      account_id: { in: accountIds }
    },
    include: {
      securities: true
    }
  });

  // Get investment transactions for cost basis calculation
  const transactions = await prisma.investment_transactions.findMany({
    where: {
      account_id: { in: accountIds },
      type: { in: ['buy', 'sell'] }
    },
    orderBy: {
      date: 'asc'
    }
  });

  // Calculate cost basis from transactions (simple average method)
  const costBasisBySecurityAccount = new Map<string, { totalCost: number; totalQuantity: number }>();
  
  for (const tx of transactions) {
    if (!tx.security_id) continue;
    
    const key = `${tx.security_id}_${tx.account_id}`;
    const existing = costBasisBySecurityAccount.get(key) || { totalCost: 0, totalQuantity: 0 };
    
    const quantity = Number(tx.quantity || 0);
    const amount = Number(tx.amount || 0);
    
    if (tx.type === 'buy') {
      existing.totalCost += Math.abs(amount);
      existing.totalQuantity += quantity;
    } else if (tx.type === 'sell') {
      // For sells, reduce quantity proportionally
      if (existing.totalQuantity > 0) {
        const sellRatio = quantity / existing.totalQuantity;
        existing.totalCost *= (1 - sellRatio);
        existing.totalQuantity -= quantity;
      }
    }
    
    costBasisBySecurityAccount.set(key, existing);
  }

  // Calculate metrics for each position
  const metrics: PositionMetrics[] = holdings.map(holding => {
    const quantity = Number(holding.quantity || 0);
    const institutionPrice = Number(holding.institution_price || 0);
    const marketValue = quantity * institutionPrice;
    
    // Try to get cost basis from transactions first
    const key = `${holding.security_id}_${holding.account_id}`;
    const txCostBasis = costBasisBySecurityAccount.get(key);
    
    let costBasis = Number(holding.cost_basis || 0);
    if (txCostBasis && txCostBasis.totalQuantity > 0) {
      // Use transaction-based cost basis if available
      costBasis = txCostBasis.totalCost;
    }
    
    const unrealizedGain = marketValue - costBasis;
    const unrealizedGainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

    return {
      security_id: holding.security_id,
      security_name: holding.securities?.name || 'Unknown Security',
      ticker: holding.securities?.ticker || null,
      quantity,
      cost_basis: costBasis,
      market_value: marketValue,
      unrealized_gain: unrealizedGain,
      unrealized_gain_pct: unrealizedGainPct,
      account_id: holding.account_id,
      account_name: holding.account_id ? accountMap.get(holding.account_id) : undefined
    };
  }).filter(m => m.quantity > 0); // Only include positions with positive quantity

  // Calculate portfolio totals
  const portfolio: PortfolioMetrics = {
    total_cost_basis: metrics.reduce((sum, m) => sum + m.cost_basis, 0),
    total_market_value: metrics.reduce((sum, m) => sum + m.market_value, 0),
    total_unrealized_gain: metrics.reduce((sum, m) => sum + m.unrealized_gain, 0),
    total_unrealized_gain_pct: 0,
    position_count: metrics.length
  };

  // Calculate portfolio-level percentage
  if (portfolio.total_cost_basis > 0) {
    portfolio.total_unrealized_gain_pct = 
      (portfolio.total_unrealized_gain / portfolio.total_cost_basis) * 100;
  }

  return { positions: metrics, portfolio };
}

// Additional helper to get performance over a specific period
export async function getPerformanceByPeriod(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<{ startValue: number; endValue: number; gain: number; gainPct: number }> {
  // This would require historical price data which we don't have in the current schema
  // For now, return current metrics as a placeholder
  const metrics = await getPositionMetrics(userId);
  
  return {
    startValue: metrics.portfolio.total_cost_basis,
    endValue: metrics.portfolio.total_market_value,
    gain: metrics.portfolio.total_unrealized_gain,
    gainPct: metrics.portfolio.total_unrealized_gain_pct
  };
}
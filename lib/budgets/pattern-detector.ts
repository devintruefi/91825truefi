// Spending pattern detection system
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SpendingPattern {
  type: 'seasonal' | 'weekly' | 'monthly' | 'irregular' | 'trending';
  category: string;
  pattern: string;
  confidence: number;
  details: any;
}

export interface CategoryPattern {
  category: string;
  averageMonthly: number;
  standardDeviation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: SeasonalPattern | null;
  weeklyPattern: WeeklyPattern | null;
  anomalies: Anomaly[];
  predictedNext: number;
}

export interface SeasonalPattern {
  highMonths: number[]; // Month numbers (0-11)
  lowMonths: number[];
  variation: number; // Percentage variation
}

export interface WeeklyPattern {
  highDays: number[]; // Day numbers (0-6, 0=Sunday)
  lowDays: number[];
  weekendVsWeekday: number; // Ratio
}

export interface Anomaly {
  date: Date;
  amount: number;
  expectedAmount: number;
  deviation: number;
  category: string;
}

// Detect all spending patterns for a user
export async function detectSpendingPatterns(
  userId: string,
  lookbackMonths: number = 6
): Promise<SpendingPattern[]> {
  const patterns: SpendingPattern[] = [];
  
  // Get transaction history
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: startDate },
      amount: { gt: 0 }
    },
    orderBy: { date: 'asc' }
  });
  
  if (transactions.length === 0) {
    return patterns;
  }
  
  // Group by category
  const categorizedTransactions = groupByCategory(transactions);
  
  // Detect patterns for each category
  for (const [category, categoryTransactions] of categorizedTransactions) {
    // Seasonal patterns
    const seasonal = detectSeasonalPattern(categoryTransactions);
    if (seasonal && seasonal.variation > 20) {
      patterns.push({
        type: 'seasonal',
        category,
        pattern: `Higher spending in months: ${seasonal.highMonths.join(', ')}`,
        confidence: Math.min(95, seasonal.variation * 2),
        details: seasonal
      });
    }
    
    // Weekly patterns
    const weekly = detectWeeklyPattern(categoryTransactions);
    if (weekly && Math.abs(weekly.weekendVsWeekday - 1) > 0.3) {
      patterns.push({
        type: 'weekly',
        category,
        pattern: weekly.weekendVsWeekday > 1.3 
          ? 'Higher weekend spending' 
          : 'Higher weekday spending',
        confidence: 80,
        details: weekly
      });
    }
    
    // Trending patterns
    const trend = detectTrendPattern(categoryTransactions);
    if (trend.confidence > 70) {
      patterns.push({
        type: 'trending',
        category,
        pattern: `${trend.direction} trend: ${trend.percentageChange.toFixed(1)}% per month`,
        confidence: trend.confidence,
        details: trend
      });
    }
    
    // Irregular patterns
    const irregular = detectIrregularPattern(categoryTransactions);
    if (irregular.length > 0) {
      patterns.push({
        type: 'irregular',
        category,
        pattern: `${irregular.length} unusual transactions detected`,
        confidence: 60,
        details: irregular
      });
    }
  }
  
  return patterns;
}

// Analyze patterns for a specific category
export async function analyzeCategoryPattern(
  userId: string,
  category: string,
  lookbackMonths: number = 6
): Promise<CategoryPattern> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: startDate },
      category: { contains: category, mode: 'insensitive' },
      amount: { gt: 0 }
    },
    orderBy: { date: 'asc' }
  });
  
  // Calculate monthly totals
  const monthlyTotals = calculateMonthlyTotals(transactions);
  const averageMonthly = monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length;
  
  // Calculate standard deviation
  const variance = monthlyTotals.reduce((sum, val) => {
    return sum + Math.pow(val - averageMonthly, 2);
  }, 0) / monthlyTotals.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Detect patterns
  const seasonal = detectSeasonalPattern(transactions);
  const weekly = detectWeeklyPattern(transactions);
  const trend = detectTrendPattern(transactions);
  const anomalies = detectAnomalies(transactions, averageMonthly, standardDeviation);
  
  // Predict next month
  const predictedNext = predictNextMonth(
    monthlyTotals,
    trend,
    seasonal,
    new Date().getMonth()
  );
  
  return {
    category,
    averageMonthly,
    standardDeviation,
    trend: trend.direction,
    seasonality: seasonal,
    weeklyPattern: weekly,
    anomalies,
    predictedNext
  };
}

// Group transactions by category
function groupByCategory(transactions: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  for (const tx of transactions) {
    const category = tx.category || 'Other';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(tx);
  }
  
  return grouped;
}

// Calculate monthly totals
function calculateMonthlyTotals(transactions: any[]): number[] {
  const monthlyMap = new Map<string, number>();
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    const current = monthlyMap.get(monthKey) || 0;
    monthlyMap.set(monthKey, current + Math.abs(tx.amount));
  }
  
  return Array.from(monthlyMap.values());
}

// Detect seasonal patterns
function detectSeasonalPattern(transactions: any[]): SeasonalPattern | null {
  if (transactions.length < 90) return null; // Need at least 3 months
  
  const monthlySpending = new Map<number, number[]>();
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const month = date.getMonth();
    
    if (!monthlySpending.has(month)) {
      monthlySpending.set(month, []);
    }
    monthlySpending.get(month)!.push(Math.abs(tx.amount));
  }
  
  // Calculate average for each month
  const monthlyAverages = new Map<number, number>();
  let totalAverage = 0;
  let monthCount = 0;
  
  for (const [month, amounts] of monthlySpending) {
    const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    monthlyAverages.set(month, avg);
    totalAverage += avg;
    monthCount++;
  }
  
  if (monthCount === 0) return null;
  
  totalAverage /= monthCount;
  
  // Find high and low months
  const highMonths: number[] = [];
  const lowMonths: number[] = [];
  
  for (const [month, avg] of monthlyAverages) {
    if (avg > totalAverage * 1.2) {
      highMonths.push(month);
    } else if (avg < totalAverage * 0.8) {
      lowMonths.push(month);
    }
  }
  
  if (highMonths.length === 0 && lowMonths.length === 0) {
    return null;
  }
  
  // Calculate variation
  const maxAvg = Math.max(...monthlyAverages.values());
  const minAvg = Math.min(...monthlyAverages.values());
  const variation = ((maxAvg - minAvg) / totalAverage) * 100;
  
  return {
    highMonths,
    lowMonths,
    variation
  };
}

// Detect weekly patterns
function detectWeeklyPattern(transactions: any[]): WeeklyPattern | null {
  if (transactions.length < 30) return null; // Need at least 30 transactions
  
  const daySpending = new Map<number, number[]>();
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const day = date.getDay();
    
    if (!daySpending.has(day)) {
      daySpending.set(day, []);
    }
    daySpending.get(day)!.push(Math.abs(tx.amount));
  }
  
  // Calculate average for each day
  const dayAverages = new Map<number, number>();
  
  for (const [day, amounts] of daySpending) {
    const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    dayAverages.set(day, avg);
  }
  
  // Calculate weekend vs weekday
  let weekendTotal = 0;
  let weekdayTotal = 0;
  let weekendCount = 0;
  let weekdayCount = 0;
  
  for (const [day, avg] of dayAverages) {
    if (day === 0 || day === 6) {
      weekendTotal += avg;
      weekendCount++;
    } else {
      weekdayTotal += avg;
      weekdayCount++;
    }
  }
  
  const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;
  const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 1;
  const weekendVsWeekday = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 0;
  
  // Find high and low days
  const totalAvg = Array.from(dayAverages.values()).reduce((sum, val) => sum + val, 0) / dayAverages.size;
  const highDays: number[] = [];
  const lowDays: number[] = [];
  
  for (const [day, avg] of dayAverages) {
    if (avg > totalAvg * 1.2) {
      highDays.push(day);
    } else if (avg < totalAvg * 0.8) {
      lowDays.push(day);
    }
  }
  
  return {
    highDays,
    lowDays,
    weekendVsWeekday
  };
}

// Detect trending patterns
function detectTrendPattern(transactions: any[]): {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
  confidence: number;
} {
  const monthlyTotals = calculateMonthlyTotals(transactions);
  
  if (monthlyTotals.length < 3) {
    return { direction: 'stable', percentageChange: 0, confidence: 0 };
  }
  
  // Calculate linear regression
  const n = monthlyTotals.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += monthlyTotals[i];
    sumXY += i * monthlyTotals[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  
  // Calculate R-squared for confidence
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + (avgY - slope * (sumX / n));
    ssRes += Math.pow(monthlyTotals[i] - predicted, 2);
    ssTot += Math.pow(monthlyTotals[i] - avgY, 2);
  }
  
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  const confidence = Math.min(95, Math.max(0, rSquared * 100));
  
  // Determine direction and percentage change
  const percentageChange = avgY > 0 ? (slope / avgY) * 100 : 0;
  
  let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (Math.abs(percentageChange) > 5 && confidence > 60) {
    direction = percentageChange > 0 ? 'increasing' : 'decreasing';
  }
  
  return { direction, percentageChange, confidence };
}

// Detect irregular patterns (anomalies)
function detectIrregularPattern(transactions: any[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Calculate average and standard deviation
  const amounts = transactions.map(tx => Math.abs(tx.amount));
  const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Detect outliers (>2 standard deviations)
  for (const tx of transactions) {
    const amount = Math.abs(tx.amount);
    const deviation = Math.abs(amount - avg) / stdDev;
    
    if (deviation > 2) {
      anomalies.push({
        date: new Date(tx.date),
        amount,
        expectedAmount: avg,
        deviation,
        category: tx.category || 'Unknown'
      });
    }
  }
  
  return anomalies;
}

// Detect anomalies in spending
function detectAnomalies(
  transactions: any[],
  averageMonthly: number,
  standardDeviation: number
): Anomaly[] {
  const dailyAverage = averageMonthly / 30;
  const anomalies: Anomaly[] = [];
  
  // Group by day
  const dailySpending = new Map<string, number>();
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const dateKey = date.toISOString().split('T')[0];
    
    const current = dailySpending.get(dateKey) || 0;
    dailySpending.set(dateKey, current + Math.abs(tx.amount));
  }
  
  // Find anomalies
  for (const [dateStr, amount] of dailySpending) {
    if (amount > dailyAverage + standardDeviation * 2) {
      anomalies.push({
        date: new Date(dateStr),
        amount,
        expectedAmount: dailyAverage,
        deviation: (amount - dailyAverage) / standardDeviation,
        category: transactions[0]?.category || 'Unknown'
      });
    }
  }
  
  return anomalies.slice(0, 10); // Limit to top 10
}

// Predict next month's spending
function predictNextMonth(
  monthlyTotals: number[],
  trend: any,
  seasonal: SeasonalPattern | null,
  nextMonth: number
): number {
  if (monthlyTotals.length === 0) return 0;
  
  // Base prediction on average
  let prediction = monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length;
  
  // Apply trend
  if (trend.confidence > 70) {
    prediction *= (1 + trend.percentageChange / 100);
  }
  
  // Apply seasonal adjustment
  if (seasonal) {
    if (seasonal.highMonths.includes(nextMonth)) {
      prediction *= 1 + (seasonal.variation / 200);
    } else if (seasonal.lowMonths.includes(nextMonth)) {
      prediction *= 1 - (seasonal.variation / 200);
    }
  }
  
  return Math.max(0, prediction);
}
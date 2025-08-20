// Smart goal calculation engine
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserFinancialContext {
  userId: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  riskTolerance: number; // 1-10
  age?: number;
  dependents?: number;
  existingDebts?: number;
  investmentHorizon?: string; // short, medium, long
}

export interface GoalCalculation {
  goalType: string;
  targetAmount: number;
  monthlyContribution: number;
  timeframeMonths: number;
  confidence: number; // 0-100%
  reasoning: string;
}

// Calculate realistic goal targets based on user context
export async function calculateRealisticGoalTarget(
  goalType: string,
  context: UserFinancialContext
): Promise<GoalCalculation> {
  const { monthlyIncome, monthlyExpenses, riskTolerance, age, dependents, existingDebts } = context;
  
  // Calculate disposable income
  const disposableIncome = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsRate = disposableIncome / monthlyIncome;
  
  // Risk adjustment factor (0.5 to 1.5)
  const riskFactor = 0.5 + (riskTolerance / 10);
  
  // Age factor for retirement planning
  const ageFactor = age ? Math.max(0.5, (65 - age) / 40) : 1;
  
  // Dependent adjustment
  const dependentFactor = 1 - (dependents || 0) * 0.1;
  
  let calculation: GoalCalculation;
  
  switch (goalType.toLowerCase()) {
    case 'emergency_fund':
    case 'emergency':
      calculation = calculateEmergencyFund(context);
      break;
    
    case 'retirement':
    case 'retirement_planning':
      calculation = calculateRetirement(context);
      break;
    
    case 'debt_payoff':
    case 'debt':
      calculation = calculateDebtPayoff(context);
      break;
    
    case 'home_purchase':
    case 'home':
    case 'house':
      calculation = calculateHomePurchase(context);
      break;
    
    case 'investment':
    case 'investments':
    case 'investing':
      calculation = calculateInvestmentGoal(context);
      break;
    
    case 'education':
    case 'college':
    case 'college_savings':
      calculation = calculateEducation(context);
      break;
    
    case 'vacation':
    case 'travel':
      calculation = calculateVacation(context);
      break;
    
    case 'car':
    case 'vehicle':
      calculation = calculateCarPurchase(context);
      break;
    
    default:
      // Generic goal calculation
      calculation = {
        goalType,
        targetAmount: monthlyIncome * 3,
        monthlyContribution: disposableIncome * 0.2,
        timeframeMonths: 24,
        confidence: 50,
        reasoning: 'Generic goal calculation based on income'
      };
  }
  
  // Apply confidence adjustments
  calculation.confidence = Math.min(100, Math.max(0, 
    calculation.confidence * riskFactor * dependentFactor
  ));
  
  return calculation;
}

function calculateEmergencyFund(context: UserFinancialContext): GoalCalculation {
  const { monthlyExpenses, monthlyIncome, riskTolerance, dependents } = context;
  
  // Base: 3-6 months of expenses
  const monthsNeeded = riskTolerance <= 3 ? 6 : riskTolerance <= 7 ? 4 : 3;
  const adjustedMonths = monthsNeeded + (dependents || 0);
  const targetAmount = monthlyExpenses * adjustedMonths;
  
  // Can save 20-30% of disposable income for emergency
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(50, disposableIncome * 0.25);
  
  const timeframeMonths = Math.ceil(targetAmount / monthlyContribution);
  
  return {
    goalType: 'Emergency Fund',
    targetAmount,
    monthlyContribution,
    timeframeMonths,
    confidence: 85,
    reasoning: `${adjustedMonths} months of expenses for emergency cushion`
  };
}

function calculateRetirement(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, age = 30, riskTolerance } = context;
  const annualIncome = monthlyIncome * 12;
  const yearsToRetirement = Math.max(10, 65 - age);
  
  // Rule of thumb: Need 10-12x annual income for retirement
  const retirementMultiplier = riskTolerance <= 5 ? 12 : 10;
  const targetAmount = annualIncome * retirementMultiplier;
  
  // Account for compound interest (assuming 6% annual return)
  const monthlyRate = 0.06 / 12;
  const months = yearsToRetirement * 12;
  
  // PMT calculation for future value
  const monthlyContribution = targetAmount * monthlyRate / 
    (Math.pow(1 + monthlyRate, months) - 1);
  
  return {
    goalType: 'Retirement',
    targetAmount,
    monthlyContribution: Math.max(100, monthlyContribution),
    timeframeMonths: months,
    confidence: 75,
    reasoning: `${retirementMultiplier}x annual income by retirement age`
  };
}

function calculateDebtPayoff(context: UserFinancialContext): GoalCalculation {
  const { existingDebts = 0, monthlyIncome, monthlyExpenses, riskTolerance } = context;
  
  if (existingDebts === 0) {
    // Estimate based on typical debt levels
    const estimatedDebt = monthlyIncome * 6;
    const disposableIncome = monthlyIncome - monthlyExpenses;
    const aggressiveness = riskTolerance > 5 ? 0.5 : 0.3;
    const monthlyContribution = disposableIncome * aggressiveness;
    
    return {
      goalType: 'Debt Payoff',
      targetAmount: estimatedDebt,
      monthlyContribution,
      timeframeMonths: Math.ceil(estimatedDebt / monthlyContribution),
      confidence: 40,
      reasoning: 'Estimated debt - connect accounts for accurate calculation'
    };
  }
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const aggressiveness = riskTolerance > 5 ? 0.5 : 0.3;
  const monthlyContribution = Math.max(100, disposableIncome * aggressiveness);
  const timeframeMonths = Math.ceil(existingDebts / monthlyContribution);
  
  return {
    goalType: 'Debt Payoff',
    targetAmount: existingDebts,
    monthlyContribution,
    timeframeMonths,
    confidence: 90,
    reasoning: 'Aggressive debt payoff strategy'
  };
}

function calculateHomePurchase(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, monthlyExpenses, riskTolerance } = context;
  const annualIncome = monthlyIncome * 12;
  
  // Home price: 3-5x annual income
  const homeMultiplier = riskTolerance <= 5 ? 3 : 4;
  const homePrice = annualIncome * homeMultiplier;
  
  // Down payment: 10-20%
  const downPaymentPercent = riskTolerance <= 5 ? 0.2 : 0.1;
  const targetAmount = homePrice * downPaymentPercent;
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(200, disposableIncome * 0.3);
  const timeframeMonths = Math.ceil(targetAmount / monthlyContribution);
  
  return {
    goalType: 'Home Purchase',
    targetAmount,
    monthlyContribution,
    timeframeMonths,
    confidence: 70,
    reasoning: `${downPaymentPercent * 100}% down on ${homeMultiplier}x income home`
  };
}

function calculateInvestmentGoal(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, monthlyExpenses, riskTolerance, investmentHorizon = 'medium' } = context;
  
  const horizonMultiplier = {
    'short': 0.5,
    'medium': 1,
    'long': 2
  }[investmentHorizon] || 1;
  
  const annualIncome = monthlyIncome * 12;
  const targetAmount = annualIncome * horizonMultiplier * (riskTolerance / 5);
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(50, disposableIncome * 0.15);
  
  const timeframeMonths = Math.ceil(targetAmount / monthlyContribution);
  
  return {
    goalType: 'Investment',
    targetAmount,
    monthlyContribution,
    timeframeMonths,
    confidence: 65,
    reasoning: `Building ${investmentHorizon}-term investment portfolio`
  };
}

function calculateEducation(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, monthlyExpenses, dependents = 0 } = context;
  
  // Average college cost: $30k-50k per child
  const costPerChild = 40000;
  const totalCost = Math.max(costPerChild, costPerChild * dependents);
  
  const yearsUntilCollege = 10; // Assume average
  const months = yearsUntilCollege * 12;
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(100, totalCost / months);
  
  return {
    goalType: 'Education',
    targetAmount: totalCost,
    monthlyContribution,
    timeframeMonths: months,
    confidence: 60,
    reasoning: `College savings for ${dependents || 1} dependent(s)`
  };
}

function calculateVacation(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, monthlyExpenses, riskTolerance } = context;
  
  // Vacation budget: 5-10% of annual income
  const annualIncome = monthlyIncome * 12;
  const vacationPercent = riskTolerance <= 5 ? 0.05 : 0.08;
  const targetAmount = annualIncome * vacationPercent;
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(50, disposableIncome * 0.1);
  const timeframeMonths = Math.ceil(targetAmount / monthlyContribution);
  
  return {
    goalType: 'Vacation',
    targetAmount,
    monthlyContribution,
    timeframeMonths,
    confidence: 80,
    reasoning: `${vacationPercent * 100}% of annual income for travel`
  };
}

function calculateCarPurchase(context: UserFinancialContext): GoalCalculation {
  const { monthlyIncome, monthlyExpenses, riskTolerance } = context;
  
  // Car price: 25-50% of annual income
  const annualIncome = monthlyIncome * 12;
  const carPercent = riskTolerance <= 5 ? 0.25 : 0.35;
  const carPrice = annualIncome * carPercent;
  
  // Down payment: 20%
  const targetAmount = carPrice * 0.2;
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const monthlyContribution = Math.max(100, disposableIncome * 0.2);
  const timeframeMonths = Math.ceil(targetAmount / monthlyContribution);
  
  return {
    goalType: 'Car Purchase',
    targetAmount,
    monthlyContribution,
    timeframeMonths,
    confidence: 75,
    reasoning: '20% down payment on vehicle'
  };
}

// Get user's financial context from database
export async function getUserFinancialContext(userId: string): Promise<UserFinancialContext> {
  // Get user's income
  const incomeData = await prisma.recurring_income.findMany({
    where: { user_id: userId }
  });
  
  const monthlyIncome = incomeData.reduce((sum, income) => {
    return sum + Number(income.gross_monthly || 0);
  }, 0);
  
  // Get user's expenses from transactions
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: threeMonthsAgo },
      amount: { gt: 0 }
    }
  });
  
  const totalExpenses = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const monthlyExpenses = totalExpenses / 3;
  
  // Get user preferences
  const preferences = await prisma.user_preferences.findUnique({
    where: { user_id: userId }
  });
  
  const demographics = await prisma.user_demographics.findUnique({
    where: { user_id: userId }
  });
  
  // Get current savings (sum of all account balances)
  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId, is_active: true }
  });
  
  const currentSavings = accounts.reduce((sum, account) => {
    return sum + Number(account.balance || 0);
  }, 0);
  
  // Get existing debts
  const debts = await prisma.manual_liabilities.findMany({
    where: { user_id: userId }
  });
  
  const existingDebts = debts.reduce((sum, debt) => {
    return sum + Number(debt.balance || 0);
  }, 0);
  
  return {
    userId,
    monthlyIncome: monthlyIncome || 5000, // Default if no income data
    monthlyExpenses: monthlyExpenses || monthlyIncome * 0.7,
    currentSavings,
    riskTolerance: parseInt(preferences?.risk_tolerance || '5'),
    age: demographics?.age,
    dependents: demographics?.dependents,
    existingDebts,
    investmentHorizon: preferences?.investment_horizon || 'medium'
  };
}
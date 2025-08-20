// Goal progress tracking system
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GoalProgress {
  goalId: string;
  userId: string;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  monthlyProgress: number;
  projectedCompletion: Date | null;
  isOnTrack: boolean;
  milestone?: string;
  recommendations?: string[];
}

export interface ProgressNotification {
  type: 'milestone' | 'warning' | 'achievement' | 'update';
  goalId: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  actionRequired?: boolean;
}

// Track progress for a specific goal
export async function trackGoalProgress(goalId: string): Promise<GoalProgress> {
  const goal = await prisma.goals.findUnique({
    where: { id: goalId }
  });
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  // Get recent transactions that might contribute to this goal
  const recentTransactions = await getGoalRelatedTransactions(goal.user_id, goal.name);
  const monthlyProgress = calculateMonthlyProgress(recentTransactions);
  
  const currentAmount = Number(goal.current_amount || 0);
  const targetAmount = Number(goal.target_amount || 0);
  const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  
  // Calculate projected completion
  const remainingAmount = targetAmount - currentAmount;
  const monthsToComplete = monthlyProgress > 0 ? remainingAmount / monthlyProgress : null;
  const projectedCompletion = monthsToComplete 
    ? new Date(Date.now() + monthsToComplete * 30 * 24 * 60 * 60 * 1000)
    : null;
  
  // Check if on track
  const targetDate = goal.target_date;
  const isOnTrack = projectedCompletion && targetDate 
    ? projectedCompletion <= targetDate 
    : monthlyProgress > 0;
  
  // Determine milestone
  const milestone = getMilestone(progressPercentage);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    progressPercentage,
    monthlyProgress,
    isOnTrack,
    goal.name
  );
  
  // Save progress to database
  await saveProgressRecord(goal.id, goal.user_id, {
    progressAmount: currentAmount,
    progressPercentage,
    milestone,
    autoCalculated: true
  });
  
  return {
    goalId: goal.id,
    userId: goal.user_id,
    currentAmount,
    targetAmount,
    progressPercentage,
    monthlyProgress,
    projectedCompletion,
    isOnTrack,
    milestone,
    recommendations
  };
}

// Track progress for all user goals
export async function trackAllGoalsProgress(userId: string): Promise<GoalProgress[]> {
  const goals = await prisma.goals.findMany({
    where: { user_id: userId, is_active: true }
  });
  
  const progressReports = await Promise.all(
    goals.map(goal => trackGoalProgress(goal.id))
  );
  
  return progressReports;
}

// Get transactions related to a goal
async function getGoalRelatedTransactions(userId: string, goalName: string) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  // Map goal names to transaction categories
  const categoryMapping: Record<string, string[]> = {
    'Emergency Fund': ['Transfer', 'Savings', 'Deposit'],
    'Retirement': ['401k', 'IRA', 'Retirement', 'Investment'],
    'Debt Payoff': ['Loan Payment', 'Credit Card Payment', 'Debt'],
    'Home Purchase': ['Savings', 'Home Savings'],
    'Investment': ['Investment', 'Brokerage', 'Stocks'],
    'Education': ['529', 'Education', 'College'],
    'Vacation': ['Travel Savings', 'Vacation Fund'],
    'Car Purchase': ['Auto Savings', 'Car Fund']
  };
  
  const relevantCategories = categoryMapping[goalName] || ['Savings'];
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: { gte: oneMonthAgo },
      OR: relevantCategories.map(cat => ({
        category: { contains: cat, mode: 'insensitive' }
      }))
    }
  });
  
  return transactions;
}

// Calculate monthly progress from transactions
function calculateMonthlyProgress(transactions: any[]): number {
  const totalSaved = transactions.reduce((sum, tx) => {
    // Negative amounts are typically savings/investments
    return sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0);
  }, 0);
  
  return totalSaved;
}

// Determine milestone based on progress
function getMilestone(progressPercentage: number): string | undefined {
  if (progressPercentage >= 100) return 'Goal Completed! 🎉';
  if (progressPercentage >= 90) return '90% Complete - Final Stretch!';
  if (progressPercentage >= 75) return '75% Complete - Three Quarters There!';
  if (progressPercentage >= 50) return '50% Complete - Halfway Point!';
  if (progressPercentage >= 25) return '25% Complete - Quarter Milestone!';
  if (progressPercentage >= 10) return 'Getting Started - 10% Complete';
  return undefined;
}

// Generate recommendations based on progress
function generateRecommendations(
  progress: number,
  monthlyProgress: number,
  isOnTrack: boolean,
  goalName: string
): string[] {
  const recommendations: string[] = [];
  
  if (!isOnTrack) {
    recommendations.push('Consider increasing your monthly contribution to get back on track');
    
    if (monthlyProgress < 100) {
      recommendations.push('Set up automatic transfers to ensure consistent progress');
    }
  }
  
  if (progress < 25 && monthlyProgress === 0) {
    recommendations.push('Start with a small, achievable monthly contribution');
    recommendations.push('Review your budget to find areas where you can save');
  }
  
  if (progress > 75) {
    recommendations.push('You\'re close to your goal! Stay consistent');
    recommendations.push('Consider what your next financial goal will be');
  }
  
  // Goal-specific recommendations
  if (goalName.includes('Emergency')) {
    if (progress < 50) {
      recommendations.push('Prioritize building your emergency fund before other goals');
    }
  } else if (goalName.includes('Debt')) {
    recommendations.push('Consider the avalanche or snowball method for faster payoff');
  } else if (goalName.includes('Retirement')) {
    recommendations.push('Check if your employer offers matching contributions');
  }
  
  return recommendations;
}

// Save progress record to database
async function saveProgressRecord(
  goalId: string,
  userId: string,
  data: {
    progressAmount: number;
    progressPercentage: number;
    milestone?: string;
    autoCalculated: boolean;
  }
) {
  // Check if we have a progress table, if not, update the goal directly
  try {
    // Update the goal with current progress
    await prisma.goals.update({
      where: { id: goalId },
      data: {
        current_amount: data.progressAmount,
        updated_at: new Date()
      }
    });
    
    // Store in financial_insights for notifications
    if (data.milestone) {
      await prisma.financial_insights.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          insight_type: 'goal_milestone',
          title: `Goal Milestone Reached`,
          description: data.milestone,
          severity: 'info',
          data: {
            goalId,
            progress: data.progressPercentage,
            milestone: data.milestone
          },
          is_read: false,
          created_at: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error saving progress record:', error);
  }
}

// Generate notifications for goal progress
export async function generateProgressNotifications(
  userId: string
): Promise<ProgressNotification[]> {
  const notifications: ProgressNotification[] = [];
  const progressReports = await trackAllGoalsProgress(userId);
  
  for (const report of progressReports) {
    // Milestone notifications
    if (report.milestone) {
      notifications.push({
        type: 'milestone',
        goalId: report.goalId,
        title: 'Goal Milestone Reached!',
        message: report.milestone,
        severity: 'success'
      });
    }
    
    // Warning notifications
    if (!report.isOnTrack && report.progressPercentage < 50) {
      notifications.push({
        type: 'warning',
        goalId: report.goalId,
        title: 'Goal Behind Schedule',
        message: 'Your goal may not be completed by the target date',
        severity: 'warning',
        actionRequired: true
      });
    }
    
    // Achievement notifications
    if (report.progressPercentage >= 100) {
      notifications.push({
        type: 'achievement',
        goalId: report.goalId,
        title: 'Goal Completed!',
        message: 'Congratulations on achieving your financial goal!',
        severity: 'success'
      });
    }
    
    // Monthly update notifications
    if (report.monthlyProgress > 0) {
      notifications.push({
        type: 'update',
        goalId: report.goalId,
        title: 'Monthly Progress Update',
        message: `You saved $${report.monthlyProgress.toFixed(2)} this month`,
        severity: 'info'
      });
    }
  }
  
  // Save notifications to database
  for (const notification of notifications) {
    await prisma.financial_insights.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        insight_type: notification.type,
        title: notification.title,
        description: notification.message,
        severity: notification.severity,
        data: { goalId: notification.goalId },
        is_read: false,
        created_at: new Date()
      }
    });
  }
  
  return notifications;
}

// Update goal progress based on account balances
export async function updateGoalProgressFromAccounts(userId: string) {
  const goals = await prisma.goals.findMany({
    where: { user_id: userId, is_active: true }
  });
  
  const accounts = await prisma.accounts.findMany({
    where: { user_id: userId, is_active: true }
  });
  
  // Map goals to relevant account types
  const goalAccountMapping: Record<string, string[]> = {
    'Emergency Fund': ['savings', 'money_market'],
    'Retirement': ['401k', 'ira', 'retirement'],
    'Investment': ['investment', 'brokerage'],
    'Education': ['529', 'education']
  };
  
  for (const goal of goals) {
    const relevantAccountTypes = goalAccountMapping[goal.name] || ['savings'];
    
    const relevantAccounts = accounts.filter(account => 
      relevantAccountTypes.some(type => 
        account.type?.toLowerCase().includes(type) ||
        account.subtype?.toLowerCase().includes(type)
      )
    );
    
    const totalBalance = relevantAccounts.reduce((sum, account) => {
      return sum + Number(account.balance || 0);
    }, 0);
    
    // Update goal progress if it's linked to specific accounts
    if (relevantAccounts.length > 0) {
      await prisma.goals.update({
        where: { id: goal.id },
        data: {
          current_amount: totalBalance,
          updated_at: new Date()
        }
      });
    }
  }
}

// Schedule monthly progress check (to be called by a cron job)
export async function monthlyProgressCheck() {
  const users = await prisma.users.findMany({
    where: { is_active: true }
  });
  
  for (const user of users) {
    try {
      // Update progress from accounts
      await updateGoalProgressFromAccounts(user.id);
      
      // Generate notifications
      await generateProgressNotifications(user.id);
      
      console.log(`Progress check completed for user ${user.id}`);
    } catch (error) {
      console.error(`Error checking progress for user ${user.id}:`, error);
    }
  }
}
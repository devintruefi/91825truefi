import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { 
  calculateRealisticGoalTarget, 
  getUserFinancialContext 
} from '@/lib/goals/calculator';
import { trackGoalProgress } from '@/lib/goals/progress-tracker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Calculate and update goal targets
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { goalId, goalType, recalculate } = await request.json();
    
    // Get user's financial context
    const context = await getUserFinancialContext(user.id);
    
    if (goalId) {
      // Update existing goal
      const goal = await prisma.goals.findUnique({
        where: { id: goalId }
      });
      
      if (!goal || goal.user_id !== user.id) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      
      const calculation = await calculateRealisticGoalTarget(
        goal.name,
        context
      );
      
      // Update goal with calculated values
      await prisma.goals.update({
        where: { id: goalId },
        data: {
          target_amount: calculation.targetAmount,
          target_date: new Date(Date.now() + calculation.timeframeMonths * 30 * 24 * 60 * 60 * 1000),
          updated_at: new Date()
        }
      });
      
      // Track progress
      const progress = await trackGoalProgress(goalId);
      
      return NextResponse.json({
        success: true,
        calculation,
        progress,
        message: `Goal target updated based on your financial situation`
      });
      
    } else if (goalType) {
      // Calculate for new goal
      const calculation = await calculateRealisticGoalTarget(
        goalType,
        context
      );
      
      return NextResponse.json({
        success: true,
        calculation,
        context: {
          monthlyIncome: context.monthlyIncome,
          monthlyExpenses: context.monthlyExpenses,
          disposableIncome: context.monthlyIncome - context.monthlyExpenses
        }
      });
      
    } else if (recalculate) {
      // Recalculate all goals
      const goals = await prisma.goals.findMany({
        where: { user_id: user.id, is_active: true }
      });
      
      const updates = await Promise.all(
        goals.map(async (goal) => {
          const calculation = await calculateRealisticGoalTarget(
            goal.name,
            context
          );
          
          await prisma.goals.update({
            where: { id: goal.id },
            data: {
              target_amount: calculation.targetAmount,
              target_date: new Date(Date.now() + calculation.timeframeMonths * 30 * 24 * 60 * 60 * 1000),
              updated_at: new Date()
            }
          });
          
          return {
            goalId: goal.id,
            goalName: goal.name,
            ...calculation
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        updates,
        message: `Updated ${updates.length} goals based on your current financial situation`
      });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Error calculating goal targets:', error);
    return NextResponse.json(
      { error: 'Failed to calculate goal targets' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET: Get calculated recommendations for goals
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const context = await getUserFinancialContext(user.id);
    
    // Common goal types with recommendations
    const goalTypes = [
      'Emergency Fund',
      'Retirement',
      'Debt Payoff',
      'Home Purchase',
      'Investment',
      'Education',
      'Vacation'
    ];
    
    const recommendations = await Promise.all(
      goalTypes.map(async (type) => {
        const calculation = await calculateRealisticGoalTarget(type, context);
        return {
          type,
          ...calculation
        };
      })
    );
    
    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    
    return NextResponse.json({
      recommendations,
      financialContext: {
        monthlyIncome: context.monthlyIncome,
        monthlyExpenses: context.monthlyExpenses,
        disposableIncome: Math.max(0, context.monthlyIncome - context.monthlyExpenses),
        currentSavings: context.currentSavings,
        riskProfile: context.riskTolerance <= 3 ? 'Conservative' : 
                     context.riskTolerance <= 7 ? 'Moderate' : 'Aggressive'
      }
    });
    
  } catch (error) {
    console.error('Error getting goal recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
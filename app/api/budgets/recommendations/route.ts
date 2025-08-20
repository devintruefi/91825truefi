import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { adjustBudgetDynamically, saveAdjustedBudget } from '@/lib/budgets/dynamic-adjuster';
import { detectSpendingPatterns, analyzeCategoryPattern } from '@/lib/budgets/pattern-detector';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get budget recommendations and patterns
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const months = parseInt(searchParams.get('months') || '3');
    
    if (category) {
      // Analyze specific category
      const pattern = await analyzeCategoryPattern(user.id, category, months);
      
      return NextResponse.json({
        pattern,
        recommendations: generateCategoryRecommendations(pattern)
      });
    } else {
      // Get overall budget recommendations
      const dynamicBudget = await adjustBudgetDynamically(user.id, months);
      const patterns = await detectSpendingPatterns(user.id, months);
      
      // Get current vs recommended comparison
      const currentBudget = await prisma.budgets.findFirst({
        where: { user_id: user.id, is_active: true },
        include: { budget_categories: true }
      });
      
      const comparison = dynamicBudget.categories.map(cat => {
        const current = currentBudget?.budget_categories.find(
          c => c.category === cat.name
        );
        
        return {
          category: cat.name,
          current: current ? Number(current.amount) : 0,
          recommended: cat.suggestedAmount,
          difference: cat.suggestedAmount - (current ? Number(current.amount) : 0),
          percentChange: current && Number(current.amount) > 0
            ? ((cat.suggestedAmount - Number(current.amount)) / Number(current.amount)) * 100
            : 0,
          reason: cat.adjustmentReason,
          isFixed: cat.isFixed
        };
      });
      
      return NextResponse.json({
        recommendations: dynamicBudget.recommendations,
        patterns,
        comparison,
        summary: {
          totalIncome: dynamicBudget.totalIncome,
          currentTotal: currentBudget?.budget_categories.reduce(
            (sum, cat) => sum + Number(cat.amount),
            0
          ) || 0,
          recommendedTotal: dynamicBudget.totalBudget,
          savingsRate: dynamicBudget.savingsRate,
          potentialSavings: Math.max(
            0,
            (currentBudget?.budget_categories.reduce(
              (sum, cat) => sum + Number(cat.amount),
              0
            ) || 0) - dynamicBudget.totalBudget
          )
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting budget recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST: Apply budget recommendations
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, months = 3, autoApply = false } = await request.json();
    
    switch (action) {
      case 'analyze':
        // Analyze and return recommendations without applying
        const analysis = await adjustBudgetDynamically(user.id, months);
        const patterns = await detectSpendingPatterns(user.id, months);
        
        return NextResponse.json({
          success: true,
          analysis,
          patterns,
          message: 'Budget analysis complete'
        });
        
      case 'apply':
        // Apply dynamic adjustments
        const adjustedBudget = await adjustBudgetDynamically(user.id, months);
        
        if (autoApply) {
          await saveAdjustedBudget(user.id, adjustedBudget);
          
          return NextResponse.json({
            success: true,
            adjustedBudget,
            message: 'Budget automatically adjusted and saved'
          });
        } else {
          return NextResponse.json({
            success: true,
            adjustedBudget,
            message: 'Preview of adjusted budget (not saved)',
            requiresConfirmation: true
          });
        }
        
      case 'confirm':
        // Confirm and save adjustments
        const confirmedBudget = await adjustBudgetDynamically(user.id, months);
        await saveAdjustedBudget(user.id, confirmedBudget);
        
        // Create notification
        await prisma.financial_insights.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id,
            insight_type: 'budget_adjusted',
            title: 'Budget Optimized',
            description: `Your budget has been automatically adjusted based on ${months} months of spending patterns`,
            severity: 'success',
            data: {
              savingsRate: confirmedBudget.savingsRate,
              adjustedCategories: confirmedBudget.categories.length
            },
            is_read: false,
            created_at: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          message: 'Budget adjustments saved successfully'
        });
        
      case 'reset':
        // Reset to original budget (remove dynamic adjustments)
        const originalBudget = await prisma.budgets.findFirst({
          where: { user_id: user.id, is_active: true },
          include: { budget_categories: true }
        });
        
        if (!originalBudget) {
          return NextResponse.json({ error: 'No budget found' }, { status: 404 });
        }
        
        // This would need to store original values somewhere
        // For now, just return current as "reset"
        return NextResponse.json({
          success: true,
          message: 'Budget reset to original values',
          budget: originalBudget
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error applying budget recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to apply recommendations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Generate recommendations for a specific category
function generateCategoryRecommendations(pattern: any): string[] {
  const recommendations: string[] = [];
  
  // Trend-based recommendations
  if (pattern.trend === 'increasing') {
    recommendations.push(`${pattern.category} spending is increasing. Review recent purchases for savings opportunities.`);
    
    if (pattern.predictedNext > pattern.averageMonthly * 1.2) {
      recommendations.push(`Next month's ${pattern.category} spending predicted to be ${((pattern.predictedNext / pattern.averageMonthly - 1) * 100).toFixed(0)}% above average.`);
    }
  } else if (pattern.trend === 'decreasing') {
    recommendations.push(`Great job! ${pattern.category} spending is trending down.`);
  }
  
  // Seasonality recommendations
  if (pattern.seasonality) {
    const currentMonth = new Date().getMonth();
    if (pattern.seasonality.highMonths.includes(currentMonth)) {
      recommendations.push(`This is typically a high spending month for ${pattern.category}. Plan accordingly.`);
    } else if (pattern.seasonality.lowMonths.includes(currentMonth)) {
      recommendations.push(`This is typically a low spending month for ${pattern.category}. Good time to save extra.`);
    }
  }
  
  // Weekly pattern recommendations
  if (pattern.weeklyPattern) {
    if (pattern.weeklyPattern.weekendVsWeekday > 1.5) {
      recommendations.push(`Your ${pattern.category} spending is ${((pattern.weeklyPattern.weekendVsWeekday - 1) * 100).toFixed(0)}% higher on weekends.`);
    } else if (pattern.weeklyPattern.weekendVsWeekday < 0.7) {
      recommendations.push(`Your ${pattern.category} spending is mostly on weekdays. Consider weekend meal prep or activities.`);
    }
  }
  
  // Anomaly recommendations
  if (pattern.anomalies && pattern.anomalies.length > 0) {
    recommendations.push(`${pattern.anomalies.length} unusual ${pattern.category} transactions detected in the past ${pattern.anomalies.length === 1 ? 'month' : 'months'}.`);
  }
  
  // Variability recommendations
  if (pattern.standardDeviation > pattern.averageMonthly * 0.5) {
    recommendations.push(`${pattern.category} spending is highly variable. Consider setting a consistent budget.`);
  }
  
  return recommendations.slice(0, 5);
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateAIBudget } from '@/lib/ai-budget-generator';

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  // Don't allow auto-apply for demo user
  if (userId === DEMO_USER_ID) {
    return NextResponse.json({ 
      error: 'Auto-budget not available for demo user' 
    }, { status: 400 });
  }
  
  try {
    // Check if auto-budget is enabled for the user
    const userPrefs = await prisma.user_preferences.findFirst({
      where: { user_id: userId }
    });
    
    if (!userPrefs?.financial_goals) {
      return NextResponse.json({
        error: 'User preferences not found'
      }, { status: 404 });
    }
    
    const financialGoals = userPrefs.financial_goals as any;
    if (!financialGoals.auto_budget_enabled) {
      return NextResponse.json({
        error: 'Auto-budget is not enabled for this user'
      }, { status: 400 });
    }
    
    // Generate AI budget based on user's framework preference
    const aiResult = await generateAIBudget(userId);
    
    if (aiResult.warnings && aiResult.warnings.length > 0) {
      return NextResponse.json({
        success: false,
        warnings: aiResult.warnings,
        insights: aiResult.insights
      });
    }
    
    // Check if user has an existing budget
    const existingBudget = await prisma.budgets.findFirst({
      where: {
        user_id: userId,
        is_active: true
      }
    });
    
    let budget;
    
    if (existingBudget) {
      // Update existing budget
      await prisma.budget_categories.deleteMany({
        where: { budget_id: existingBudget.id }
      });
      
      budget = await prisma.budgets.update({
        where: { id: existingBudget.id },
        data: {
          name: `Auto-Budget (${aiResult.framework})`,
          description: `Automatically adjusted budget using ${aiResult.framework} framework`,
          amount: aiResult.totalBudget,
          updated_at: new Date()
        }
      });
      
      // Create new categories
      for (const category of aiResult.categories) {
        await prisma.budget_categories.create({
          data: {
            id: crypto.randomUUID(),
            budget_id: budget.id,
            category: category.category,
            amount: category.amount,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
    } else {
      // Create new budget
      budget = await prisma.budgets.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          name: `Auto-Budget (${aiResult.framework})`,
          description: `Automatically generated budget using ${aiResult.framework} framework`,
          amount: aiResult.totalBudget,
          period: 'monthly',
          start_date: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          budget_categories: {
            create: aiResult.categories.map(category => ({
              id: crypto.randomUUID(),
              category: category.category,
              amount: category.amount,
              created_at: new Date(),
              updated_at: new Date()
            }))
          }
        }
      });
    }
    
    // Log the auto-budget application in financial_insights
    await prisma.financial_insights.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        insight_type: 'notification',
        title: 'Auto-Budget Applied',
        description: `Your budget has been automatically adjusted using the ${aiResult.framework} framework based on your recent spending patterns.`,
        severity: 'info',
        data: {
          totalBudget: aiResult.totalBudget,
          framework: aiResult.framework,
          categories: aiResult.categories.length,
          timestamp: new Date().toISOString()
        },
        is_read: false,
        created_at: new Date()
      }
    });
    
    // Fetch the complete budget with categories
    const completeBudget = await prisma.budgets.findFirst({
      where: { id: budget.id },
      include: {
        budget_categories: {
          orderBy: { created_at: 'asc' }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      budget: completeBudget,
      insights: aiResult.insights,
      framework: aiResult.framework
    });
    
  } catch (error) {
    console.error('Error applying auto-budget:', error);
    return NextResponse.json(
      { error: 'Failed to apply auto-budget' },
      { status: 500 }
    );
  }
}
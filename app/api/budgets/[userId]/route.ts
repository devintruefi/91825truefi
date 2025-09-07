import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { categorizeBudgetTransaction, resolveBudgetCategory } from '@/lib/categorization';
import { generateAIBudget } from '@/lib/ai-budget-generator';
import { getUserFromRequest } from '@/lib/auth';
import { 
  DEMO_USER_ID, 
  DEMO_ESSENTIALS_CATEGORIES, 
  DEMO_LIFESTYLE_CATEGORIES, 
  DEMO_SAVINGS_CATEGORIES,
  getDemoDefaultAmount 
} from '@/lib/mock-data';

async function analyzeUserSpending(userId: string, months: number = 3) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  // Get user preferences for pending transactions
  const userPreferences = await prisma.user_preferences.findUnique({
    where: { user_id: userId }
  });
  const financialGoals = userPreferences?.financial_goals as any;
  const includePending = financialGoals?.['include_pending_transactions'] ?? false;
  
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lte: endDate
      },
      // Only include pending if user preference allows
      ...(includePending ? {} : { pending: false })
    },
    orderBy: {
      date: 'desc'
    },
    select: {
      amount: true,
      category: true,
      category_id: true,
      pending: true
    }
  });
  
  const spendingByCategory: Record<string, number> = {};
  let totalSpending = 0;
  
  for (const tx of transactions) {
    // Use DB-backed categorization for real users, fallback for demo
    const category = userId === DEMO_USER_ID 
      ? categorizeBudgetTransaction(tx.category)
      : await resolveBudgetCategory(userId, tx.category_id, tx.category);
    
    // Skip income and transfers
    if (category === 'Income' || category === 'Transfer') {
      continue;
    }
    
    const amount = Number(tx.amount);
    
    // Handle refunds (negative amounts)
    if (amount < 0) {
      // Refund - subtract from category spending
      spendingByCategory[category] = (spendingByCategory[category] || 0) - Math.abs(amount);
      totalSpending -= Math.abs(amount);
    } else {
      // Normal expense - add to category spending
      spendingByCategory[category] = (spendingByCategory[category] || 0) + amount;
      totalSpending += amount;
    }
  }
  
  const averageMonthlySpending = totalSpending / months;
  
  return {
    totalSpending,
    spendingByCategory,
    averageMonthlySpending,
    transactions
  };
}

// Only used for demo user now
async function generateSmartBudgetForDemo(userId: string) {
  const analysis = await analyzeUserSpending(userId);
  
  // Get user preferences for budget targets
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { default_checking_buffer: true }
  });
  const userPreferences = await prisma.user_preferences.findUnique({
    where: { user_id: userId }
  });
  
  const checkingBuffer = Number(user?.default_checking_buffer || 2000);
  const financialGoals = userPreferences?.financial_goals as any;
  const savingsTarget = financialGoals?.['target_savings_percent'] || 20;
  const budgetFramework = financialGoals?.['budget_framework'] || '50/30/20';
  
  const suggestedTotalBudget = Math.max(
    analysis.averageMonthlySpending * 1.1,
    3000
  );
  
  const budgetCategories: Array<{ category: string; amount: number; priority: string }> = [];
  
  for (const [category, currentSpending] of Object.entries(analysis.spendingByCategory)) {
    const monthlySpending = currentSpending / 3;
    let suggestedAmount = monthlySpending;
    let priority = 'medium';
    
    // For demo user, use the hardcoded category lists
    if (DEMO_ESSENTIALS_CATEGORIES.includes(category)) {
      suggestedAmount = monthlySpending * 1.05;
      priority = 'high';
    } else if (DEMO_LIFESTYLE_CATEGORIES.includes(category)) {
      if (monthlySpending > suggestedTotalBudget * 0.15) {
        suggestedAmount = monthlySpending * 0.9;
        priority = 'high';
      } else {
        suggestedAmount = monthlySpending * 1.02;
        priority = 'medium';
      }
    } else if (DEMO_SAVINGS_CATEGORIES.includes(category)) {
      if (monthlySpending < suggestedTotalBudget * (savingsTarget / 100)) {
        suggestedAmount = suggestedTotalBudget * (savingsTarget / 100);
        priority = 'high';
      } else {
        suggestedAmount = monthlySpending * 1.1;
        priority = 'medium';
      }
    }
    
    budgetCategories.push({
      category,
      amount: Math.round(suggestedAmount),
      priority
    });
  }
  
  // Add missing essential categories for demo
  const existingCategories = budgetCategories.map(c => c.category);
  for (const essential of DEMO_ESSENTIALS_CATEGORIES) {
    if (!existingCategories.includes(essential)) {
      budgetCategories.push({
        category: essential,
        amount: getDemoDefaultAmount(essential),
        priority: 'high'
      });
    }
  }
  
  // Ensure savings category exists
  if (!existingCategories.includes('Savings')) {
    budgetCategories.push({
      category: 'Savings',
      amount: Math.round(suggestedTotalBudget * (savingsTarget / 100)),
      priority: 'high'
    });
  }
  
  return {
    totalBudget: Math.round(suggestedTotalBudget),
    categories: budgetCategories
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Check authentication
  const user = await getUserFromRequest(req);
  console.log('Budget GET auth check:', { user, userId, match: user?.id === userId });
  if (!user || user.id !== userId) {
    console.error('Auth failed:', { userFromToken: user?.id, requestedUserId: userId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const budget = await prisma.budgets.findFirst({
      where: { 
        user_id: userId, 
        is_active: true 
      },
      include: {
        budget_categories: {
          orderBy: { created_at: 'asc' }
        }
      }
    });
    if (!budget) {
      // Don't auto-create budget for new users - they should go through onboarding
      // Only create a smart budget if the user has transaction history
      const hasTransactions = await prisma.transactions.findFirst({
        where: { user_id: userId }
      });
      
      if (hasTransactions) {
        // For demo user, use the old simple generation
        if (userId === DEMO_USER_ID) {
          const smartBudget = await generateSmartBudgetForDemo(userId);
          const newBudget = await prisma.budgets.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              name: 'Smart Monthly Budget',
              description: 'AI-generated budget based on your spending patterns',
              amount: smartBudget.totalBudget,
              period: 'monthly',
              start_date: new Date(),
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              budget_categories: {
                create: smartBudget.categories.map(category => ({
                  id: crypto.randomUUID(),
                  category: category.category,
                  amount: category.amount,
                  created_at: new Date(),
                  updated_at: new Date()
                }))
              }
            },
            include: {
              budget_categories: {
                orderBy: { created_at: 'asc' }
              }
            }
          });
          return NextResponse.json(newBudget);
        }
        
        // For logged-in users, use the new AI budget generator
        try {
          const aiResult = await generateAIBudget(userId);
          
          if (aiResult.warnings && aiResult.warnings.length > 0) {
            // If there are warnings (like no income), return null
            return NextResponse.json({
              budget: null,
              warnings: aiResult.warnings,
              insights: aiResult.insights
            });
          }
          
          const newBudget = await prisma.budgets.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              name: `AI ${aiResult.framework} Budget`,
              description: `AI-generated budget using ${aiResult.framework} framework`,
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
            },
            include: {
              budget_categories: {
                orderBy: { created_at: 'asc' }
              }
            }
          });
          
          return NextResponse.json({
            ...newBudget,
            insights: aiResult.insights,
            framework: aiResult.framework
          });
        } catch (aiError) {
          console.error('AI budget generation failed, falling back:', aiError);
          // Fallback to simple generation if AI fails
          const smartBudget = await generateSmartBudget(userId);
          const newBudget = await prisma.budgets.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              name: 'Smart Monthly Budget',
              description: 'Budget based on your spending patterns',
              amount: smartBudget.totalBudget,
              period: 'monthly',
              start_date: new Date(),
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
              budget_categories: {
                create: smartBudget.categories.map(category => ({
                  id: crypto.randomUUID(),
                  category: category.category,
                  amount: category.amount,
                  created_at: new Date(),
                  updated_at: new Date()
                }))
              }
            },
            include: {
              budget_categories: {
                orderBy: { created_at: 'asc' }
              }
            }
          });
          return NextResponse.json(newBudget);
        }
      }
      
      // Return null/empty budget for new users
      return NextResponse.json(null);
    }
    const totalBudgetAmount = budget.budget_categories.reduce((sum, cat) => sum + Number(cat.amount), 0);
    if (totalBudgetAmount === 0) {
      // Regenerate budget if empty
      if (userId === DEMO_USER_ID) {
        // Use simple generation for demo user
        const smartBudget = await generateSmartBudget(userId);
        await prisma.budget_categories.deleteMany({
          where: { budget_id: budget.id }
        });
        await prisma.budgets.update({
          where: { id: budget.id },
          data: {
            amount: smartBudget.totalBudget,
            updated_at: new Date()
          }
        });
        for (const category of smartBudget.categories) {
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
        // Use AI generation for logged-in users
        try {
          const aiResult = await generateAIBudget(userId);
          
          if (!aiResult.warnings || aiResult.warnings.length === 0) {
            await prisma.budget_categories.deleteMany({
              where: { budget_id: budget.id }
            });
            
            await prisma.budgets.update({
              where: { id: budget.id },
              data: {
                name: `AI ${aiResult.framework} Budget`,
                description: `AI-generated budget using ${aiResult.framework} framework`,
                amount: aiResult.totalBudget,
                updated_at: new Date()
              }
            });
            
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
          }
        } catch (aiError) {
          console.error('AI budget regeneration failed:', aiError);
          // Fallback to simple generation
          const smartBudget = await generateSmartBudget(userId);
          await prisma.budget_categories.deleteMany({
            where: { budget_id: budget.id }
          });
          await prisma.budgets.update({
            where: { id: budget.id },
            data: {
              amount: smartBudget.totalBudget,
              updated_at: new Date()
            }
          });
          for (const category of smartBudget.categories) {
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
        }
      }
      
      const updatedBudget = await prisma.budgets.findFirst({
        where: { id: budget.id },
        include: {
          budget_categories: {
            orderBy: { created_at: 'asc' }
          }
        }
      });
      return NextResponse.json(updatedBudget);
    }
    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const body = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  try {
    const { budget, categories } = body;
    const updatedBudget = await prisma.budgets.update({
      where: { 
        user_id: userId,
        is_active: true 
      },
      data: {
        name: budget.name,
        description: budget.description,
        amount: budget.amount,
        updated_at: new Date()
      }
    });
    const updatedCategories = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const category of categories) {
        if (category.id) {
          const updated = await tx.budget_categories.update({
            where: { id: category.id },
            data: {
              category: category.category,
              amount: category.amount,
              updated_at: new Date()
            }
          });
          results.push(updated);
        } else {
          const created = await tx.budget_categories.create({
            data: {
              id: crypto.randomUUID(),
              budget_id: updatedBudget.id,
              category: category.category,
              amount: category.amount
            }
          });
          results.push(created);
        }
      }
      return results;
    });
    return NextResponse.json({
      budget: updatedBudget,
      categories: updatedCategories
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  try {
    await prisma.budget_categories.deleteMany({
      where: {
        budget: {
          user_id: userId,
          is_active: true
        }
      }
    });
    await prisma.budgets.deleteMany({
      where: {
        user_id: userId,
        is_active: true
      }
    });
    return NextResponse.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
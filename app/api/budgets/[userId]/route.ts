import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { categorizeBudgetTransaction } from '@/lib/categorization';
import { generateAIBudget } from '@/lib/ai-budget-generator';

// Keep these for demo user functionality
const ESSENTIALS_CATEGORIES = [
  'Housing', 'Transportation', 'Food & Dining', 'Utilities', 
  'Healthcare', 'Insurance', 'Debt Payments', 'Basic Groceries'
];

const LIFESTYLE_CATEGORIES = [
  'Entertainment', 'Shopping', 'Personal Care', 'Dining Out',
  'Travel', 'Hobbies', 'Subscriptions', 'Fitness'
];

const SAVINGS_CATEGORIES = [
  'Savings', 'Investments', 'Emergency Fund', 'Retirement',
  'Education', 'Major Purchases'
];

const CATEGORY_MAPPING: Record<string, string> = {
  'Food and Drink': 'Food & Dining',
  'Restaurants': 'Dining Out',
  'Fast Food': 'Dining Out',
  'Coffee Shops': 'Dining Out',
  'Bars': 'Entertainment',
  'Transportation': 'Transportation',
  'Public Transportation': 'Transportation',
  'Ride Share': 'Transportation',
  'Gas Stations': 'Transportation',
  'Parking': 'Transportation',
  'Shopping': 'Shopping',
  'Online Shopping': 'Shopping',
  'Department Stores': 'Shopping',
  'Clothing Stores': 'Shopping',
  'Electronics Stores': 'Shopping',
  'Home Improvement': 'Housing',
  'Furniture': 'Housing',
  'Rent': 'Housing',
  'Mortgage': 'Housing',
  'Utilities': 'Utilities',
  'Electric': 'Utilities',
  'Water': 'Utilities',
  'Internet': 'Utilities',
  'Phone': 'Utilities',
  'Healthcare': 'Healthcare',
  'Doctors': 'Healthcare',
  'Pharmacies': 'Healthcare',
  'Insurance': 'Insurance',
  'Entertainment': 'Entertainment',
  'Movies': 'Entertainment',
  'Gyms': 'Fitness',
  'Personal Care': 'Personal Care',
  'Salons': 'Personal Care',
  'Travel': 'Travel',
  'Hotels': 'Travel',
  'Airlines': 'Travel',
  'Savings': 'Savings',
  'Investments': 'Investments',
  'Education': 'Education',
  'Student Loans': 'Debt Payments',
  'Credit Cards': 'Debt Payments',
  'Loans': 'Debt Payments'
};

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

function mapTransactionCategory(transactionCategory: string): string {
  if (CATEGORY_MAPPING[transactionCategory]) {
    return CATEGORY_MAPPING[transactionCategory];
  }
  const lowerCategory = transactionCategory.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
      return value;
    }
  }
  if (lowerCategory.includes('food') || lowerCategory.includes('restaurant') || lowerCategory.includes('dining')) {
    return 'Food & Dining';
  }
  if (lowerCategory.includes('transport') || lowerCategory.includes('uber') || lowerCategory.includes('lyft')) {
    return 'Transportation';
  }
  if (lowerCategory.includes('shop') || lowerCategory.includes('store') || lowerCategory.includes('amazon')) {
    return 'Shopping';
  }
  if (lowerCategory.includes('entertain') || lowerCategory.includes('movie') || lowerCategory.includes('netflix')) {
    return 'Entertainment';
  }
  if (lowerCategory.includes('health') || lowerCategory.includes('medical') || lowerCategory.includes('doctor')) {
    return 'Healthcare';
  }
  return 'Miscellaneous';
}

function getDefaultAmount(category: string): number {
  const defaults: Record<string, number> = {
    'Housing': 1500,
    'Transportation': 400,
    'Food & Dining': 600,
    'Utilities': 200,
    'Healthcare': 300,
    'Insurance': 200,
    'Debt Payments': 500,
    'Basic Groceries': 400,
    'Entertainment': 200,
    'Shopping': 300,
    'Personal Care': 100,
    'Dining Out': 200,
    'Travel': 100,
    'Hobbies': 100,
    'Subscriptions': 50,
    'Fitness': 50,
    'Savings': 500,
    'Investments': 200,
    'Emergency Fund': 200,
    'Retirement': 300,
    'Education': 100,
    'Major Purchases': 100
  };
  return defaults[category] || 100;
}

async function analyzeUserSpending(userId: string, months: number = 3) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const transactions = await prisma.transactions.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lte: endDate
      },
      amount: {
        gt: 0
      }
    },
    orderBy: {
      date: 'desc'
    }
  });
  const totalSpending = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const averageMonthlySpending = totalSpending / months;
  const spendingByCategory: Record<string, number> = {};
  transactions.forEach(tx => {
    const category = categorizeBudgetTransaction(tx.category);
    spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(tx.amount);
  });
  return {
    totalSpending,
    spendingByCategory,
    averageMonthlySpending,
    transactions
  };
}

async function generateSmartBudget(userId: string) {
  const analysis = await analyzeUserSpending(userId);
  const suggestedTotalBudget = Math.max(
    analysis.averageMonthlySpending * 1.1,
    3000
  );
  const budgetCategories: Array<{ category: string; amount: number; priority: string }> = [];
  for (const [category, currentSpending] of Object.entries(analysis.spendingByCategory)) {
    const monthlySpending = currentSpending / 3;
    let suggestedAmount = monthlySpending;
    let priority = 'medium';
    if (ESSENTIALS_CATEGORIES.includes(category)) {
      suggestedAmount = monthlySpending * 1.05;
      priority = 'high';
    } else if (LIFESTYLE_CATEGORIES.includes(category)) {
      if (monthlySpending > suggestedTotalBudget * 0.15) {
        suggestedAmount = monthlySpending * 0.9;
        priority = 'high';
      } else {
        suggestedAmount = monthlySpending * 1.02;
        priority = 'medium';
      }
    } else if (SAVINGS_CATEGORIES.includes(category)) {
      if (monthlySpending < suggestedTotalBudget * 0.1) {
        suggestedAmount = suggestedTotalBudget * 0.15;
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
  const existingCategories = budgetCategories.map(c => c.category);
  for (const essential of ESSENTIALS_CATEGORIES) {
    if (!existingCategories.includes(essential)) {
      budgetCategories.push({
        category: essential,
        amount: getDefaultAmount(essential),
        priority: 'high'
      });
    }
  }
  if (!existingCategories.includes('Savings')) {
    budgetCategories.push({
      category: 'Savings',
      amount: Math.round(suggestedTotalBudget * 0.15),
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
          const smartBudget = await generateSmartBudget(userId);
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
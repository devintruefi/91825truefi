import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Fetch user's budget and categories
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Get the active budget for the user
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
      // Create a default budget if none exists
      const defaultBudget = await prisma.budgets.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          name: 'Monthly Budget',
          description: 'Your monthly spending plan',
          amount: 0,
          period: 'monthly',
          start_date: new Date(),
          is_active: true,
          budget_categories: {
            create: [
              { id: crypto.randomUUID(), category: 'Housing', amount: 0 },
              { id: crypto.randomUUID(), category: 'Transportation', amount: 0 },
              { id: crypto.randomUUID(), category: 'Food & Dining', amount: 0 },
              { id: crypto.randomUUID(), category: 'Utilities', amount: 0 },
              { id: crypto.randomUUID(), category: 'Healthcare', amount: 0 },
              { id: crypto.randomUUID(), category: 'Entertainment', amount: 0 },
              { id: crypto.randomUUID(), category: 'Shopping', amount: 0 },
              { id: crypto.randomUUID(), category: 'Personal Care', amount: 0 },
              { id: crypto.randomUUID(), category: 'Insurance', amount: 0 },
              { id: crypto.randomUUID(), category: 'Savings', amount: 0 },
              { id: crypto.randomUUID(), category: 'Miscellaneous', amount: 0 },
            ]
          }
        },
        include: {
          budget_categories: {
            orderBy: { created_at: 'asc' }
          }
        }
      });
      
      return NextResponse.json(defaultBudget);
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// PUT: Update budget and categories
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const body = await req.json();
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const { budget, categories } = body;

    // Update budget
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

    // Update categories in a transaction
    const updatedCategories = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const category of categories) {
        if (category.id) {
          // Update existing category
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
          // Create new category
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
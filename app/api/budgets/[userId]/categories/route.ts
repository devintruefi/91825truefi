import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST: Add new budget category
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const body = await req.json();
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const { category, amount } = body;

    // Get the active budget
    const budget = await prisma.budgets.findFirst({
      where: { user_id: userId, is_active: true }
    });

    if (!budget) {
      return NextResponse.json({ error: 'No active budget found' }, { status: 404 });
    }

    const newCategory = await prisma.budget_categories.create({
      data: {
        id: crypto.randomUUID(),
        budget_id: budget.id,
        category,
        amount
      }
    });

    return NextResponse.json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transactionId } = await params;
  const { category } = await req.json();
  
  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  try {
    // First verify the transaction belongs to the user
    const transaction = await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        user_id: user.id
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction category
    const updatedTransaction = await prisma.transactions.update({
      where: { id: transactionId },
      data: { category }
    });

    // Create user-specific mapping for future transactions if plaid category exists
    if (transaction.category_id) {
      // Check if user already has a mapping for this plaid category
      const existingMapping = await prisma.transaction_categories.findFirst({
        where: {
          user_id: user.id,
          plaid_category_id: transaction.category_id
        }
      });

      if (existingMapping) {
        // Update existing mapping
        await prisma.transaction_categories.update({
          where: { id: existingMapping.id },
          data: {
            category_name: category,
            is_system_defined: false
          }
        });
      } else {
        // Create new user-specific mapping
        await prisma.transaction_categories.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id,
            category_name: category,
            plaid_category_id: transaction.category_id,
            is_system_defined: false,
            is_essential: ['Housing', 'Transportation', 'Food & Dining', 'Utilities', 'Healthcare', 'Insurance', 'Debt Payments'].includes(category),
            created_at: new Date()
          }
        });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      category, 
      source: 'user_override',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Define income-related categories
const INCOME_CATEGORIES = ['transfer', 'deposit', 'payroll', 'salary', 'wages', 'income'];

export async function PUT(req: NextRequest) {
  try {
    // Auth check
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { updates } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Invalid updates array' }, { status: 400 });
    }

    // Validate all updates have required fields
    for (const update of updates) {
      if (!update.transactionId || !update.category) {
        return NextResponse.json({
          error: 'Each update must have transactionId and category'
        }, { status: 400 });
      }
    }

    // Get all transaction IDs
    const transactionIds = updates.map(u => u.transactionId);

    // Fetch all original transactions to verify ownership and check category changes
    const originalTransactions = await prisma.transactions.findMany({
      where: {
        id: { in: transactionIds },
        user_id: user.id // Ensure user owns all transactions
      }
    });

    // Check if user owns all transactions
    if (originalTransactions.length !== transactionIds.length) {
      return NextResponse.json({
        error: 'Some transactions not found or unauthorized'
      }, { status: 403 });
    }

    // Create a map for quick lookup
    const transactionMap = new Map(
      originalTransactions.map(t => [t.id, t])
    );

    // Track income status changes
    const incomeChanges: any[] = [];

    // Perform bulk update using transaction
    const results = await prisma.$transaction(
      updates.map((update) => {
        const original = transactionMap.get(update.transactionId);

        // Check if this is changing to/from an income category
        if (original) {
          const oldIsIncome = original.category ?
            INCOME_CATEGORIES.some(cat => original.category?.toLowerCase().includes(cat)) : false;
          const newIsIncome = INCOME_CATEGORIES.some(cat => update.category.toLowerCase().includes(cat));

          if (oldIsIncome !== newIsIncome && original.amount > 0) {
            incomeChanges.push({
              transactionId: update.transactionId,
              from: original.category,
              to: update.category,
              wasIncome: oldIsIncome,
              isIncome: newIsIncome,
              amount: original.amount
            });
          }
        }

        return prisma.transactions.update({
          where: { id: update.transactionId },
          data: {
            category: update.category,
            updated_at: new Date()
          }
        });
      })
    );

    // Log income changes if any
    if (incomeChanges.length > 0) {
      console.log('Bulk update income category changes:', {
        userId: user.id,
        changes: incomeChanges,
        totalAffected: incomeChanges.length
      });
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      incomeChanges: incomeChanges.length,
      transactions: results
    });

  } catch (error) {
    console.error('Bulk transaction update error:', error);
    return NextResponse.json({
      error: 'Failed to update transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Alias POST to PUT for flexibility
  return PUT(req);
}
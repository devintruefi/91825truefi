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

    const { user_id, transaction_name, category, notes } = await req.json();

    // Validate required fields
    if (!user_id || !transaction_name || !category) {
      return NextResponse.json({
        error: 'Missing required fields: user_id, transaction_name, and category are required'
      }, { status: 400 });
    }

    // Ensure user can only update their own transactions
    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find all similar transactions (case-insensitive match on merchant_name or name)
    // Limited to last 90 days for performance and relevance
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const similarTransactions = await prisma.transactions.findMany({
      where: {
        user_id: user.id,
        date: {
          gte: ninetyDaysAgo
        },
        OR: [
          {
            merchant_name: {
              equals: transaction_name,
              mode: 'insensitive'
            }
          },
          {
            name: {
              equals: transaction_name,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        merchant_name: true,
        category: true,
        amount: true
      }
    });

    if (similarTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No similar transactions found',
        updated_count: 0,
        updated_transactions: []
      });
    }

    // Track income status changes
    const incomeChanges: any[] = [];

    // Check for income category changes
    for (const transaction of similarTransactions) {
      const oldIsIncome = transaction.category ?
        INCOME_CATEGORIES.some(cat => transaction.category?.toLowerCase().includes(cat)) : false;
      const newIsIncome = INCOME_CATEGORIES.some(cat => category.toLowerCase().includes(cat));

      if (oldIsIncome !== newIsIncome && transaction.amount > 0) {
        incomeChanges.push({
          transactionId: transaction.id,
          from: transaction.category,
          to: category,
          wasIncome: oldIsIncome,
          isIncome: newIsIncome,
          amount: transaction.amount
        });
      }
    }

    // Update all similar transactions
    const updateResult = await prisma.transactions.updateMany({
      where: {
        id: {
          in: similarTransactions.map(t => t.id)
        },
        user_id: user.id // Extra safety check
      },
      data: {
        category,
        ...(notes !== undefined && { notes }),
        updated_at: new Date()
      }
    });

    // Log income changes if any
    if (incomeChanges.length > 0) {
      console.log('Bulk similar update income category changes:', {
        userId: user.id,
        transactionName: transaction_name,
        changes: incomeChanges,
        totalAffected: incomeChanges.length
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.count} similar transactions`,
      updated_count: updateResult.count,
      updated_transactions: similarTransactions.map(t => t.id),
      income_changes: incomeChanges.length
    });

  } catch (error) {
    console.error('Bulk update similar transactions error:', error);
    return NextResponse.json({
      error: 'Failed to update similar transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Alias POST to PUT for flexibility
  return PUT(req);
}
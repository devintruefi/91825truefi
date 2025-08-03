import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Get pagination parameters from query string
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeTransactions = searchParams.get('includeTransactions') !== 'false';

  try {
    // Fetch accounts for the user
    const accountsRaw = await prisma.accounts.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        available_balance: true,
        currency: true,
      },
    });
    // Map balance to current_balance for frontend compatibility
    const accounts = accountsRaw.map(acc => ({
      ...acc,
      current_balance: acc.balance,
    }));

    // Fetch transactions with pagination (only if requested)
    let recent_transactions: any[] = [];
    let total_transactions = 0;
    
    if (includeTransactions) {
      // Get total count for pagination info
      total_transactions = await prisma.transactions.count({
        where: { user_id: userId },
      });

      // Fetch paginated transactions
      recent_transactions = await prisma.transactions.findMany({
        where: { user_id: userId },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          amount: true,
          name: true,
          merchant_name: true,
          category: true,
          date: true,
          pending: true,
          currency_code: true,
        },
      });
    }

    // Fetch goals for the user
    const goals = await prisma.goals.findMany({
      where: { user_id: userId, is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
        target_amount: true,
        current_amount: true,
        target_date: true,
        priority: true,
        is_active: true,
      },
    });

    return NextResponse.json({ 
      accounts, 
      recent_transactions, 
      goals,
      pagination: {
        total: total_transactions,
        limit,
        offset,
        hasMore: offset + limit < total_transactions
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
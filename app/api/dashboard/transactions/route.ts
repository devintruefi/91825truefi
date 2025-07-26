import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      console.log('No user found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15'); // Default to 15
    const skip = (page - 1) * limit;

    console.log(`Fetching transactions for user ${user.id}, page ${page}, limit ${limit}`);

    const transactions = await prisma.transactions.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        date: true,
        amount: true,
        category: true,
        name: true,
        merchant_name: true,
        pending: true,
        currency_code: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.transactions.count({ where: { user_id: user.id } });
    const hasMore = skip + limit < Math.min(total, 200); // Cap at 200

    console.log(`Found ${transactions.length} transactions, total: ${total}, hasMore: ${hasMore}`);

    return NextResponse.json({ transactions, hasMore });
  } catch (error) {
    console.error('Error in transactions API:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
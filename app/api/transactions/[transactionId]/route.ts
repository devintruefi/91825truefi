import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const { category } = await req.json();
  if (!transactionId || !category) {
    return NextResponse.json({ error: 'Missing transactionId or category' }, { status: 400 });
  }
  try {
    const updated = await prisma.transactions.update({
      where: { id: transactionId },
      data: { category },
    });
    return NextResponse.json({ success: true, transaction: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
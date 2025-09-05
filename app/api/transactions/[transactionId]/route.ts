import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Define income-related categories
const INCOME_CATEGORIES = ['transfer', 'deposit', 'payroll', 'salary', 'wages', 'income'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const { category } = await req.json();
  if (!transactionId || !category) {
    return NextResponse.json({ error: 'Missing transactionId or category' }, { status: 400 });
  }
  
  try {
    // Get the original transaction to check if category type is changing
    const originalTransaction = await prisma.transactions.findUnique({
      where: { id: transactionId }
    });
    
    if (!originalTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Check if this is changing to/from an income category
    const oldIsIncome = originalTransaction.category ? 
      INCOME_CATEGORIES.some(cat => originalTransaction.category?.toLowerCase().includes(cat)) : false;
    const newIsIncome = INCOME_CATEGORIES.some(cat => category.toLowerCase().includes(cat));
    
    // Update the transaction
    const updated = await prisma.transactions.update({
      where: { id: transactionId },
      data: { category },
    });
    
    // Log category change for income tracking purposes
    if (oldIsIncome !== newIsIncome && originalTransaction.amount > 0) {
      console.log(`Transaction ${transactionId} category changed:`, {
        from: originalTransaction.category,
        to: category,
        wasIncome: oldIsIncome,
        isIncome: newIsIncome,
        amount: originalTransaction.amount,
        userId: originalTransaction.user_id
      });
      
      // Note: You could trigger income recalculation here if needed
      // For now, the dashboard will recalculate on next load
    }
    
    return NextResponse.json({ 
      success: true, 
      transaction: updated,
      incomeStatusChanged: oldIsIncome !== newIsIncome 
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
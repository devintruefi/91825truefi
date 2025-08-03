import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Mapping from subcategories to main categories
const subcategoryToMain = {
  // Essentials
  'Housing': 'Essentials',
  'Rent': 'Essentials',
  'Mortgage': 'Essentials',
  'Home Improvement': 'Essentials',
  'Transportation': 'Essentials',
  'Gas': 'Essentials',
  'Fuel': 'Essentials',
  'Public Transportation': 'Essentials',
  'Parking': 'Essentials',
  'Food & Dining': 'Essentials',
  'Groceries': 'Essentials',
  'Restaurants': 'Essentials',
  'Fast Food': 'Essentials',
  'Coffee Shops': 'Essentials',
  'Utilities': 'Essentials',
  'Electric': 'Essentials',
  'Water': 'Essentials',
  'Internet': 'Essentials',
  'Phone': 'Essentials',
  'Cable': 'Essentials',
  'Healthcare': 'Essentials',
  'Medical': 'Essentials',
  'Dental': 'Essentials',
  'Pharmacy': 'Essentials',
  'Insurance': 'Essentials',
  'Health Insurance': 'Essentials',
  'Auto Insurance': 'Essentials',
  'Home Insurance': 'Essentials',
  'Life Insurance': 'Essentials',
  'Education': 'Essentials',
  'Tuition': 'Essentials',
  'Books & Supplies': 'Essentials',
  
  // Lifestyle
  'Entertainment': 'Lifestyle',
  'Shopping': 'Lifestyle',
  'Clothing': 'Lifestyle',
  'Department Stores': 'Lifestyle',
  'Online Shopping': 'Lifestyle',
  'Personal Care': 'Lifestyle',
  'Beauty': 'Lifestyle',
  'Hair Salons': 'Lifestyle',
  'Gym': 'Lifestyle',
  'Fitness': 'Lifestyle',
  'Hobbies': 'Lifestyle',
  'Travel': 'Lifestyle',
  'Hotels': 'Lifestyle',
  'Flights': 'Lifestyle',
  'Dining': 'Lifestyle',
  'Movies': 'Lifestyle',
  'Music': 'Lifestyle',
  'Books': 'Lifestyle',
  'Sports': 'Lifestyle',
  'Gaming': 'Lifestyle',
  'Streaming Services': 'Lifestyle',
  'Subscriptions': 'Lifestyle',
  'Alcohol & Bars': 'Lifestyle',
  'Tobacco': 'Lifestyle',
  'Pet Care': 'Lifestyle',
  'Veterinary': 'Lifestyle',
  
  // Savings
  'Savings': 'Savings',
  'Investment': 'Savings',
  'Retirement': 'Savings',
  'Emergency Fund': 'Savings',
  '401k': 'Savings',
  'IRA': 'Savings',
  'Stocks': 'Savings',
  'Bonds': 'Savings',
  'Mutual Funds': 'Savings',
  'Cryptocurrency': 'Savings',
  
  // Income (exclude from spending calculations)
  'Income': 'Income',
  'Salary': 'Income',
  'Wages': 'Income',
  'Deposit': 'Income',
  'Transfer': 'Income',
  'Refund': 'Income',
  'Interest': 'Income',
  'Dividends': 'Income',
  'Capital Gains': 'Income',
  'Gift': 'Income',
  'Reimbursement': 'Income',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch all transactions for the current month
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
      },
    });

    // Initialize spending by main category
    const spentByMain = {
      'Monthly Budget': 0,
      'Essentials': 0,
      'Lifestyle': 0,
      'Savings': 0,
    };

    // Aggregate spending by main category
    for (const transaction of transactions) {
      const mainCategory = subcategoryToMain[transaction.category] || 'Lifestyle'; // Default to Lifestyle for unknown categories
      
      // Only count negative amounts (spending) and exclude Income category
      if (transaction.amount < 0 && mainCategory !== 'Income') {
        const amount = Math.abs(transaction.amount);
        
        // Add to specific category
        if (mainCategory === 'Essentials') {
          spentByMain['Essentials'] += amount;
        } else if (mainCategory === 'Lifestyle') {
          spentByMain['Lifestyle'] += amount;
        } else if (mainCategory === 'Savings') {
          spentByMain['Savings'] += amount;
        }
        
        // Add to Monthly Budget (sum of all spending except savings)
        if (mainCategory !== 'Savings') {
          spentByMain['Monthly Budget'] += amount;
        }
      }
    }

    return NextResponse.json({ 
      spentByMain,
      month: now.toISOString().substring(0, 7), // YYYY-MM format
      transactionCount: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching dashboard spending data:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 
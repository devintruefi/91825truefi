import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { detectMonthlyIncomeV2, persistDetectedIncome } from '@/lib/income-detection-v2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check if user already has recurring income entries
    const existingIncome = await prisma.recurring_income.findMany({
      where: {
        user_id: userId,
        OR: [
          { effective_to: null },
          { effective_to: { gte: new Date() } }
        ]
      }
    });

    if (existingIncome.length > 0) {
      return NextResponse.json({
        message: 'Recurring income already exists',
        income: existingIncome,
        detected: false
      });
    }

    // Detect income from transactions
    const detectionResult = await detectMonthlyIncomeV2(userId);

    if (!detectionResult || detectionResult.monthlyIncome === 0) {
      return NextResponse.json({
        message: 'No recurring income detected from transactions',
        detected: false
      });
    }

    // Save detected income if confidence is high enough
    if (detectionResult.confidence >= 60) {
      await persistDetectedIncome(userId, {
        amount: detectionResult.monthlyIncome,
        source: detectionResult.source,
        frequency: detectionResult.details.recurringDeposits?.[0]?.frequency || 'monthly'
      });

      return NextResponse.json({
        message: 'Income detected and saved successfully',
        detected: true,
        income: {
          monthlyAmount: detectionResult.monthlyIncome,
          confidence: detectionResult.confidence,
          source: detectionResult.source,
          details: detectionResult.details
        }
      });
    } else {
      return NextResponse.json({
        message: 'Income detected but confidence too low to auto-save',
        detected: true,
        requiresConfirmation: true,
        income: {
          monthlyAmount: detectionResult.monthlyIncome,
          confidence: detectionResult.confidence,
          source: detectionResult.source,
          details: detectionResult.details
        }
      });
    }
  } catch (error) {
    console.error('Error detecting income:', error);
    return NextResponse.json(
      { error: 'Failed to detect income' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Get all recurring income entries for the user
    const recurringIncome = await prisma.recurring_income.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        effective_from: 'desc'
      }
    });

    // Get the currently active income
    const activeIncome = recurringIncome.filter(income => {
      const now = new Date();
      const isActive = !income.effective_to || new Date(income.effective_to) >= now;
      return isActive;
    });

    const totalMonthlyIncome = activeIncome.reduce((sum, income) => {
      const amount = income.gross_monthly || income.net_monthly || 0;
      return sum + Number(amount);
    }, 0);

    return NextResponse.json({
      recurringIncome,
      activeIncome,
      totalMonthlyIncome,
      hasIncome: activeIncome.length > 0
    });
  } catch (error) {
    console.error('Error fetching recurring income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring income' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, monthlyAmount, source, frequency, employer, isNet } = body;

    if (!userId || monthlyAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and monthlyAmount' },
        { status: 400 }
      );
    }

    // Create or update recurring income
    const recurringIncome = await prisma.recurring_income.upsert({
      where: {
        user_id_source_effective_from: {
          user_id: userId,
          source: source || 'manual',
          effective_from: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      update: {
        gross_monthly: isNet ? null : monthlyAmount,
        net_monthly: isNet ? monthlyAmount : null,
        frequency: frequency || 'monthly',
        employer: employer,
        next_pay_date: calculateNextPayDate(frequency),
        is_net: isNet || false,
        metadata: {
          updatedAt: new Date().toISOString(),
          updatedBy: 'user'
        }
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        source: source || 'manual',
        gross_monthly: isNet ? null : monthlyAmount,
        net_monthly: isNet ? monthlyAmount : null,
        frequency: frequency || 'monthly',
        employer: employer,
        next_pay_date: calculateNextPayDate(frequency),
        inflation_adj: false,
        is_net: isNet || false,
        effective_from: new Date(new Date().setHours(0, 0, 0, 0)),
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: 'user'
        }
      }
    });

    return NextResponse.json({
      message: 'Income saved successfully',
      income: recurringIncome
    });
  } catch (error) {
    console.error('Error saving income:', error);
    return NextResponse.json(
      { error: 'Failed to save income' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, monthlyAmount, frequency, employer, isNet, effectiveTo } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing income ID' },
        { status: 400 }
      );
    }

    const updatedIncome = await prisma.recurring_income.update({
      where: { id },
      data: {
        ...(monthlyAmount !== undefined && {
          gross_monthly: isNet ? null : monthlyAmount,
          net_monthly: isNet ? monthlyAmount : null,
        }),
        ...(frequency && { frequency }),
        ...(employer !== undefined && { employer }),
        ...(isNet !== undefined && { is_net: isNet }),
        ...(effectiveTo !== undefined && { effective_to: effectiveTo ? new Date(effectiveTo) : null }),
        metadata: {
          updatedAt: new Date().toISOString(),
          updatedBy: 'user'
        }
      }
    });

    return NextResponse.json({
      message: 'Income updated successfully',
      income: updatedIncome
    });
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json(
      { error: 'Failed to update income' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing income ID' },
      { status: 400 }
    );
  }

  try {
    // Soft delete by setting effective_to date
    const deletedIncome = await prisma.recurring_income.update({
      where: { id },
      data: {
        effective_to: new Date(),
        metadata: {
          deletedAt: new Date().toISOString(),
          deletedBy: 'user'
        }
      }
    });

    return NextResponse.json({
      message: 'Income removed successfully',
      income: deletedIncome
    });
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json(
      { error: 'Failed to delete income' },
      { status: 500 }
    );
  }
}

function calculateNextPayDate(frequency?: string | null): Date {
  const today = new Date();
  
  switch (frequency) {
    case 'weekly':
      return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'semimonthly':
      // Next 1st or 15th
      const day = today.getDate();
      if (day < 15) {
        return new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        return new Date(today.getFullYear(), today.getMonth() + 1, 1);
      }
    case 'monthly':
    default:
      return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }
}
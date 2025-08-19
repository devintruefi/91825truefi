import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { liabilities } = await request.json();
    
    if (!liabilities || typeof liabilities !== 'object') {
      return NextResponse.json({ error: 'Invalid liabilities data' }, { status: 400 });
    }

    const createdLiabilities = [];

    // Handle different liability types
    for (const [key, value] of Object.entries(liabilities)) {
      if (value && typeof value === 'number' && value > 0) {
        const liability = await prisma.manual_liabilities.create({
          data: {
            id: uuidv4(),
            user_id: user.id,
            name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            liability_class: getLiabilityClass(key),
            balance: value,
            interest_rate: getDefaultInterestRate(key),
            notes: `Added during onboarding`,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        createdLiabilities.push(liability);
      }
    }

    return NextResponse.json({ 
      success: true, 
      liabilities: createdLiabilities,
      message: `${createdLiabilities.length} liabilities saved successfully`
    });
  } catch (error) {
    console.error('Error saving liabilities:', error);
    return NextResponse.json(
      { error: 'Failed to save liabilities' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liabilities = await prisma.manual_liabilities.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' }
    });

    const totalLiabilities = liabilities.reduce((sum, liability) => 
      sum + (liability.balance ? Number(liability.balance) : 0), 0
    );

    return NextResponse.json({ 
      liabilities,
      total: totalLiabilities
    });
  } catch (error) {
    console.error('Error fetching liabilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liabilities' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function getLiabilityClass(key: string): string {
  const liabilityClasses: Record<string, string> = {
    mortgage: 'mortgage',
    home_loan: 'mortgage',
    auto_loan: 'auto_loan',
    car_loan: 'auto_loan',
    student_loans: 'student_loan',
    student_loan: 'student_loan',
    credit_cards: 'credit_card',
    credit_card: 'credit_card',
    personal_loan: 'personal_loan',
    business_loan: 'business_loan',
    medical_debt: 'medical',
    other: 'other'
  };
  
  return liabilityClasses[key.toLowerCase()] || 'other';
}

function getDefaultInterestRate(key: string): number {
  const defaultRates: Record<string, number> = {
    mortgage: 7.0,
    home_loan: 7.0,
    auto_loan: 6.5,
    car_loan: 6.5,
    student_loans: 5.5,
    student_loan: 5.5,
    credit_cards: 22.0,
    credit_card: 22.0,
    personal_loan: 12.0,
    business_loan: 9.0,
    medical_debt: 0,
    other: 10.0
  };
  
  return defaultRates[key.toLowerCase()] || 10.0;
}
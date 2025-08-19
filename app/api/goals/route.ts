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

    const { goals } = await request.json();
    
    if (!goals || !Array.isArray(goals)) {
      return NextResponse.json({ error: 'Invalid goals data' }, { status: 400 });
    }

    // Delete existing goals for the user first
    await prisma.goals.deleteMany({
      where: { user_id: user.id }
    });

    // Create new goals
    const createdGoals = await Promise.all(
      goals.map(async (goal) => {
        return await prisma.goals.create({
          data: {
            id: uuidv4(),
            user_id: user.id,
            name: goal.name || goal.label || 'Unnamed Goal',
            description: goal.description || null,
            target_amount: goal.target_amount || 0,
            current_amount: goal.current_amount || 0,
            target_date: goal.target_date ? new Date(goal.target_date) : null,
            priority: goal.priority || 'medium',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      })
    );

    return NextResponse.json({ 
      success: true, 
      goals: createdGoals,
      message: `${createdGoals.length} goals saved successfully`
    });
  } catch (error) {
    console.error('Error saving goals:', error);
    return NextResponse.json(
      { error: 'Failed to save goals' },
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

    const goals = await prisma.goals.findMany({
      where: { 
        user_id: user.id,
        is_active: true
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
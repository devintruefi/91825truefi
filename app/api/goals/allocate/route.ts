import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { 
  calculateAvailableFunds, 
  allocateByPriority, 
  validateAllocation,
  getAccountSnapshot 
} from '@/lib/goals/allocation';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { goals: goalInputs } = await req.json();
    
    if (!goalInputs || !Array.isArray(goalInputs)) {
      return NextResponse.json({ error: 'Invalid goals data' }, { status: 400 });
    }

    // Calculate available funds
    const available = await calculateAvailableFunds(user.id);
    
    // Get full goal details for the requested goals
    const goalIds = goalInputs.map(g => g.id);
    const goalDetails = await prisma.goals.findMany({
      where: {
        id: { in: goalIds },
        user_id: user.id,
        is_active: true
      }
    });

    if (goalDetails.length === 0) {
      return NextResponse.json({ 
        error: 'No active goals found' 
      }, { status: 404 });
    }

    // Allocate by priority
    const allocations = await allocateByPriority(goalDetails, available);
    
    // Validate allocations don't exceed available funds
    const isValid = await validateAllocation(allocations, user.id);
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Insufficient funds for allocation' 
      }, { status: 400 });
    }

    // Get account snapshot for history
    const accountSnapshot = await getAccountSnapshot(user.id);

    // Record each allocation in allocation_history
    const allocationRecords = [];
    for (const [goalId, amount] of allocations.entries()) {
      if (amount > 0) {
        const record = await prisma.allocation_history.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id,
            goal_id: goalId,
            calculated_amount: amount,
            calculation_method: 'priority_proportional',
            account_snapshot: accountSnapshot as any, // Store as JSON
            created_at: new Date()
          }
        });
        allocationRecords.push(record);

        // Update the goal's current amount
        await prisma.goals.update({
          where: { id: goalId },
          data: {
            current_amount: {
              increment: amount
            },
            updated_at: new Date()
          }
        });
      }
    }

    // Return the allocations
    return NextResponse.json({
      success: true,
      allocations: Object.fromEntries(allocations),
      available_funds: available,
      method: 'priority_proportional',
      records: allocationRecords.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error allocating goals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to allocate goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
import prisma from '@/lib/db';

export async function calculateAvailableFunds(userId: string): Promise<number> {
  // Get liquid accounts (checking, savings)
  const liquidAccounts = await prisma.accounts.findMany({
    where: {
      user_id: userId,
      type: 'depository',
      subtype: { in: ['checking', 'savings'] },
      is_active: true
    }
  });

  const totalAvailable = liquidAccounts.reduce((sum, account) => {
    // Use available_balance if present, otherwise use balance
    const balance = account.available_balance || account.balance || 0;
    return sum + Number(balance);
  }, 0);

  // Get user's checking buffer
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { default_checking_buffer: true }
  });

  const buffer = Number(user?.default_checking_buffer || 2000);
  
  // Never return negative
  return Math.max(0, totalAvailable - buffer);
}

export interface Goal {
  id: string;
  name: string;
  target_amount: any;
  current_amount: any;
  allocation_priority?: number | null;
  priority?: string | null;
}

export async function allocateByPriority(
  goals: Goal[],
  availableFunds: number
): Promise<Map<string, number>> {
  const allocations = new Map<string, number>();
  let remaining = availableFunds;

  // Sort by allocation_priority (lower number = higher priority)
  // If allocation_priority is null, use a high number
  const sortedGoals = goals.sort((a, b) => {
    const priorityA = a.allocation_priority ?? 999;
    const priorityB = b.allocation_priority ?? 999;
    return priorityA - priorityB;
  });

  for (const goal of sortedGoals) {
    if (remaining <= 0) break;
    
    const targetAmount = Number(goal.target_amount || 0);
    const currentAmount = Number(goal.current_amount || 0);
    const needed = Math.max(0, targetAmount - currentAmount);
    
    // Allocate the minimum of what's needed and what's available
    const allocated = Math.min(needed, remaining);
    
    if (allocated > 0) {
      allocations.set(goal.id, allocated);
      remaining -= allocated;
    }
  }

  return allocations;
}

export async function validateAllocation(
  allocations: Map<string, number>,
  userId: string
): Promise<boolean> {
  const available = await calculateAvailableFunds(userId);
  const totalAllocated = Array.from(allocations.values()).reduce((sum, amt) => sum + amt, 0);
  return totalAllocated <= available;
}

export interface AllocationSnapshot {
  id: string;
  name: string;
  balance: any;
  available_balance: any;
  type?: string;
  subtype?: string;
}

export async function getAccountSnapshot(userId: string): Promise<AllocationSnapshot[]> {
  const accounts = await prisma.accounts.findMany({
    where: { 
      user_id: userId,
      is_active: true 
    },
    select: { 
      id: true, 
      name: true, 
      balance: true, 
      available_balance: true,
      type: true,
      subtype: true
    }
  });
  
  return accounts;
}
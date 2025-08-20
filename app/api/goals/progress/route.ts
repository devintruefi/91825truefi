import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { 
  trackGoalProgress, 
  trackAllGoalsProgress,
  generateProgressNotifications,
  updateGoalProgressFromAccounts
} from '@/lib/goals/progress-tracker';

// GET: Get progress for user's goals
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    
    if (goalId) {
      // Get progress for specific goal
      const progress = await trackGoalProgress(goalId);
      return NextResponse.json({ progress });
    } else {
      // Get progress for all goals
      const allProgress = await trackAllGoalsProgress(user.id);
      
      // Generate notifications
      const notifications = await generateProgressNotifications(user.id);
      
      return NextResponse.json({
        progress: allProgress,
        notifications,
        summary: {
          totalGoals: allProgress.length,
          onTrack: allProgress.filter(p => p.isOnTrack).length,
          completed: allProgress.filter(p => p.progressPercentage >= 100).length,
          averageProgress: allProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / allProgress.length
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting goal progress:', error);
    return NextResponse.json(
      { error: 'Failed to get goal progress' },
      { status: 500 }
    );
  }
}

// POST: Update goal progress
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, goalId, amount } = await request.json();
    
    switch (action) {
      case 'sync_accounts':
        // Update progress from connected accounts
        await updateGoalProgressFromAccounts(user.id);
        
        const updatedProgress = await trackAllGoalsProgress(user.id);
        
        return NextResponse.json({
          success: true,
          progress: updatedProgress,
          message: 'Goal progress synced with account balances'
        });
        
      case 'manual_update':
        // Manual progress update
        if (!goalId || amount === undefined) {
          return NextResponse.json({ error: 'Goal ID and amount required' }, { status: 400 });
        }
        
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          // Verify goal belongs to user
          const goal = await prisma.goals.findUnique({
            where: { id: goalId }
          });
          
          if (!goal || goal.user_id !== user.id) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
          }
          
          // Update goal amount
          await prisma.goals.update({
            where: { id: goalId },
            data: {
              current_amount: amount,
              updated_at: new Date()
            }
          });
          
          // Track updated progress
          const progress = await trackGoalProgress(goalId);
          
          return NextResponse.json({
            success: true,
            progress,
            message: 'Goal progress updated successfully'
          });
          
        } finally {
          await prisma.$disconnect();
        }
        
      case 'check_milestones':
        // Check for new milestones
        const notifications = await generateProgressNotifications(user.id);
        
        return NextResponse.json({
          success: true,
          notifications,
          message: `Generated ${notifications.length} notifications`
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error updating goal progress:', error);
    return NextResponse.json(
      { error: 'Failed to update goal progress' },
      { status: 500 }
    );
  }
}
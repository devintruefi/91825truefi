// retired: replaced by dashboard-guided onboarding
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Clean up old temporary users (older than 24 hours)
async function cleanupOldTempUsers() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const oldTempUsers = await prisma.users.findMany({
      where: {
        email: { startsWith: 'temp-' },
        created_at: { lt: twentyFourHoursAgo }
      }
    });

    for (const tempUser of oldTempUsers) {
      // Delete related data first
      await prisma.user_onboarding_responses.deleteMany({
        where: { user_id: tempUser.id }
      });
      
      await prisma.onboarding_progress.deleteMany({
        where: { user_id: tempUser.id }
      });
      
      // Delete the temporary user
      await prisma.users.delete({
        where: { id: tempUser.id }
      });
    }

    if (oldTempUsers.length > 0) {
      console.log(`Cleaned up ${oldTempUsers.length} old temporary users`);
    }
  } catch (error) {
    console.error('Error cleaning up old temporary users:', error);
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Chat onboarding has been retired. Please use dashboard-guided onboarding.' },
    { status: 410 }
  );
  /* Retired code below
  try {
    const { answers, userId } = await req.json();
    console.log('Onboarding POST request received:', { userId, answersCount: Object.keys(answers || {}).length });

    // Validate that we have answers
    if (!answers || typeof answers !== 'object') {
      console.error('Invalid answers format:', answers);
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 });
    }

    // For demo users or when no authentication is available, use the provided userId
    let user_id = userId;
    
    // Try to get user from auth token if available
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        user_id = user.id;
        console.log('Using authenticated user ID:', user_id);
      }
    } catch (error) {
      console.log('No auth token found, using provided userId:', user_id);
    }

    if (!user_id) {
      console.error('No user ID provided');
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    // Clean up old temporary users periodically
    await cleanupOldTempUsers();

    // Check if user exists in the database
    const existingUser = await prisma.users.findUnique({
      where: { id: user_id }
    });

    console.log('User exists in database:', !!existingUser);

    // If user doesn't exist (temp user), create a temporary user record
    if (!existingUser) {
      try {
        console.log('Creating temporary user with ID:', user_id);
        await prisma.users.create({
          data: {
            id: user_id,
            email: `temp-${user_id}@temp.com`, // Temporary email
            first_name: 'Temporary',
            last_name: 'User',
            password_hash: 'temp-hash', // Temporary password hash
            is_active: false, // Mark as inactive
            is_advisor: false,
            created_at: new Date(),
            updated_at: new Date(),
          }
        });
        console.log(`Successfully created temporary user with ID: ${user_id}`);
      } catch (error) {
        console.error('Error creating temporary user:', error);
        return NextResponse.json({ error: 'Failed to create temporary user' }, { status: 500 });
      }
    }

    // Store each answer in the database
    console.log('Storing onboarding responses for user:', user_id);
    const responsePromises = Object.entries(answers).map(([questionId, answer]) => {
      return prisma.user_onboarding_responses.create({
        data: {
          user_id: user_id,
          question: questionId,
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
        },
      });
    });

    await Promise.all(responsePromises);
    console.log('Successfully stored all onboarding responses');

    // Update onboarding progress
    console.log('Updating onboarding progress for user:', user_id);
    await prisma.onboarding_progress.upsert({
      where: { user_id: user_id },
      update: { 
        current_step: 'completed',
        is_complete: true,
        updated_at: new Date()
      },
      create: {
        user_id: user_id,
        current_step: 'completed',
        is_complete: true,
      },
    });

    console.log('Onboarding completed successfully for user:', user_id);
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding responses saved successfully' 
    });

  } catch (error) {
    console.error('Error saving onboarding responses:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding responses' }, 
      { status: 500 }
    );
  }
  */
} 
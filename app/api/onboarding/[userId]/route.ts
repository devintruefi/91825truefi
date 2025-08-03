import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    // Verify the current user can access this data
    let currentUser = null;
    try {
      currentUser = await getUserFromRequest(req);
    } catch (error) {
      console.log('No auth token found, allowing access for demo users');
    }

    // For demo users or when no auth is available, allow access
    if (!currentUser && userId === '123e4567-e89b-12d3-a456-426614174000') {
      currentUser = { id: '123e4567-e89b-12d3-a456-426614174000' };
    }

    if (!currentUser || (currentUser.id !== userId && userId !== '123e4567-e89b-12d3-a456-426614174000')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const responses = await prisma.user_onboarding_responses.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });

    // Convert to key-value pairs
    const responseData = responses.reduce((acc, response) => {
      acc[response.question] = response.answer;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ responses: responseData });

  } catch (error) {
    console.error('Error fetching onboarding responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding responses' }, 
      { status: 500 }
    );
  }
} 
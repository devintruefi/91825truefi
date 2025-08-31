import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/onboarding/suggestions?step=<id>
 * Returns suggestions for a specific onboarding step based on Plaid data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');
    
    if (!step) {
      return NextResponse.json({ error: 'Step parameter required' }, { status: 400 });
    }

    // Check if we have stored suggestions for this user and step
    const existingSuggestion = await prisma.chat_sessions.findFirst({
      where: {
        user_id: user.id,
        is_active: true
      },
      select: {
        id: true
      }
    });

    if (!existingSuggestion) {
      return NextResponse.json({ ready: false, data: null });
    }

    // Get suggestions from the active chat session's messages
    const suggestionMessage = await prisma.chat_messages.findFirst({
      where: {
        session_id: existingSuggestion.id,
        rich_content: {
          path: ['suggestions', step],
          not: undefined
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!suggestionMessage || !suggestionMessage.rich_content) {
      return NextResponse.json({ ready: false, data: null });
    }

    const suggestions = (suggestionMessage.rich_content as any)?.suggestions?.[step];
    
    return NextResponse.json({ 
      ready: true, 
      data: suggestions || null 
    });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
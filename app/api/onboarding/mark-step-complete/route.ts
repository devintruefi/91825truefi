import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('mark-step-complete API received:', body)
    
    const { step, userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    const user = { id: userId }
    
    if (!step) {
      return NextResponse.json({ error: 'Step is required' }, { status: 400 })
    }

    // Map step names to question values
    const stepToQuestion: Record<string, string> = {
      'reviewTransactions': 'reviewed_transactions',
      'verifyAssetsLiabilities': 'verified_assets_liabilities',
      'budget': 'reviewed_budget',
      'goals': 'added_goal',
      'investments': 'reviewed_investments',
      'aboutMe': 'completed_profile'
    }

    const question = stepToQuestion[step]
    if (!question) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    // First check if a record exists
    const existing = await prisma.user_onboarding_responses.findFirst({
      where: {
        user_id: user.id,
        question
      }
    })

    let result
    if (existing) {
      // Update existing record
      result = await prisma.user_onboarding_responses.update({
        where: { id: existing.id },
        data: {
          answer: JSON.stringify({ completed: true, timestamp: new Date() })
        }
      })
    } else {
      // Create new record
      result = await prisma.user_onboarding_responses.create({
        data: {
          user_id: user.id,
          question,
          answer: JSON.stringify({ completed: true, timestamp: new Date() }),
          created_at: new Date()
        }
      })
    }
    
    console.log('Mark step complete - created/updated record:', {
      user_id: result.user_id,
      question: result.question,
      answer: result.answer
    })

    // Dispatch event to update the guided tour
    return NextResponse.json({ 
      success: true,
      message: `Step ${step} marked as complete`
    })
  } catch (error) {
    console.error('Error marking step complete:', error)
    return NextResponse.json(
      { error: 'Failed to mark step complete' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, verify all checklist items are actually complete
    const statusResponse = await fetch(
      `${request.nextUrl.origin}/api/dashboard-onboarding/status`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || ''
        }
      }
    )

    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify onboarding status' },
        { status: 500 }
      )
    }

    const status = await statusResponse.json()

    // Check which items are missing
    const missing = []
    if (!status.checklist.connectAccounts) missing.push('connectAccounts')
    if (!status.checklist.reviewTransactions) missing.push('reviewTransactions')
    if (!status.checklist.verifyAssetsLiabilities) missing.push('verifyAssetsLiabilities')
    if (!status.checklist.budget) missing.push('budget')
    if (!status.checklist.goals) missing.push('goals')
    if (!status.checklist.investments) missing.push('investments')
    if (!status.checklist.aboutMe) missing.push('aboutMe')

    if (missing.length > 0) {
      return NextResponse.json({
        complete: false,
        missing,
        message: 'Some onboarding items are still incomplete'
      })
    }

    // All items complete, mark onboarding as complete
    await prisma.onboarding_progress.upsert({
      where: { user_id: user.id },
      update: {
        current_step: 'complete',
        is_complete: true,
        updated_at: new Date()
      },
      create: {
        user_id: user.id,
        current_step: 'complete',
        is_complete: true
      }
    })

    return NextResponse.json({
      complete: true,
      message: 'Onboarding completed successfully!'
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
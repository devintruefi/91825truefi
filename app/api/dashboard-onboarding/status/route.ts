import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameter instead of authentication header
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }
    
    const user = { id: userId }

    // Initialize all results with try/catch blocks to prevent 500 errors
    let connectAccounts = false
    let reviewTransactions = false  
    let verifyAssetsLiabilities = false
    let budget = false
    let goals = false
    let investments = false
    let aboutMe = false
    let onboardingProgress = null

    // 1. Connect Accounts - wrap in try/catch
    try {
      const [plaidConnections, accounts] = await Promise.all([
        prisma.plaid_connections.count({ where: { user_id: user.id } }),
        prisma.accounts.count({ where: { user_id: user.id, is_active: true } })
      ])
      connectAccounts = accounts > 0 || (plaidConnections > 0 && accounts > 0)
    } catch (error) {
      console.error('Error checking connectAccounts:', error)
      connectAccounts = false
    }

    // 2. Review Transactions - wrap in try/catch
    try {
      // Check if user has marked this step as complete in onboarding responses
      const reviewedResponse = await prisma.user_onboarding_responses.findFirst({
        where: {
          user_id: user.id,
          question: 'reviewed_transactions'
        }
      })
      
      console.log('Checking reviewTransactions step:', {
        user_id: user.id,
        found: reviewedResponse !== null,
        record: reviewedResponse ? {
          question: reviewedResponse.question,
          answer: reviewedResponse.answer
        } : null
      })
      
      // Only mark complete if user explicitly reviewed transactions
      // This prevents auto-completion just from having imported transactions
      reviewTransactions = reviewedResponse !== null
      
      // Alternative: Check if any transaction has a user-modified category
      // For now, we require explicit marking via the onboarding flow
    } catch (error) {
      console.error('Error checking reviewTransactions:', error)
      reviewTransactions = false
    }

    // 3. Verify Assets & Liabilities - wrap in try/catch
    try {
      // Check if user has marked this step as complete
      const verifiedResponse = await prisma.user_onboarding_responses.findFirst({
        where: {
          user_id: user.id,
          question: 'verified_assets_liabilities'
        }
      })
      
      // Mark complete only if user has explicitly verified
      // They may not have any manual assets/liabilities to add
      verifyAssetsLiabilities = verifiedResponse !== null
    } catch (error) {
      console.error('Error checking verifyAssetsLiabilities:', error)
      verifyAssetsLiabilities = false
    }

    // 4. Budget - wrap in try/catch
    try {
      // Check if user has marked budget as reviewed/saved
      const budgetResponse = await prisma.user_onboarding_responses.findFirst({
        where: {
          user_id: user.id,
          question: 'reviewed_budget'
        }
      })
      
      // Mark complete only if user has explicitly saved their budget
      budget = budgetResponse !== null
    } catch (error) {
      console.error('Error checking budget:', error)
      budget = false
    }

    // 5. Goals - wrap in try/catch
    try {
      const goalsCount = await prisma.goals.count({ 
        where: { user_id: user.id, is_active: true } 
      })
      goals = goalsCount > 0
    } catch (error) {
      console.error('Error checking goals:', error)
      goals = false
    }

    // 6. Investments - wrap in try/catch
    try {
      // Check if user has marked investments as reviewed
      const investmentsResponse = await prisma.user_onboarding_responses.findFirst({
        where: {
          user_id: user.id,
          question: 'reviewed_investments'
        }
      })
      
      // Mark complete only if user has explicitly reviewed
      investments = investmentsResponse !== null
    } catch (error) {
      console.error('Error checking investments:', error)
      investments = false
    }

    // 7. About Me - wrap in try/catch
    try {
      const [userPreferences, userIdentity, taxProfile] = await Promise.all([
        prisma.user_preferences.findFirst({
          where: { user_id: user.id },
          select: {
            risk_tolerance: true,
            investment_horizon: true,
            financial_goals: true
          }
        }),
        prisma.user_identity.findFirst({
          where: { user_id: user.id },
          select: {
            street: true,
            phone_primary: true
          }
        }),
        prisma.tax_profile.findUnique({
          where: { user_id: user.id },
          select: {
            filing_status: true,
            state: true
          }
        })
      ])

      aboutMe = Boolean(
        userIdentity?.street &&
        userIdentity?.phone_primary &&
        userPreferences?.risk_tolerance &&
        userPreferences?.investment_horizon &&
        userPreferences?.financial_goals &&
        taxProfile?.filing_status &&
        taxProfile?.state
      )
    } catch (error) {
      console.error('Error checking aboutMe:', error)
      aboutMe = false
    }

    // Get onboarding progress - wrap in try/catch
    try {
      onboardingProgress = await prisma.onboarding_progress.findUnique({
        where: { user_id: user.id },
        select: {
          current_step: true,
          is_complete: true
        }
      })
    } catch (error) {
      console.error('Error fetching onboarding progress:', error)
      onboardingProgress = null
    }

    // Build checklist using the computed values
    const checklist = {
      connectAccounts,
      reviewTransactions,
      verifyAssetsLiabilities,
      budget,
      goals,
      investments,
      aboutMe
    }

    // Calculate completion percentage
    const completedCount = Object.values(checklist).filter(Boolean).length
    const totalCount = Object.keys(checklist).length
    const percent = Math.round((completedCount / totalCount) * 100)

    // Check if all items are complete
    const complete = completedCount === totalCount

    // Debug logging for new user issues
    console.log('Dashboard onboarding status for user:', user.id, {
      checklist,
      completedCount,
      totalCount,
      percent,
      complete
    })

    // If complete and not marked in DB, update it
    if (complete && !onboardingProgress?.is_complete) {
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
    }

    return NextResponse.json({
      checklist,
      complete,
      percent,
      currentStep: onboardingProgress?.current_step || 'dashboard-guided'
    })
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    )
  }
}
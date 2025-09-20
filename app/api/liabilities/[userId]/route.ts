import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET - Fetch all liabilities for a user (manual liabilities + Plaid credit/loan accounts)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch manual liabilities (user-entered)
    const manualLiabilities = await prisma.manual_liabilities.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    // Fetch Plaid-connected liability accounts (credit cards + loans)
    const plaidLiabilityAccounts = await prisma.accounts.findMany({
      where: { 
        user_id: userId,
        is_active: true,
        // Only include liability-type accounts (credit cards and loans)
        type: {
          in: ['credit', 'loan']
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        subtype: true,
        balance: true,
        institution_name: true,
        updated_at: true
      }
    })

    // Fetch detail information for Plaid accounts
    const accountIds = plaidLiabilityAccounts.map(acc => acc.id)
    
    const [loanDetails, studentLoanDetails, mortgageDetails] = await Promise.all([
      // Loan details
      prisma.loan_details.findMany({
        where: { account_id: { in: accountIds } }
      }),
      // Student loan details  
      prisma.student_loan_details.findMany({
        where: { account_id: { in: accountIds } }
      }),
      // Mortgage details (check if this table exists)
      prisma.$queryRaw`SELECT * FROM mortgage_details WHERE account_id = ANY(${accountIds})`.catch(() => [])
    ])

    // Create lookup maps for details
    const loanDetailsMap = new Map(loanDetails.map(detail => [detail.account_id, detail]))
    const studentLoanDetailsMap = new Map(studentLoanDetails.map(detail => [detail.account_id, detail]))
    const mortgageDetailsMap = new Map((mortgageDetails as any[]).map(detail => [detail.account_id, detail]))

    // Transform Plaid accounts into liability format to match manual liabilities structure
    const plaidAsLiabilities = plaidLiabilityAccounts.map(account => {
      // Get additional details if available
      const loanDetail = loanDetailsMap.get(account.id)
      const studentLoanDetail = studentLoanDetailsMap.get(account.id)
      const mortgageDetail = mortgageDetailsMap.get(account.id)

      // Determine liability class based on account type and details
      let liability_class = 'Other Debt'
      if (account.type === 'credit') {
        liability_class = 'Credit Card'
      } else if (account.type === 'loan') {
        if (studentLoanDetail) {
          liability_class = 'Student Loan'
        } else if (mortgageDetail) {
          liability_class = 'Mortgage'
        } else {
          liability_class = 'Personal Loan'
        }
      }

      // Extract interest rate from details if available
      let interest_rate = null
      if (loanDetail?.interest_rate) {
        interest_rate = loanDetail.interest_rate
      } else if (studentLoanDetail?.interest_rate_percentage) {
        interest_rate = studentLoanDetail.interest_rate_percentage
      }

      return {
        id: account.id,
        name: account.name || `${liability_class}`,
        liability_class,
        // For liability accounts, balance represents amount owed
        balance: account.balance || 0,
        interest_rate,
        notes: `${account.institution_name || 'Bank'} - ${account.subtype || account.type}`,
        source: 'plaid' as const,
        user_id: userId,
        created_at: account.updated_at,
        updated_at: account.updated_at,
        // Include detail information if available
        loan_details: loanDetail || null,
        student_loan_details: studentLoanDetail || null,
        mortgage_details: mortgageDetail || null,
      }
    })

    // Combine manual liabilities and Plaid liabilities
    const allLiabilities = [
      ...manualLiabilities.map(liability => ({ 
        ...liability, 
        source: 'manual' as const,
        loan_details: null,
        student_loan_details: null,
        mortgage_details: null,
      })),
      ...plaidAsLiabilities
    ]

    // Sort by balance descending to show largest debts first
    allLiabilities.sort((a, b) => {
      const aBalance = typeof a.balance === 'object' && a.balance?.toNumber ? a.balance.toNumber() : (parseFloat(a.balance?.toString() || '0') || 0)
      const bBalance = typeof b.balance === 'object' && b.balance?.toNumber ? b.balance.toNumber() : (parseFloat(b.balance?.toString() || '0') || 0)
      return bBalance - aBalance
    })

    return NextResponse.json(allLiabilities)
  } catch (error) {
    console.error('Error fetching combined liabilities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch liabilities' },
      { status: 500 }
    )
  }
}

  // POST - Create a new liability
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
  ) {
    try {
      const { userId } = await params
      console.log('Creating liability for user:', userId)

      // Auth check
      const user = await getUserFromRequest(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (user.id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const body = await request.json()
      console.log('Request body:', body)

      const liability = await prisma.manual_liabilities.create({
        data: {
          user_id: userId,
          name: body.name,
          liability_class: body.liability_class,
          balance: body.balance ? parseFloat(body.balance) : null,
          interest_rate: body.interest_rate ? parseFloat(body.interest_rate) : null,
          notes: body.notes,
        }
      })

      console.log('Liability created successfully:', liability)
      return NextResponse.json(liability, { status: 201 })
    } catch (error) {
      console.error('Error creating liability:', error)
      return NextResponse.json(
        { error: 'Failed to create liability', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

// PUT - Update a liability
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const liability = await prisma.manual_liabilities.update({
      where: {
        id: body.id,
        user_id: user.id  // Defense in depth - ensure we only update user's own liabilities
      },
      data: {
        name: body.name,
        liability_class: body.liability_class,
        balance: body.balance ? parseFloat(body.balance) : null,
        interest_rate: body.interest_rate ? parseFloat(body.interest_rate) : null,
        notes: body.notes,
        updated_at: new Date(),
      }
    })

    return NextResponse.json(liability)
  } catch (error) {
    console.error('Error updating liability:', error)
    return NextResponse.json(
      { error: 'Failed to update liability' },
      { status: 500 }
    )
  }
} 
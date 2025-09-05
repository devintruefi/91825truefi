import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Map form data to database columns
    const waitlistEntry = await prisma.waitlist_entries.create({
      data: {
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone || null,
        financial_goal: body.financialGoals || null,
        current_situation: body.currentSituation || null,
        interests: body.interests || [],
        money_management_methods: body.moneyManagement || [],
        other_money_management: body.otherMoneyManagement || null,
        must_have_features: body.mustHave || null,
        referral_source: body.hearAboutUs || null,
        additional_comments: body.additionalComments || null,
        newsletter_opt_in: body.newsletter || false,
        updates_opt_in: body.updates || false,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist',
      id: waitlistEntry.id
    })
  } catch (error) {
    console.error('Error creating waitlist entry:', error)
    
    // Check for duplicate email
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check here if needed
    // This endpoint could be used by admins to view waitlist entries
    
    const entries = await prisma.waitlist_entries.findMany({
      orderBy: {
        created_at: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      entries,
      count: entries.length
    })
  } catch (error) {
    console.error('Error fetching waitlist entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist entries' },
      { status: 500 }
    )
  }
}
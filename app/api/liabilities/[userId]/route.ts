import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all liabilities for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const liabilities = await prisma.manual_liabilities.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(liabilities)
  } catch (error) {
    console.error('Error fetching liabilities:', error)
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
    const body = await request.json()

    const liability = await prisma.manual_liabilities.update({
      where: { id: body.id },
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
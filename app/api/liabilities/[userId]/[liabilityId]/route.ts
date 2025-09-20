import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET - Fetch a specific liability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; liabilityId: string }> }
) {
  try {
    const { userId, liabilityId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const liability = await prisma.manual_liabilities.findFirst({
      where: {
        id: liabilityId,
        user_id: user.id  // Use authenticated user ID
      }
    })

    if (!liability) {
      return NextResponse.json(
        { error: 'Liability not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(liability)
  } catch (error) {
    console.error('Error fetching liability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch liability' },
      { status: 500 }
    )
  }
}

// PUT - Update a specific liability
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; liabilityId: string }> }
) {
  try {
    const { userId, liabilityId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()

    // First check if liability exists and user owns it
    const existingLiability = await prisma.manual_liabilities.findFirst({
      where: {
        id: liabilityId,
        user_id: user.id
      }
    })

    if (!existingLiability) {
      return NextResponse.json({ error: 'Liability not found or unauthorized' }, { status: 404 })
    }

    // Now update using just the ID
    const liability = await prisma.manual_liabilities.update({
      where: {
        id: liabilityId
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

// DELETE - Delete a specific liability
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; liabilityId: string }> }
) {
  try {
    const { userId, liabilityId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deleteResult = await prisma.manual_liabilities.deleteMany({
      where: {
        id: liabilityId,
        user_id: user.id  // Use authenticated user ID
      }
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Liability not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Liability deleted successfully' })
  } catch (error) {
    console.error('Error deleting liability:', error)
    return NextResponse.json(
      { error: 'Failed to delete liability' },
      { status: 500 }
    )
  }
} 
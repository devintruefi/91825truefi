import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch a specific liability
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; liabilityId: string } }
) {
  try {
    const { userId, liabilityId } = params

    const liability = await prisma.manual_liabilities.findFirst({
      where: { 
        id: liabilityId,
        user_id: userId 
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
  { params }: { params: { userId: string; liabilityId: string } }
) {
  try {
    const { userId, liabilityId } = params
    const body = await request.json()

    const liability = await prisma.manual_liabilities.update({
      where: { 
        id: liabilityId,
        user_id: userId 
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
  { params }: { params: { userId: string; liabilityId: string } }
) {
  try {
    const { userId, liabilityId } = params

    await prisma.manual_liabilities.delete({
      where: { 
        id: liabilityId,
        user_id: userId 
      }
    })

    return NextResponse.json({ message: 'Liability deleted successfully' })
  } catch (error) {
    console.error('Error deleting liability:', error)
    return NextResponse.json(
      { error: 'Failed to delete liability' },
      { status: 500 }
    )
  }
} 
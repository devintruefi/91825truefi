import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET - Fetch a specific asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; assetId: string }> }
) {
  try {
    const { userId, assetId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const asset = await prisma.manual_assets.findFirst({
      where: {
        id: assetId,
        user_id: user.id  // Use authenticated user ID
      },
      include: {
        business_ownership_details: true,
        collectible_details: true,
        other_manual_asset_details: true,
        other_manual_assets: true,
        real_estate_details: true,
        vehicle_assets: true,
        vehicle_details: true,
      }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

// PUT - Update a specific asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; assetId: string }> }
) {
  try {
    const { userId, assetId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()

    // First check if asset exists and user owns it
    const existingAsset = await prisma.manual_assets.findFirst({
      where: {
        id: assetId,
        user_id: user.id
      }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found or unauthorized' }, { status: 404 })
    }

    // Now update using just the ID
    const asset = await prisma.manual_assets.update({
      where: {
        id: assetId
      },
      data: {
        name: body.name,
        asset_class: body.asset_class,
        value: body.value ? parseFloat(body.value) : null,
        notes: body.notes,
        updated_at: new Date(),
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a specific asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; assetId: string }> }
) {
  try {
    const { userId, assetId } = await params

    // Auth check
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deleteResult = await prisma.manual_assets.deleteMany({
      where: {
        id: assetId,
        user_id: user.id  // Use authenticated user ID
      }
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Asset not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
} 
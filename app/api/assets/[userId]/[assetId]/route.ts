import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch a specific asset
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; assetId: string } }
) {
  try {
    const { userId, assetId } = params

    const asset = await prisma.manual_assets.findFirst({
      where: { 
        id: assetId,
        user_id: userId 
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
  { params }: { params: { userId: string; assetId: string } }
) {
  try {
    const { userId, assetId } = params
    const body = await request.json()

    const asset = await prisma.manual_assets.update({
      where: { 
        id: assetId,
        user_id: userId 
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
  { params }: { params: { userId: string; assetId: string } }
) {
  try {
    const { userId, assetId } = params

    await prisma.manual_assets.delete({
      where: { 
        id: assetId,
        user_id: userId 
      }
    })

    return NextResponse.json({ message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
} 
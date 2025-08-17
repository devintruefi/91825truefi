import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all assets for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const assets = await prisma.manual_assets.findMany({
      where: { user_id: userId },
      include: {
        business_ownership_details: true,
        collectible_details: true,
        other_manual_asset_details: true,
        other_manual_assets: true,
        real_estate_details: true,
        vehicle_assets: true,
        vehicle_details: true,
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

  // POST - Create a new asset
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
  ) {
    try {
      const { userId } = await params
      console.log('Creating asset for user:', userId)
      
      const body = await request.json()
      console.log('Request body:', body)

      const asset = await prisma.manual_assets.create({
        data: {
          user_id: userId,
          name: body.name,
          asset_class: body.asset_class,
          value: body.value ? parseFloat(body.value) : null,
          notes: body.notes,
        }
      })

      console.log('Asset created successfully:', asset)
      return NextResponse.json(asset, { status: 201 })
    } catch (error) {
      console.error('Error creating asset:', error)
      return NextResponse.json(
        { error: 'Failed to create asset', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

// PUT - Update an asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await request.json()

    const asset = await prisma.manual_assets.update({
      where: { id: body.id },
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
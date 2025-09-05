import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all assets for a user (manual assets + Plaid account balances)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Fetch manual assets (user-entered)
    const manualAssets = await prisma.manual_assets.findMany({
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

    // Fetch Plaid-connected asset accounts (depository + investment)
    const plaidAccounts = await prisma.accounts.findMany({
      where: { 
        user_id: userId,
        is_active: true,
        // Only include asset-type accounts, not liabilities
        type: {
          in: ['depository', 'investment']
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

    // Transform Plaid accounts into asset format to match manual assets structure
    const plaidAsAssets = plaidAccounts.map(account => ({
      id: account.id,
      name: account.name || 'Bank Account',
      asset_class: account.type === 'investment' ? 'Investment Account' : 'Cash & Cash Equivalents',
      value: account.balance || 0,
      notes: `${account.institution_name || 'Bank'} - ${account.subtype || account.type}`,
      source: 'plaid' as const,
      user_id: userId,
      created_at: account.updated_at,
      updated_at: account.updated_at,
      // Set detail tables to null since these are Plaid accounts
      business_ownership_details: null,
      collectible_details: null,
      other_manual_asset_details: null,
      other_manual_assets: null,
      real_estate_details: null,
      vehicle_assets: null,
      vehicle_details: null,
    }))

    // Combine manual assets and Plaid assets
    const allAssets = [
      ...manualAssets.map(asset => ({ ...asset, source: 'manual' as const })),
      ...plaidAsAssets
    ]

    // Sort by value descending to show largest assets first
    allAssets.sort((a, b) => {
      const aValue = typeof a.value === 'object' && a.value?.toNumber ? a.value.toNumber() : (parseFloat(a.value?.toString() || '0') || 0)
      const bValue = typeof b.value === 'object' && b.value?.toNumber ? b.value.toNumber() : (parseFloat(b.value?.toString() || '0') || 0)
      return bValue - aValue
    })

    return NextResponse.json(allAssets)
  } catch (error) {
    console.error('Error fetching combined assets:', error)
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
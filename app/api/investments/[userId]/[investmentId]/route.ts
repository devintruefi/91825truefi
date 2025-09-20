import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// PUT: Update an existing investment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; investmentId: string }> }
) {
  try {
    const { userId, investmentId } = await params
    const body = await request.json()

    if (!userId || !investmentId) {
      return NextResponse.json({ error: "User ID and Investment ID are required" }, { status: 400 })
    }

    // First, check if this investment exists and belongs to the user
    const existingAsset = await prisma.manual_assets.findFirst({
      where: {
        id: investmentId,
        user_id: userId
      }
    })

    if (!existingAsset) {
      // Check if it's a holding instead
      const existingHolding = await prisma.holdings.findFirst({
        where: {
          id: investmentId
        },
        include: {
          accounts: true
        }
      })

      if (!existingHolding || existingHolding.accounts?.user_id !== userId) {
        return NextResponse.json({ error: "Investment not found or access denied" }, { status: 404 })
      }

      // For holdings, update what we can in the holdings table
      const updatedHolding = await prisma.holdings.update({
        where: {
          id: investmentId
        },
        data: {
          quantity: body.quantity || existingHolding.quantity,
          cost_basis: body.purchase_price ? body.purchase_price * (body.quantity || existingHolding.quantity) : existingHolding.cost_basis,
          updated_at: new Date()
        }
      })

      // Store additional metadata (risk_level, notes, etc.) in user preferences
      if (body.risk_level !== undefined || body.notes !== undefined || body.target_allocation !== undefined) {
        const userPrefs = await prisma.user_preferences.findUnique({
          where: { user_id: userId }
        })

        const currentGoals = (userPrefs?.financial_goals as any) || {}
        const holdingMetadata = currentGoals.holding_metadata || {}

        // Update metadata for this holding
        holdingMetadata[investmentId] = {
          ...holdingMetadata[investmentId],
          risk_level: body.risk_level,
          notes: body.notes,
          target_allocation: body.target_allocation,
          is_favorite: body.is_favorite,
          updated_at: new Date().toISOString()
        }

        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: {
              ...currentGoals,
              holding_metadata: holdingMetadata
            },
            updated_at: new Date()
          },
          create: {
            id: require('crypto').randomUUID(),
            user_id: userId,
            theme: 'light',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: false,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: {
              holding_metadata: holdingMetadata
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        })
      }

      return NextResponse.json({
        success: true,
        investment: {
          id: updatedHolding.id,
          ...body,
          source: 'plaid'
        }
      })
    }

    // Update investment data stored as a manual asset
    const investmentData = {
      symbol: body.symbol,
      quantity: body.quantity,
      purchase_price: body.purchase_price,
      purchase_date: body.purchase_date,
      account_id: body.account_id,
      notes: body.notes,
      tags: body.tags,
      dividends: body.dividends,
      expense_ratio: body.expense_ratio,
      target_allocation: body.target_allocation,
      risk_level: body.risk_level,
      is_favorite: body.is_favorite
    }

    const updatedAsset = await prisma.manual_assets.update({
      where: {
        id: investmentId
      },
      data: {
        name: body.name,
        asset_class: mapTypeToAssetClass(body.type),
        value: body.current_price * (body.quantity || 1),
        notes: JSON.stringify(investmentData),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      investment: {
        id: updatedAsset.id,
        ...body
      }
    })
  } catch (error) {
    console.error("Error updating investment:", error)
    return NextResponse.json(
      { error: "Failed to update investment" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE: Delete an investment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; investmentId: string }> }
) {
  try {
    const { userId, investmentId } = await params

    if (!userId || !investmentId) {
      return NextResponse.json({ error: "User ID and Investment ID are required" }, { status: 400 })
    }

    // First check if it's a manual asset
    const asset = await prisma.manual_assets.findFirst({
      where: {
        id: investmentId,
        user_id: userId
      }
    })

    if (asset) {
      // Delete the manual asset
      await prisma.manual_assets.delete({
        where: {
          id: investmentId
        }
      })
    } else {
      // Check if it's a holding
      const holding = await prisma.holdings.findFirst({
        where: {
          id: investmentId
        },
        include: {
          accounts: true
        }
      })

      if (!holding || holding.accounts?.user_id !== userId) {
        return NextResponse.json({ error: "Investment not found or access denied" }, { status: 404 })
      }

      // For Plaid-connected holdings, we typically can't delete them directly
      // as they're synced from the financial institution
      // Instead, we might want to hide them or mark them as ignored
      // For now, return an appropriate message
      return NextResponse.json({
        error: "Cannot delete synced investment holdings. These are automatically managed by your connected account."
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Investment deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting investment:", error)
    return NextResponse.json(
      { error: "Failed to delete investment" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function
function mapTypeToAssetClass(type: string): string {
  const mapping: Record<string, string> = {
    "stock": "stocks",
    "bond": "bonds",
    "etf": "etfs",
    "mutual_fund": "mutual_funds",
    "crypto": "crypto",
    "commodity": "commodities",
    "real_estate": "real_estate",
    "cash": "cash",
    "other": "investment"
  }
  
  return mapping[type] || "investment"
}
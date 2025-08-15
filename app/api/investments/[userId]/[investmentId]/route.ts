import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// PUT: Update an existing investment
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string; investmentId: string } }
) {
  try {
    const { userId, investmentId } = params
    const body = await request.json()

    if (!userId || !investmentId) {
      return NextResponse.json({ error: "User ID and Investment ID are required" }, { status: 400 })
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
  { params }: { params: { userId: string; investmentId: string } }
) {
  try {
    const { userId, investmentId } = params

    if (!userId || !investmentId) {
      return NextResponse.json({ error: "User ID and Investment ID are required" }, { status: 400 })
    }

    // Verify the asset belongs to the user
    const asset = await prisma.manual_assets.findFirst({
      where: {
        id: investmentId,
        user_id: userId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Delete the asset
    await prisma.manual_assets.delete({
      where: {
        id: investmentId
      }
    })

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
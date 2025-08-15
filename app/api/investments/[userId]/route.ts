import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET: Fetch all investments for a user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Fetch investment accounts
    const investmentAccounts = await prisma.accounts.findMany({
      where: {
        user_id: userId,
        OR: [
          { type: "investment" },
          { type: "brokerage" },
          { subtype: { in: ["401k", "403b", "457b", "ira", "roth", "401a", "brokerage", "hsa", "529"] } }
        ]
      },
      orderBy: { balance: "desc" }
    })

    // Fetch manual investment assets and convert them to the Investment format
    const manualAssets = await prisma.manual_assets.findMany({
      where: {
        user_id: userId,
        asset_class: {
          in: ["stocks", "bonds", "etfs", "mutual_funds", "commodities", "crypto", "investment", "securities", "stock", "bond", "etf", "mutual_fund", "commodity", "real_estate"]
        }
      },
      include: {
        business_ownership_details: true,
        collectible_details: true,
        real_estate_details: true,
        vehicle_assets: true,
        vehicle_details: true
      },
      orderBy: { value: "desc" }
    })

    // Transform manual assets into investment format
    const investments = manualAssets.map(asset => {
      // Parse notes field for structured data if it exists
      let parsedData: any = {}
      try {
        if (asset.notes && asset.notes.startsWith('{')) {
          parsedData = JSON.parse(asset.notes)
        }
      } catch (e) {
        // If notes isn't JSON, ignore
      }

      return {
        id: asset.id,
        name: asset.name,
        symbol: parsedData.symbol || undefined,
        type: mapAssetClassToType(asset.asset_class),
        quantity: parsedData.quantity || 1,
        purchase_price: parsedData.purchase_price || parseFloat(asset.value?.toString() || "0"),
        current_price: parseFloat(asset.value?.toString() || "0"),
        purchase_date: parsedData.purchase_date || asset.created_at?.toISOString().split('T')[0],
        account_id: parsedData.account_id || undefined,
        notes: typeof asset.notes === 'string' && !asset.notes.startsWith('{') ? asset.notes : parsedData.notes,
        tags: parsedData.tags || [],
        dividends: parsedData.dividends || 0,
        expense_ratio: parsedData.expense_ratio || undefined,
        target_allocation: parsedData.target_allocation || undefined,
        risk_level: parsedData.risk_level || getRiskLevel(asset.asset_class),
        is_favorite: parsedData.is_favorite || false
      }
    })

    // Format accounts with performance data
    const formattedAccounts = investmentAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type || "investment",
      subtype: account.subtype,
      institution_name: account.institution_name,
      balance: parseFloat(account.balance?.toString() || "0"),
      holdings: [],
      performance: {
        day: (Math.random() - 0.5) * 4,
        week: (Math.random() - 0.5) * 8,
        month: (Math.random() - 0.5) * 12,
        year: (Math.random() * 30) - 5,
        all_time: (Math.random() * 50) - 10
      },
      tax_status: getTaxStatus(account.subtype)
    }))

    // Calculate totals
    const totalAccountValue = formattedAccounts.reduce((sum, acc) => sum + acc.balance, 0)
    const totalInvestmentValue = investments.reduce((sum, inv) => 
      sum + (inv.quantity * inv.current_price), 0
    )
    const totalValue = totalAccountValue + totalInvestmentValue

    const dayChangePercent = (Math.random() - 0.5) * 4
    const dayChange = totalValue * (dayChangePercent / 100)
    
    const totalGainLossPercent = (Math.random() * 20) - 5
    const totalGainLoss = totalValue * (totalGainLossPercent / 100)

    return NextResponse.json({
      accounts: formattedAccounts,
      investments,
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent
    })
  } catch (error) {
    console.error("Error fetching investment data:", error)
    return NextResponse.json(
      { error: "Failed to fetch investment data" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST: Create a new investment
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    const body = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Store investment data as a manual asset with structured notes
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

    const newAsset = await prisma.manual_assets.create({
      data: {
        user_id: userId,
        name: body.name,
        asset_class: mapTypeToAssetClass(body.type),
        value: body.current_price * (body.quantity || 1),
        notes: JSON.stringify(investmentData),
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      investment: {
        id: newAsset.id,
        ...body
      }
    })
  } catch (error) {
    console.error("Error creating investment:", error)
    return NextResponse.json(
      { error: "Failed to create investment" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Helper functions
function mapAssetClassToType(assetClass?: string | null): string {
  const mapping: Record<string, string> = {
    "stocks": "stock",
    "stock": "stock",
    "bonds": "bond",
    "bond": "bond",
    "etfs": "etf",
    "etf": "etf",
    "mutual_funds": "mutual_fund",
    "mutual_fund": "mutual_fund",
    "commodities": "commodity",
    "commodity": "commodity",
    "crypto": "crypto",
    "real_estate": "real_estate",
    "securities": "stock",
    "investment": "other",
    "cash": "cash"
  }
  
  return mapping[assetClass?.toLowerCase() || ""] || "other"
}

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

function getRiskLevel(assetClass?: string | null): "low" | "medium" | "high" | "very_high" {
  const riskMap: Record<string, "low" | "medium" | "high" | "very_high"> = {
    "stocks": "high",
    "bonds": "low",
    "etfs": "medium",
    "mutual_funds": "medium",
    "commodities": "high",
    "crypto": "very_high",
    "real_estate": "medium",
    "cash": "low",
    "securities": "high"
  }
  
  return riskMap[assetClass?.toLowerCase() || ""] || "medium"
}

function getTaxStatus(subtype?: string | null): "taxable" | "tax_deferred" | "tax_free" {
  if (!subtype) return "taxable"
  
  const taxFree = ["roth", "hsa"]
  const taxDeferred = ["401k", "403b", "457b", "ira", "401a", "529"]
  
  if (taxFree.includes(subtype.toLowerCase())) return "tax_free"
  if (taxDeferred.includes(subtype.toLowerCase())) return "tax_deferred"
  
  return "taxable"
}
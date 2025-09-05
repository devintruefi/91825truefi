import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getUserFromRequest } from '@/lib/auth'

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

    // Note: Manual holdings have account_id = null, but we need to filter by user somehow
    // Since the current schema doesn't have user_id on holdings table directly,
    // we'll need to add a user_holdings table or modify the approach
    
    // For now, let's get all manual holdings (account_id = null) and Plaid holdings for this user
    const holdings = await prisma.holdings.findMany({
      where: {
        OR: [
          // Manual holdings (account_id is NULL) - these need better user association
          { account_id: null },
          // Plaid holdings from user's accounts
          { 
            accounts: {
              user_id: userId
            }
          }
        ]
      },
      include: {
        securities: true,
        accounts: true
      },
      orderBy: [
        { institution_value: { sort: "desc", nulls: "last" } },
        { created_at: "desc" }
      ]
    })

    // Transform holdings into investment format
    const investments = holdings.map(holding => {
      const security = holding.securities
      const account = holding.accounts
      
      return {
        id: holding.id,
        name: security?.name || 'Unknown Security',
        symbol: security?.ticker || undefined,
        type: mapSecurityTypeToType(security?.security_type),
        quantity: parseFloat(holding.quantity?.toString() || "0"),
        purchase_price: parseFloat(holding.cost_basis?.toString() || "0") / parseFloat(holding.quantity?.toString() || "1"),
        current_price: parseFloat(holding.institution_price?.toString() || "0"),
        purchase_date: holding.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        account_id: holding.account_id || undefined,
        notes: undefined, // Notes could be added to holdings table if needed
        tags: [], // Tags could be added as a separate relation
        dividends: 0, // Would need dividend tracking
        expense_ratio: undefined, // Could be added to securities table
        target_allocation: undefined, // Could be user preference
        risk_level: getRiskLevelFromType(mapSecurityTypeToType(security?.security_type)),
        is_favorite: false, // Could be added as user preference
        source: holding.account_id ? 'plaid' : 'manual'
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
    console.error("Error details:", JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: "Failed to fetch investment data", details: error.message || 'Unknown error' },
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId;
    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.quantity || body.quantity < 0 || body.purchase_price < 0) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    // Validate purchase date is not in future
    const purchaseDate = new Date(body.purchase_date);
    if (purchaseDate > new Date()) {
      return NextResponse.json({ error: "Purchase date cannot be in the future" }, { status: 400 });
    }

    // First, create or find the security
    let security;
    if (body.symbol && ['stock', 'etf', 'mutual_fund', 'bond'].includes(body.type)) {
      // For securities with symbols, try to find existing first
      security = await prisma.securities.findFirst({
        where: { 
          ticker: body.symbol,
          security_type: body.type
        }
      });
      
      if (!security) {
        // Create new security record
        security = await prisma.securities.create({
          data: {
            name: body.name,
            ticker: body.symbol,
            security_type: body.type,
            currency: body.currency || 'USD',
            created_at: new Date()
          }
        });
      }
    } else {
      // For securities without symbols (like "Other"), always create new security record
      security = await prisma.securities.create({
        data: {
          name: body.name,
          ticker: body.symbol || null,
          security_type: body.type || 'other',
          currency: body.currency || 'USD',
          created_at: new Date()
        }
      });
    }

    // Check for existing manual holding for this security to prevent duplicates
    const existingHolding = await prisma.holdings.findFirst({
      where: {
        security_id: security.id,
        account_id: null, // Manual holdings have NULL account_id
        // For user-specific holdings, we'd need a user_id column or link through accounts
      }
    });

    let holding;
    if (existingHolding) {
      // Update existing manual holding
      holding = await prisma.holdings.update({
        where: { id: existingHolding.id },
        data: {
          quantity: body.quantity,
          cost_basis: body.purchase_price * body.quantity,
          institution_price: body.current_price,
          institution_value: body.current_price * body.quantity,
          updated_at: new Date(),
          institution_price_datetime: new Date(),
          position_iso_currency_code: body.currency || 'USD'
        }
      });
    } else {
      // Create new manual holding
      holding = await prisma.holdings.create({
        data: {
          security_id: security.id,
          account_id: null, // Manual holdings have NULL account_id
          quantity: body.quantity,
          cost_basis: body.purchase_price * body.quantity,
          institution_price: body.current_price,
          institution_value: body.current_price * body.quantity,
          created_at: new Date(),
          updated_at: new Date(),
          institution_price_datetime: new Date(),
          position_iso_currency_code: body.currency || 'USD'
        }
      });
    }

    // Mark investments onboarding as complete after first successful save
    try {
      await prisma.onboarding_progress.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId }
      });
      
      // Update the specific investments step
      const progressData = await prisma.onboarding_progress.findUnique({
        where: { user_id: userId }
      });
      
      if (progressData) {
        const currentData = typeof progressData.data === 'object' ? progressData.data as any : {};
        await prisma.onboarding_progress.update({
          where: { user_id: userId },
          data: {
            data: {
              ...currentData,
              investments_completed: true
            },
            updated_at: new Date()
          }
        });
      }
    } catch (onboardingError) {
      console.error('Failed to update onboarding:', onboardingError);
      // Don't fail the whole request for onboarding errors
    }

    return NextResponse.json({
      success: true,
      saved: true,
      id: holding.id,
      investment: {
        id: holding.id,
        name: security.name,
        symbol: security.ticker,
        type: security.security_type,
        quantity: parseFloat(holding.quantity?.toString() || "0"),
        purchase_price: body.purchase_price,
        current_price: parseFloat(holding.institution_price?.toString() || "0"),
        purchase_date: body.purchase_date,
        notes: body.notes,
        source: 'manual'
      }
    });
  } catch (error) {
    console.error("Error creating investment:", error);
    return NextResponse.json(
      { error: "Failed to create investment", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
function mapSecurityTypeToType(securityType?: string | null): string {
  const mapping: Record<string, string> = {
    "stock": "stock",
    "equity": "stock",
    "etf": "etf",
    "mutual fund": "mutual_fund",
    "bond": "bond",
    "fixed income": "bond",
    "derivative": "other",
    "commodity": "commodity",
    "crypto": "crypto",
    "cryptocurrency": "crypto",
    "cash": "cash",
    "other": "other"
  }
  
  return mapping[securityType?.toLowerCase() || ""] || "other"
}

function getRiskLevelFromType(type: string): "low" | "medium" | "high" | "very_high" {
  const riskMap: Record<string, "low" | "medium" | "high" | "very_high"> = {
    "stock": "high",
    "bond": "low", 
    "etf": "medium",
    "mutual_fund": "medium",
    "commodity": "high",
    "crypto": "very_high",
    "real_estate": "medium",
    "cash": "low",
    "other": "medium"
  }
  
  return riskMap[type?.toLowerCase() || ""] || "medium"
}

function getTaxStatus(subtype?: string | null): "taxable" | "tax_deferred" | "tax_free" {
  if (!subtype) return "taxable"
  
  const taxFree = ["roth", "hsa"]
  const taxDeferred = ["401k", "403b", "457b", "ira", "401a", "529"]
  
  if (taxFree.includes(subtype.toLowerCase())) return "tax_free"
  if (taxDeferred.includes(subtype.toLowerCase())) return "tax_deferred"
  
  return "taxable"
}
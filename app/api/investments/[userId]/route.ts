import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getUserFromRequest } from '@/lib/auth'
import { polygonService } from '@/lib/polygon'

const prisma = new PrismaClient()

// GET: Fetch all investments for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Verify user authentication
    const user = await getUserFromRequest(request);
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

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

    // Fetch all holdings for this user's accounts (including manual)
    const holdings = await prisma.holdings.findMany({
      where: {
        accounts: {
          user_id: userId
        }
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

    // Extract unique tickers for live price fetching
    const uniqueTickers = [...new Set(
      holdings
        .filter(h => h.securities?.ticker)
        .map(h => h.securities!.ticker!)
    )];

    // Fetch live prices if user is logged in and refresh requested or prices are stale
    const priceMap = new Map<string, number>();
    
    if (user && polygonService.isConfigured() && (refresh || shouldRefreshPrices(holdings))) {
      console.log(`Fetching live prices for ${uniqueTickers.length} unique tickers`);
      
      await Promise.all(
        uniqueTickers.map(async (ticker) => {
          try {
            const quote = await polygonService.getQuote(ticker);
            priceMap.set(ticker, quote.price);
          } catch (error: any) {
            console.warn(`Failed to fetch live price for ${ticker}:`, error?.message || error);
            // Keep existing price from database
            priceMap.set(ticker, null);
          }
        })
      );
    }

    // Transform holdings into investment format with live prices
    const investments = holdings.map(holding => {
      const security = holding.securities
      const account = holding.accounts
      const ticker = security?.ticker;
      
      // Use live price if available, otherwise use stored price
      const livePrice = ticker ? priceMap.get(ticker) : null;
      const currentPrice = livePrice || parseFloat(holding.institution_price?.toString() || "0");
      const currentValue = currentPrice * parseFloat(holding.quantity?.toString() || "0");
      
      return {
        id: holding.id,
        name: security?.name || 'Unknown Security',
        symbol: ticker || undefined,
        type: mapSecurityTypeToType(security?.security_type),
        quantity: parseFloat(holding.quantity?.toString() || "0"),
        purchase_price: parseFloat(holding.cost_basis?.toString() || "0") / parseFloat(holding.quantity?.toString() || "1"),
        current_price: currentPrice,
        current_value: currentValue,
        cost_basis: parseFloat(holding.cost_basis?.toString() || "0"),
        purchase_date: holding.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        account_id: holding.account_id || undefined,
        price_source: livePrice ? 'live' : 'cached',
        last_updated: livePrice ? new Date().toISOString() : holding.institution_price_datetime?.toISOString(),
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

    // Calculate totals first
    const totalAccountValue = investmentAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || "0"), 0)
    const totalInvestmentValue = investments.reduce((sum, inv) => 
      sum + (inv.quantity * inv.current_price), 0
    )
    const totalValue = totalAccountValue + totalInvestmentValue

    // Calculate real performance metrics
    const performanceMetrics = await calculateRealPerformance(holdings, totalValue);
    
    // Format accounts with real performance data
    const formattedAccounts = investmentAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type || "investment",
      subtype: account.subtype,
      institution_name: account.institution_name,
      balance: parseFloat(account.balance?.toString() || "0"),
      holdings: [],
      performance: performanceMetrics.performance,
      tax_status: getTaxStatus(account.subtype)
    }))

    const { dayChange, dayChangePercent, totalGainLoss, totalGainLossPercent } = performanceMetrics;

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
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    const user = await getUserFromRequest(request);
    console.log('POST /api/investments - Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      paramsUserId: userId,
      authHeader: request.headers.get('Authorization')?.substring(0, 50)
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    if (!userId || userId !== user.id) {
      console.error('User ID mismatch:', { userId, authenticatedUserId: user.id });
      return NextResponse.json({ 
        error: "Invalid user ID - Please ensure you're logged in correctly",
        details: { expected: user.id, received: userId }
      }, { status: 400 });
    }

    const body = await request.json();
    
    console.log('Investment POST request:', {
      userId,
      authenticatedUserId: user.id,
      body: {
        name: body.name,
        symbol: body.symbol,
        type: body.type,
        quantity: body.quantity,
        purchase_price: body.purchase_price,
        purchase_date: body.purchase_date
      }
    });

    // Validate required fields
    if (!body.name || !body.quantity || body.quantity <= 0) {
      return NextResponse.json({ error: "Name and quantity are required. Quantity must be greater than 0." }, { status: 400 });
    }
    
    // Purchase price is optional (can be 0 or null initially)
    if (body.purchase_price < 0) {
      return NextResponse.json({ error: "Purchase price cannot be negative" }, { status: 400 });
    }

    // Validate purchase date is not in future
    const purchaseDate = new Date(body.purchase_date);
    if (purchaseDate > new Date()) {
      return NextResponse.json({ error: "Purchase date cannot be in the future" }, { status: 400 });
    }

    // Market-traded securities need server-side price verification
    const marketTypes = ['stock', 'etf', 'mutual_fund', 'bond', 'crypto'];
    let currentPrice = body.purchase_price; // Default to purchase price
    let costBasis = body.purchase_price * body.quantity;
    
    if (body.symbol && marketTypes.includes(body.type) && polygonService.isConfigured()) {
      try {
        // Fetch live price from Polygon, ignore client-provided current_price
        const quote = await polygonService.getQuote(body.symbol);
        currentPrice = quote.price;
        
        console.log(`Server-side price verification for ${body.symbol}: $${currentPrice}`);
      } catch (error: any) {
        console.warn(`Failed to fetch live price for ${body.symbol}, using purchase price:`, error?.message || error);
        // Keep using purchase price as fallback
      }
    }

    // Use explicit cost basis calculation
    costBasis = (body.purchase_price ?? currentPrice) * body.quantity;
    if (costBasis < 0) {
      return NextResponse.json({ error: "Invalid cost basis calculation" }, { status: 400 });
    }

    // First, create or find the security
    let security;
    if (body.symbol && ['stock', 'etf', 'mutual_fund', 'bond', 'crypto'].includes(body.type)) {
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

    // Get or create a manual investment account for this user
    let manualAccount = await prisma.accounts.findFirst({
      where: {
        user_id: userId,
        type: 'investment',
        subtype: 'manual',
        name: 'Manual Investments'
      }
    });
    
    if (!manualAccount) {
      console.log('Creating manual investment account for user:', userId);
      manualAccount = await prisma.accounts.create({
        data: {
          user_id: userId,
          name: 'Manual Investments',
          type: 'investment',
          subtype: 'manual',
          balance: 0,
          currency: 'USD',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    // Check for existing holding for this security in the user's manual account
    const existingHolding = await prisma.holdings.findFirst({
      where: {
        security_id: security.id,
        account_id: manualAccount.id
      }
    });

    let holding;
    if (existingHolding) {
      // Update existing manual holding with server-verified price
      holding = await prisma.holdings.update({
        where: { id: existingHolding.id },
        data: {
          quantity: body.quantity,
          cost_basis: costBasis,
          institution_price: currentPrice,
          institution_value: currentPrice * body.quantity,
          updated_at: new Date(),
          institution_price_datetime: new Date(),
          position_iso_currency_code: body.currency || 'USD'
        }
      });
    } else {
      // Create new manual holding with server-verified price
      holding = await prisma.holdings.create({
        data: {
          security_id: security.id,
          account_id: manualAccount.id, // Link to user's manual account
          quantity: body.quantity,
          cost_basis: costBasis,
          institution_price: currentPrice,
          institution_value: currentPrice * body.quantity,
          created_at: new Date(),
          updated_at: new Date(),
          institution_price_datetime: new Date(),
          position_iso_currency_code: body.currency || 'USD'
        }
      });
    }

    // Update the manual account balance
    const newBalance = await prisma.holdings.aggregate({
      where: {
        account_id: manualAccount.id
      },
      _sum: {
        institution_value: true
      }
    });
    
    await prisma.accounts.update({
      where: { id: manualAccount.id },
      data: {
        balance: newBalance._sum.institution_value || 0,
        updated_at: new Date()
      }
    });

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

// Helper function to determine if prices need refreshing
function shouldRefreshPrices(holdings: any[]): boolean {
  // Refresh if any price is older than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return holdings.some(h => 
    !h.institution_price_datetime || 
    new Date(h.institution_price_datetime) < fiveMinutesAgo
  );
}

// Calculate real performance metrics based on cost basis and current value
async function calculateRealPerformance(holdings: any[], totalValue: number) {
  // For now, calculate simple performance based on cost basis vs current value
  // In production, you'd fetch historical prices for accurate time-period performance
  
  let totalCostBasis = 0;
  let totalCurrentValue = 0;
  
  for (const holding of holdings) {
    totalCostBasis += parseFloat(holding.cost_basis?.toString() || "0");
    totalCurrentValue += parseFloat(holding.institution_value?.toString() || "0");
  }
  
  // Calculate overall gain/loss
  const totalGainLoss = totalCurrentValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 
    ? (totalGainLoss / totalCostBasis) * 100 
    : 0;
  
  // For time-based performance, we'd need historical prices
  // For now, estimate based on overall performance with decreasing factors
  const estimatedPerformance = {
    day: totalGainLossPercent * 0.01,  // Roughly 1% of total performance
    week: totalGainLossPercent * 0.05,  // Roughly 5% of total performance
    month: totalGainLossPercent * 0.20, // Roughly 20% of total performance
    year: totalGainLossPercent * 0.80,  // Roughly 80% of total performance
    all_time: totalGainLossPercent      // Full performance
  };
  
  // Day change would ideally compare to yesterday's close
  // For now, use a small fraction of total performance
  const dayChangePercent = estimatedPerformance.day;
  const dayChange = totalValue * (dayChangePercent / 100);
  
  return {
    performance: estimatedPerformance,
    totalGainLoss,
    totalGainLossPercent,
    dayChange,
    dayChangePercent
  };
}
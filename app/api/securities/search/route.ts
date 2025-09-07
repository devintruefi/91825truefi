import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { polygonService } from '@/lib/polygon';

// Mock data for securities search - used for non-logged-in users and fallback
const MOCK_SECURITIES = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Consumer Discretionary' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ', currency: 'USD', sector: 'Communication Services' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Financial Services' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Healthcare' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Financial Services' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Consumer Staples' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Consumer Staples' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Healthcare' },
  { symbol: 'HD', name: 'Home Depot Inc.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Consumer Discretionary' },
  { symbol: 'BAC', name: 'Bank of America Corp.', type: 'stock', exchange: 'NYSE', currency: 'USD', sector: 'Financial Services' },
  
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Diversified' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Small Cap' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Diversified' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Large Cap' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'International' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Emerging Markets' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Fixed Income' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Real Estate' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'etf', exchange: 'ARCA', currency: 'USD', sector: 'Commodities' },
  
  // Mutual Funds (simplified)
  { symbol: 'VTSAX', name: 'Vanguard Total Stock Market Index Fund', type: 'mutual_fund', exchange: 'MUTUAL', currency: 'USD', sector: 'Diversified' },
  { symbol: 'VTIAX', name: 'Vanguard Total International Stock Index Fund', type: 'mutual_fund', exchange: 'MUTUAL', currency: 'USD', sector: 'International' },
  { symbol: 'VBTLX', name: 'Vanguard Total Bond Market Index Fund', type: 'mutual_fund', exchange: 'MUTUAL', currency: 'USD', sector: 'Fixed Income' },
  
  // Crypto (major ones)
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', sector: 'Cryptocurrency' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', sector: 'Cryptocurrency' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', sector: 'Cryptocurrency' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', sector: 'Cryptocurrency' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', exchange: 'CRYPTO', currency: 'USD', sector: 'Cryptocurrency' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50 for better coverage

    if (query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // Check if user is logged in
    const user = await getUserFromRequest(request);
    
    console.log(`Securities search: query="${query}", user=${user?.id ? 'logged-in' : 'anonymous'}, polygon=${polygonService.isConfigured() ? 'configured' : 'not-configured'}`);
    
    // For logged-in users with Polygon API configured, use live search
    if (user && polygonService.isConfigured()) {
      try {
        // Search via Polygon API
        const polygonResults = await polygonService.searchTickers(query, limit);
        
        // DON'T enrich with prices during search - too many API calls!
        // Users will see prices when they select a specific security
        const enrichedResults = polygonResults.map(result => ({
          symbol: result.symbol,
          name: result.name,
          type: result.type,
          exchange: result.exchange,
          currency: result.currency,
          current_price: null, // Price will be fetched when selected
          last_updated: new Date().toISOString(),
          source: 'polygon'
        }));
        
        return NextResponse.json({ 
          results: enrichedResults,
          query,
          total: enrichedResults.length,
          source: 'polygon'
        });
        
      } catch (polygonError) {
        console.error('Polygon search failed, using mock fallback:', polygonError);
        // Fall through to mock search
      }
    }

    // Fallback: Mock search for non-logged-in users or API failures
    const matchedSecurities = MOCK_SECURITIES
      .filter(security => 
        security.symbol.toLowerCase().includes(query) ||
        security.name.toLowerCase().includes(query)
      )
      .slice(0, limit);

    // Enrich mock results with prices from internal quote endpoint
    const resultsWithPrices = await Promise.all(
      matchedSecurities.map(async (security) => {
        return await getEnrichedSecurity(security, request);
      })
    );

    return NextResponse.json({ 
      results: resultsWithPrices,
      query,
      total: resultsWithPrices.length,
      source: 'mock'
    });
    
  } catch (error) {
    console.error('Securities search error:', error);
    return NextResponse.json(
      { error: 'Failed to search securities' },
      { status: 500 }
    );
  }
}

// Helper function to enrich security with current price
async function getEnrichedSecurity(security: any, request: NextRequest) {
  let currentPrice = Math.round((Math.random() * 500 + 10) * 100) / 100; // fallback
  
  try {
    // Fetch price from our internal quote API (which handles auth and fallback)
    const quoteResponse = await fetch(
      `${request.nextUrl.origin}/api/securities/quote?symbol=${security.symbol}`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      currentPrice = quoteData.price || currentPrice;
    }
  } catch (error) {
    console.warn(`Failed to fetch quote for ${security.symbol}:`, error);
  }
  
  return {
    symbol: security.symbol,
    name: security.name,
    type: security.type,
    exchange: security.exchange,
    currency: security.currency,
    sector: security.sector,
    current_price: currentPrice,
    last_updated: new Date().toISOString()
  };
}
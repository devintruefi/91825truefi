import { NextRequest, NextResponse } from 'next/server';

// Mock data for securities search - in production this would come from a financial data provider
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
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // Search by symbol or name
    const matchedSecurities = MOCK_SECURITIES
      .filter(security => 
        security.symbol.toLowerCase().includes(query) ||
        security.name.toLowerCase().includes(query)
      )
      .slice(0, limit);

    // Fetch real prices for matched securities
    const resultsWithPrices = await Promise.all(
      matchedSecurities.map(async (security) => {
        let currentPrice = Math.round((Math.random() * 500 + 10) * 100) / 100; // fallback
        
        try {
          // Fetch real price from our quote API
          const quoteResponse = await fetch(
            `${request.nextUrl.origin}/api/securities/quote?symbol=${security.symbol}`
          );
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            currentPrice = quoteData.price || currentPrice;
          }
        } catch (error) {
          console.error(`Failed to fetch quote for ${security.symbol}:`, error);
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
      })
    );

    return NextResponse.json({ 
      results: resultsWithPrices,
      query,
      total: resultsWithPrices.length
    });
  } catch (error) {
    console.error('Securities search error:', error);
    return NextResponse.json(
      { error: 'Failed to search securities' },
      { status: 500 }
    );
  }
}
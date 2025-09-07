import { NextRequest, NextResponse } from 'next/server';

// Mock quotes for demo
const mockQuotes: Record<string, { price: number; change: number; changePercent: number }> = {
  'AAPL': { price: 150.00, change: 2.50, changePercent: 1.69 },
  'GOOGL': { price: 135.00, change: -1.20, changePercent: -0.88 },
  'MSFT': { price: 380.00, change: 5.00, changePercent: 1.33 },
  'AMZN': { price: 140.00, change: 3.00, changePercent: 2.19 },
  'TSLA': { price: 250.00, change: -5.00, changePercent: -1.96 },
  'VOO': { price: 420.00, change: 3.50, changePercent: 0.84 },
  'SPY': { price: 445.00, change: 2.80, changePercent: 0.63 },
  'QQQ': { price: 365.00, change: 4.20, changePercent: 1.16 }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }
  
  const quote = mockQuotes[symbol];
  
  if (!quote) {
    // Return a generic quote for unknown symbols
    return NextResponse.json({
      symbol,
      price: 100.00,
      change: 0.00,
      changePercent: 0.00,
      timestamp: new Date().toISOString()
    });
  }
  
  return NextResponse.json({
    symbol,
    ...quote,
    timestamp: new Date().toISOString()
  });
}
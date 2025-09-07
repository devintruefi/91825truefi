import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { polygonService } from '@/lib/polygon';

// Fallback prices if API is unavailable (enhanced dataset)
const FALLBACK_QUOTES: Record<string, { price: number; change: number; changePercent: number; volume: number }> = {
  'AAPL': { price: 233.20, change: 2.45, changePercent: 1.06, volume: 45234567 },
  'GOOGL': { price: 197.56, change: -1.23, changePercent: -0.62, volume: 23456789 },
  'MSFT': { price: 450.10, change: 5.67, changePercent: 1.28, volume: 34567890 },
  'AMZN': { price: 234.67, change: -3.21, changePercent: -1.35, volume: 28901234 },
  'TSLA': { price: 389.85, change: 15.43, changePercent: 4.12, volume: 67890123 },
  'NVDA': { price: 145.32, change: 8.92, changePercent: 6.54, volume: 89012345 },
  'META': { price: 575.89, change: -7.65, changePercent: -1.31, volume: 21098765 },
  'JPM': { price: 241.45, change: 1.87, changePercent: 0.78, volume: 15432109 },
  'JNJ': { price: 156.78, change: 0.45, changePercent: 0.29, volume: 12345678 },
  'V': { price: 309.23, change: 3.56, changePercent: 1.16, volume: 18765432 },
  'WMT': { price: 98.45, change: -0.67, changePercent: -0.68, volume: 24681357 },
  'SPY': { price: 587.45, change: 4.23, changePercent: 0.72, volume: 98765432 },
  'QQQ': { price: 527.89, change: 6.78, changePercent: 1.30, volume: 56789012 },
  'BTC': { price: 97845.32, change: -1234.56, changePercent: -1.25, volume: 0 },
  'ETH': { price: 3456.78, change: 89.12, changePercent: 2.65, volume: 0 },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Check if user is logged in using existing auth system
    const user = await getUserFromRequest(request);
    
    // For logged-in users with Polygon API configured, use live data
    if (user && polygonService.isConfigured()) {
      try {
        const quote = await polygonService.getQuote(symbol);
        
        return NextResponse.json({
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: `${quote.changePercent.toFixed(2)}%`,
          volume: quote.volume,
          timestamp: quote.timestamp.toISOString(),
          source: 'polygon'
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
          }
        });
        
      } catch (error) {
        console.error('Polygon quote error, using fallback:', error);
        // Fall through to fallback logic
      }
    }

    // Fallback logic for non-logged-in users or API failures
    const fallbackData = FALLBACK_QUOTES[symbol];
    if (fallbackData) {
      // Add small realistic variation to simulate market movement
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1%
      const adjustedPrice = fallbackData.price * (1 + priceVariation);
      const adjustedChange = fallbackData.change + (fallbackData.price * priceVariation);
      const adjustedChangePercent = fallbackData.price > 0 
        ? (adjustedChange / fallbackData.price) * 100 
        : 0;
      
      return NextResponse.json({
        symbol,
        price: parseFloat(adjustedPrice.toFixed(2)),
        change: parseFloat(adjustedChange.toFixed(2)),
        changePercent: `${adjustedChangePercent.toFixed(2)}%`,
        volume: fallbackData.volume + Math.floor((Math.random() - 0.5) * fallbackData.volume * 0.1),
        timestamp: new Date().toISOString(),
        source: 'fallback'
      });
    }

    // Generic fallback for unknown symbols
    const randomPrice = Math.random() * 200 + 50;
    const randomChange = (Math.random() - 0.5) * 10;
    const randomChangePercent = (randomChange / randomPrice) * 100;
    
    return NextResponse.json({
      symbol,
      price: parseFloat(randomPrice.toFixed(2)),
      change: parseFloat(randomChange.toFixed(2)),
      changePercent: `${randomChangePercent.toFixed(2)}%`,
      volume: Math.floor(Math.random() * 5000000),
      timestamp: new Date().toISOString(),
      source: 'random'
    });

  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote data' },
      { status: 500 }
    );
  }
}
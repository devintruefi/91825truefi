import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { polygonService } from '@/lib/polygon';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');

    if (!symbol || !date) {
      return NextResponse.json(
        { error: 'Symbol and date are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if date is not in the future
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (requestedDate > today) {
      return NextResponse.json(
        { error: 'Cannot fetch price for future dates' },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const user = await getUserFromRequest(request);
    
    console.log(`Historical price request: symbol=${symbol}, date=${date}, user=${user?.id ? 'logged-in' : 'anonymous'}`);

    // For logged-in users with Polygon API configured, fetch historical price
    if (user && polygonService.isConfigured()) {
      try {
        const historicalPrice = await polygonService.getHistoricalPrice(symbol, date);
        
        if (historicalPrice !== null) {
          return NextResponse.json({
            symbol,
            date,
            price: historicalPrice,
            source: 'polygon',
            message: `Historical price for ${symbol} on ${date}`
          });
        } else {
          // No historical data available
          return NextResponse.json({
            symbol,
            date,
            price: null,
            source: 'polygon',
            message: `No historical price data available for ${symbol} on ${date}`
          });
        }
      } catch (error: any) {
        console.error('Polygon historical price error:', error);
        
        // Check if it's a rate limit error
        if (error?.message?.includes('Rate limited')) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
        
        // Fall through to mock price for other errors
      }
    }

    // For non-logged-in users or API failures, return a mock historical price
    // This is just for demo purposes - in production, you might want to require authentication
    const mockPrice = generateMockHistoricalPrice(symbol, date);
    
    return NextResponse.json({
      symbol,
      date,
      price: mockPrice,
      source: 'mock',
      message: `Mock historical price for demonstration`
    });
    
  } catch (error) {
    console.error('Historical price endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical price' },
      { status: 500 }
    );
  }
}

// Generate a mock historical price based on symbol and date
function generateMockHistoricalPrice(symbol: string, date: string): number {
  // Use symbol and date to generate a consistent mock price
  const basePrice = symbol.length * 10 + symbol.charCodeAt(0);
  const dateNum = new Date(date).getTime();
  const variance = ((dateNum % 100) - 50) / 100; // -50% to +50% variance
  
  return Math.round((basePrice * (1 + variance)) * 100) / 100;
}
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { polygonService } from '@/lib/polygon';

export async function GET(request: NextRequest) {
  try {
    // Only available to logged-in users - this is a premium feature
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for historical data' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const range = searchParams.get('range')?.toUpperCase();

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' }, 
        { status: 400 }
      );
    }

    if (!range) {
      return NextResponse.json(
        { error: 'Range parameter is required' }, 
        { status: 400 }
      );
    }

    // Validate range parameter
    const validRanges = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
    if (!validRanges.includes(range)) {
      return NextResponse.json(
        { 
          error: 'Invalid range parameter',
          valid_ranges: validRanges,
          provided: range
        }, 
        { status: 400 }
      );
    }

    // Check if Polygon service is configured
    if (!polygonService.isConfigured()) {
      return NextResponse.json(
        { error: 'Historical data service not configured' },
        { status: 503 }
      );
    }

    try {
      // Fetch historical data from Polygon
      const historyData = await polygonService.getHistory(symbol, range);
      
      // Return normalized data structure
      return NextResponse.json({
        symbol,
        range,
        data: historyData,
        count: historyData.length,
        source: 'polygon',
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'Content-Type': 'application/json'
        }
      });
      
    } catch (polygonError) {
      console.error(`Historical data fetch failed for ${symbol} (${range}):`, polygonError);
      
      // Check if it's a rate limit or API error
      const errorMessage = polygonError instanceof Error ? polygonError.message : 'Unknown error';
      
      if (errorMessage.includes('Rate limited')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again in a moment.',
            retry_after: 60
          },
          { status: 429 }
        );
      }
      
      if (errorMessage.includes('not configured')) {
        return NextResponse.json(
          { error: 'Historical data service unavailable' },
          { status: 503 }
        );
      }
      
      // For other API errors, return generic message
      return NextResponse.json(
        { 
          error: 'Failed to fetch historical data',
          symbol,
          range,
          details: 'Data source temporarily unavailable'
        },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('Securities history API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching historical data'
      },
      { status: 500 }
    );
  }
}

// Export named function for potential future use
export { GET as handler };
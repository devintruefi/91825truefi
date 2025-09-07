import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPositionMetrics } from '@/lib/investments/performance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    const { userId } = await params;
    
    // Verify the user is authorized to view this data
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get investment metrics
    const metrics = await getPositionMetrics(userId);
    
    // Format the response
    return NextResponse.json({
      success: true,
      data: {
        positions: metrics.positions.map(p => ({
          security_id: p.security_id,
          security_name: p.security_name,
          ticker: p.ticker,
          account_id: p.account_id,
          account_name: p.account_name,
          quantity: p.quantity,
          cost_basis: Math.round(p.cost_basis * 100) / 100,
          market_value: Math.round(p.market_value * 100) / 100,
          unrealized_gain: Math.round(p.unrealized_gain * 100) / 100,
          unrealized_gain_pct: Math.round(p.unrealized_gain_pct * 100) / 100
        })),
        portfolio: {
          total_cost_basis: Math.round(metrics.portfolio.total_cost_basis * 100) / 100,
          total_market_value: Math.round(metrics.portfolio.total_market_value * 100) / 100,
          total_unrealized_gain: Math.round(metrics.portfolio.total_unrealized_gain * 100) / 100,
          total_unrealized_gain_pct: Math.round(metrics.portfolio.total_unrealized_gain_pct * 100) / 100,
          position_count: metrics.portfolio.position_count
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error calculating investment metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate investment metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
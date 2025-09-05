import { NextRequest, NextResponse } from 'next/server';
import { analyzeBudgetPerformance, adjustBudgetAutomatically } from '@/lib/budget-automation';

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  // Don't allow for demo user
  if (userId === DEMO_USER_ID) {
    return NextResponse.json({ 
      error: 'Budget analysis not available for demo user' 
    }, { status: 400 });
  }
  
  try {
    const analysis = await analyzeBudgetPerformance(userId);
    
    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing budget:', error);
    return NextResponse.json(
      { error: 'Failed to analyze budget' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  // Don't allow for demo user
  if (userId === DEMO_USER_ID) {
    return NextResponse.json({ 
      error: 'Budget adjustment not available for demo user' 
    }, { status: 400 });
  }
  
  try {
    const body = await req.json();
    const { autoAdjust = false } = body;
    
    // First analyze
    const analysis = await analyzeBudgetPerformance(userId);
    
    let adjusted = false;
    if (autoAdjust && analysis.needsAdjustment) {
      adjusted = await adjustBudgetAutomatically(userId);
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      adjusted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing budget analysis:', error);
    return NextResponse.json(
      { error: 'Failed to process budget analysis' },
      { status: 500 }
    );
  }
}
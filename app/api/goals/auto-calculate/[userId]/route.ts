import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  
  try {
    const token = req.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }
    
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/auto-calculate/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Backend auto-calculate error:', error);
      return NextResponse.json({ error: 'Failed to auto-calculate goals' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Auto-calculate error:', error);
    return NextResponse.json({ 
      error: 'Failed to auto-calculate goals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
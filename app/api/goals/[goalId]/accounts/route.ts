import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  
  try {
    const token = req.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }
    
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/${goalId}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Backend goal accounts fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch goal accounts' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Goal accounts fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch goal accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  
  try {
    const body = await req.json();
    const token = req.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }
    
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/${goalId}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Backend goal accounts creation error:', error);
      return NextResponse.json({ error: 'Failed to create goal account mapping' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Goal accounts creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create goal account mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
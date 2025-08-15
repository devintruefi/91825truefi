import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  
  try {
    const body = await req.json();
    const token = req.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }
    
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Backend goal update error:', error);
      return NextResponse.json({ error: 'Failed to update goal' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Goal update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  
  try {
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/${goalId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Backend goal fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Goal fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch goals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
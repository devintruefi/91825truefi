import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { user_id, user_email } = await req.json();
    if (!user_id || !user_email) {
      return NextResponse.json({ error: 'Missing user_id or user_email' }, { status: 400 });
    }
    
    // Proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/plaid/link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, user_email }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend Plaid error:', error);
      return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Failed to create Plaid link token:', err?.message || err);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
} 
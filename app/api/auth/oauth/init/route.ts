import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { provider } = await req.json();
    console.log('OAuth init request received for provider:', provider);
    
    if (!provider || !['google', 'microsoft', 'apple'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    console.log('Backend URL:', backendUrl);
    
    const requestBody = {
      provider,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/${provider}`
    };
    console.log('Request body to backend:', requestBody);
    
    const response = await fetch(`${backendUrl}/api/auth/oauth/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('OAuth init error from backend:', error);
      return NextResponse.json({ error: 'Failed to initialize OAuth' }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('OAuth init successful, data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('OAuth init error:', error);
    return NextResponse.json({ error: 'Failed to initialize OAuth' }, { status: 500 });
  }
}
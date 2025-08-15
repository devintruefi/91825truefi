import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Handle error from OAuth provider
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=oauth_failed`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=no_code`);
  }
  
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    // Use the correct backend endpoint that matches our implementation
    const response = await fetch(`${backendUrl}/api/auth/callback/${provider}?code=${code}&state=${state || ''}`);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OAuth callback error:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=callback_failed`);
    }
    
    const userData = await response.json();
    
    // Create response with redirect
    const redirectUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const res = NextResponse.redirect(redirectUrl);
    
    // Set cookies with user data (you might want to handle this differently)
    res.cookies.set('auth_token', userData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Store user data in a way that client can access
    res.cookies.set('user_data', JSON.stringify({
      id: userData.user_id,
      email: userData.email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      provider: provider
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return res;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=server_error`);
  }
}

// Handle POST for Apple Sign In (uses form_post)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  if (provider !== 'apple') {
    return NextResponse.json({ error: 'Invalid provider for POST' }, { status: 400 });
  }
  
  const formData = await req.formData();
  const code = formData.get('code') as string;
  const state = formData.get('state') as string;
  const error = formData.get('error') as string;
  
  // Handle error from Apple
  if (error) {
    console.error('Apple Sign In error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=apple_signin_failed`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=no_code`);
  }
  
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/auth/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'apple',
        code,
        state
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Apple callback error:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=apple_callback_failed`);
    }
    
    const userData = await response.json();
    
    // Create response with redirect
    const redirectUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const res = NextResponse.redirect(redirectUrl);
    
    // Set cookies with user data
    res.cookies.set('auth_token', userData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    res.cookies.set('user_data', JSON.stringify({
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      provider: 'apple'
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return res;
  } catch (error) {
    console.error('Apple callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?error=server_error`);
  }
}
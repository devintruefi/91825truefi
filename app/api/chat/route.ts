// app/api/chat/route.ts
// This is a proxy layer that forwards chat requests to the FastAPI backend
// Handles both authenticated (logged-in) and non-authenticated (sample/demo) users
import { NextRequest, NextResponse } from 'next/server';

// Configure this route for long-running GPT-5 requests
export const maxDuration = 300; // 5 minutes for Vercel Functions (max allowed on Pro plan)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get authorization header to determine if user is authenticated
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    // Prepare the request to FastAPI backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // Determine which endpoint to use based on authentication
    const endpoint = authHeader ? '/chat' : '/chat/public';
    
    // Prepare headers - only include auth header if it exists
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Forward the request to FastAPI backend with timeout
    const controller = new AbortController();
    // Allow long-running financial modeling to complete (default 7 minutes).
    // Override via FRONTEND_CHAT_TIMEOUT_MS env var if needed.
    const timeoutMs = Number(process.env.FRONTEND_CHAT_TIMEOUT_MS || 720000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          conversation_history: [] // Can be extended if needed
        }),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timeout);
      console.error('Backend fetch error or timeout:', e?.name || e);
      // On timeout/connection error, return a graceful fallback (200) so UI does not crash
      const isAuthenticated = !!authHeader;
      const fallback = {
        content: isAuthenticated
          ? "I'm still working on your financial model. This can take a bit longer than usual. Please try again in a moment."
          : "Hi Sample User! 👋 I'm Penny, your AI financial advisor. How can I help today?",
        sessionId: sessionId || `session_${Date.now()}`,
      };
      return NextResponse.json(fallback, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }

    // Handle response from FastAPI
    let data: any = {};
    
    // Try to parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        // If JSON parsing fails but response is ok, use fallback
        if (response.ok) {
          const fallbackMessage = authHeader 
            ? "I'm processing your request. Please try again."
            : "Hi Sample User! 👋 I'm Penny, your personalized financial advisor. I'm here to help you explore what TrueFi can do for you. What would you like to know about managing your finances?";
          
          return NextResponse.json({
            content: fallbackMessage,
            sessionId: sessionId || `session_${Date.now()}`
          });
        }
      }
    } else {
      // If not JSON, try to get text
      const text = await response.text();
      console.log('Non-JSON response received:', text);
      data = { message: text };
    }

    if (!response.ok) {
      console.error('Backend error:', response.status, data);
      const friendly = authHeader
        ? "I'm still working on your financial model. This can take a bit longer than usual. Please try again in a moment."
        : "Hi Sample User! 👋 I'm Penny, your AI financial advisor. I'm here to help you explore TrueFi's features. You can ask me about budgeting, saving, investments, or any financial topic. What would you like to know?";
      return NextResponse.json({
        content: friendly,
        sessionId: sessionId || `session_${Date.now()}`
      }, { status: 200 });
    }

    // FastAPI returns: { message: string, session_id: string, metadata?: any, ... }
    // Transform to match frontend expectations
    return NextResponse.json({
      content: data.message || data.response || "Hi Sample User! 👋 I'm Penny, your personalized financial advisor. I'm here to help you make smart financial decisions and achieve your goals. What would you like to discuss today? 💰✨",
      sessionId: data.session_id || sessionId || `session_${Date.now()}`,
      metadata: data.metadata || data.rich_content || null
    });

  } catch (error: any) {
    console.error('Chat API proxy error:', error);
    
    // If backend is unavailable, provide a fallback message
    // This ensures the demo still works even if backend is down
    const isAuthenticated = request.headers.get('authorization') ? true : false;
    const fallbackMessage = isAuthenticated 
      ? "I'm having trouble connecting to the server. Please try again in a moment."
      : "Hi Sample User! 👋 I'm Penny, your personalized financial advisor. I'm here to help you explore what TrueFi can do for you. What would you like to know about managing your finances?";
    // Safely derive session id from parsed body if available
    let currentSessionId: string | undefined;
    try {
      const maybeBody = await request.clone().json().catch(() => null);
      currentSessionId = maybeBody?.sessionId;
    } catch (_) {
      currentSessionId = undefined;
    }
    
    return NextResponse.json({ 
      content: fallbackMessage,
      sessionId: currentSessionId || `session_${Date.now()}`
    }, { status: 200 });
  }
}

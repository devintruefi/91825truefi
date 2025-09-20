import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;

  try {
    const token = req.headers.get('authorization');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    // First try to proxy to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // If backend doesn't support DELETE or returns 404/405/501, fall back to Prisma
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      const user = await getUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Delete from database directly - use deleteMany for safety
      const deleteResult = await prisma.goals.deleteMany({
        where: {
          id: goalId,
          user_id: user.id
        }
      });

      if (deleteResult.count === 0) {
        return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Goal deleted successfully' });
    }

    // For other error statuses, return the backend error
    const error = await response.text();
    console.error('Backend goal delete error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: response.status });

  } catch (error) {
    console.error('Goal delete error:', error);
    return NextResponse.json({
      error: 'Failed to delete goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
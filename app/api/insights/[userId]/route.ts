import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    
    // Don't return real insights for demo user
    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ insights: [] })
    }
    
    // Verify the user exists and is not demo
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Fetch unread financial insights
    const insights = await prisma.financial_insights.findMany({
      where: {
        user_id: userId,
        is_read: false,
        OR: [
          { expires_at: null },
          { expires_at: { gte: new Date() } }
        ]
      },
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ],
      take: 10,
      select: {
        id: true,
        insight_type: true,
        title: true,
        description: true,
        severity: true,
        data: true,
        is_read: true,
        created_at: true,
        expires_at: true
      }
    })
    
    // Format insights for frontend
    const formattedInsights = insights.map(insight => ({
      id: insight.id,
      type: insight.insight_type,
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
      data: insight.data || {},
      isRead: insight.is_read,
      createdAt: insight.created_at,
      expiresAt: insight.expires_at
    }))
    
    return NextResponse.json({ 
      insights: formattedInsights,
      count: formattedInsights.length 
    })
    
  } catch (error) {
    console.error('Error fetching financial insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial insights' },
      { status: 500 }
    )
  }
}

// Mark insight as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await request.json()
    const { insightId } = body
    
    // Don't process for demo user
    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ success: false })
    }
    
    if (!insightId) {
      return NextResponse.json({ error: 'Insight ID required' }, { status: 400 })
    }
    
    // Verify the insight belongs to the user
    const insight = await prisma.financial_insights.findFirst({
      where: {
        id: insightId,
        user_id: userId
      }
    })
    
    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
    }
    
    // Mark as read
    const updatedInsight = await prisma.financial_insights.update({
      where: { id: insightId },
      data: { is_read: true }
    })
    
    return NextResponse.json({ 
      success: true,
      insight: {
        id: updatedInsight.id,
        isRead: updatedInsight.is_read
      }
    })
    
  } catch (error) {
    console.error('Error marking insight as read:', error)
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 }
    )
  }
}
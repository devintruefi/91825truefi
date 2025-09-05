import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    
    // Don't return real notifications for demo user
    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ notifications: [] })
    }
    
    // Verify the user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Fetch notifications (using financial_insights with specific types)
    const notifications = await prisma.financial_insights.findMany({
      where: {
        user_id: userId,
        insight_type: {
          in: ['notification', 'alert', 'reminder', 'update']
        },
        is_read: false,
        OR: [
          { expires_at: null },
          { expires_at: { gte: new Date() } }
        ]
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 20,
      select: {
        id: true,
        insight_type: true,
        title: true,
        description: true,
        severity: true,
        data: true,
        is_read: true,
        created_at: true
      }
    })
    
    // Format notifications for frontend
    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      type: notif.insight_type,
      title: notif.title,
      message: notif.description,
      severity: notif.severity,
      data: notif.data || {},
      isRead: notif.is_read,
      createdAt: notif.created_at
    }))
    
    return NextResponse.json({ 
      notifications: formattedNotifications,
      unreadCount: formattedNotifications.length
    })
    
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await request.json()
    const { notificationId, markAllAsRead } = body
    
    // Don't process for demo user
    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ success: false })
    }
    
    if (markAllAsRead) {
      // Mark all notifications as read for this user
      await prisma.financial_insights.updateMany({
        where: {
          user_id: userId,
          insight_type: {
            in: ['notification', 'alert', 'reminder', 'update']
          },
          is_read: false
        },
        data: { is_read: true }
      })
      
      return NextResponse.json({ success: true, markedAll: true })
    }
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }
    
    // Verify the notification belongs to the user
    const notification = await prisma.financial_insights.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
        insight_type: {
          in: ['notification', 'alert', 'reminder', 'update']
        }
      }
    })
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    
    // Mark as read
    const updated = await prisma.financial_insights.update({
      where: { id: notificationId },
      data: { is_read: true }
    })
    
    return NextResponse.json({ 
      success: true,
      notification: {
        id: updated.id,
        isRead: updated.is_read
      }
    })
    
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}
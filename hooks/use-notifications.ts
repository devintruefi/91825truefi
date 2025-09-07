import { useState, useEffect, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/api-helpers'

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  severity: 'high' | 'medium' | 'low' | 'info'
  data: any
  isRead: boolean
  createdAt: string
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchNotifications = useCallback(async () => {
    // Don't fetch for demo user or no user
    if (!userId || userId === DEMO_USER_ID) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await authenticatedFetch(`/api/notifications/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [userId])
  
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId || userId === DEMO_USER_ID) return
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    try {
      const response = await authenticatedFetch(`/api/notifications/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notificationId })
      })
      
      if (!response.ok) {
        // Revert optimistic update on error
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: false }
              : notif
          )
        )
        setUnreadCount(prev => prev + 1)
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
      // Revert optimistic update
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: false }
            : notif
        )
      )
      setUnreadCount(prev => prev + 1)
    }
  }, [userId])
  
  const markAllAsRead = useCallback(async () => {
    if (!userId || userId === DEMO_USER_ID) return
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    )
    setUnreadCount(0)
    
    try {
      const response = await authenticatedFetch(`/api/notifications/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ markAllAsRead: true })
      })
      
      if (!response.ok) {
        // Revert on error - refetch to get actual state
        fetchNotifications()
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      // Refetch to get actual state
      fetchNotifications()
    }
  }, [userId, fetchNotifications])
  
  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])
  
  // Auto-refresh every 2 minutes for real users
  useEffect(() => {
    if (!userId || userId === DEMO_USER_ID) return
    
    const interval = setInterval(() => {
      fetchNotifications()
    }, 2 * 60 * 1000) // 2 minutes
    
    return () => clearInterval(interval)
  }, [userId, fetchNotifications])
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  }
}
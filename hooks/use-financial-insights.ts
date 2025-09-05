import { useState, useEffect, useCallback } from 'react'

const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export interface FinancialInsight {
  id: string
  type: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low' | 'info'
  data: any
  isRead: boolean
  createdAt: string
  expiresAt?: string | null
}

export function useFinancialInsights(userId: string | null) {
  const [insights, setInsights] = useState<FinancialInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchInsights = useCallback(async () => {
    // Don't fetch for demo user or no user
    if (!userId || userId === DEMO_USER_ID) {
      setInsights([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/insights/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      
      const data = await response.json()
      setInsights(data.insights || [])
    } catch (err) {
      console.error('Error fetching financial insights:', err)
      setError('Failed to load financial insights')
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [userId])
  
  const markAsRead = useCallback(async (insightId: string) => {
    if (!userId || userId === DEMO_USER_ID) return
    
    // Optimistic update
    setInsights(prev => 
      prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, isRead: true }
          : insight
      )
    )
    
    try {
      const response = await fetch(`/api/insights/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ insightId })
      })
      
      if (!response.ok) {
        // Revert optimistic update on error
        setInsights(prev => 
          prev.map(insight => 
            insight.id === insightId 
              ? { ...insight, isRead: false }
              : insight
          )
        )
      }
    } catch (err) {
      console.error('Error marking insight as read:', err)
      // Revert optimistic update
      setInsights(prev => 
        prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, isRead: false }
            : insight
        )
      )
    }
  }, [userId])
  
  // Initial fetch
  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])
  
  // Auto-refresh every 5 minutes for real users
  useEffect(() => {
    if (!userId || userId === DEMO_USER_ID) return
    
    const interval = setInterval(() => {
      fetchInsights()
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [userId, fetchInsights])
  
  return {
    insights,
    loading,
    error,
    markAsRead,
    refetch: fetchInsights
  }
}
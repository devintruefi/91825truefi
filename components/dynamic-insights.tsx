'use client'

import { AlertTriangle, CheckCircle, TrendingUp, Info, X } from 'lucide-react'
import { useFinancialInsights } from '@/hooks/use-financial-insights'
import { Skeleton } from '@/components/ui/skeleton'

interface DynamicInsightsProps {
  userId: string
}

export function DynamicInsights({ userId }: DynamicInsightsProps) {
  const { insights, loading, error, markAsRead } = useFinancialInsights(userId)
  
  if (loading) {
    return <InsightsSkeletonLoader />
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">
          Unable to load insights. Please try again later.
        </p>
      </div>
    )
  }
  
  if (!insights || insights.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No new insights available. Check back later for personalized financial recommendations.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard 
          key={insight.id}
          insight={insight}
          onMarkAsRead={() => markAsRead(insight.id)}
        />
      ))}
    </div>
  )
}

interface InsightCardProps {
  insight: any
  onMarkAsRead: () => void
}

function InsightCard({ insight, onMarkAsRead }: InsightCardProps) {
  const getIcon = () => {
    switch (insight.severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'medium':
        return <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    }
  }
  
  const getBackgroundColor = () => {
    switch (insight.severity) {
      case 'high':
        return 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
      case 'medium':
        return 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
      default:
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800'
    }
  }
  
  const getSeverityLabel = () => {
    switch (insight.severity) {
      case 'high':
        return '🔴 Critical'
      case 'medium':
        return '🟡 Important'
      case 'low':
        return '🟢 Suggestion'
      default:
        return '🔵 Info'
    }
  }
  
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${getBackgroundColor()} transition-all hover:shadow-md`}>
      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">
              {insight.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {insight.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-700 dark:text-gray-300">
                {getSeverityLabel()}
              </span>
              {insight.type && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {insight.type.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          {!insight.isRead && (
            <button
              onClick={onMarkAsRead}
              className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full transition-colors"
              title="Mark as read"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InsightsSkeletonLoader() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
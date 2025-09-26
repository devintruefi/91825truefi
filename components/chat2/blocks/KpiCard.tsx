'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { type KpiCard as KpiCardType } from '@/lib/types'

interface KpiCardProps {
  block: KpiCardType
}

export function KpiCard({ block }: KpiCardProps) {
  const { value, formatted_value, subtitle, change, change_type } = block.data

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{block.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-right tabular-nums">
          {formatted_value || value.toLocaleString()}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            change_type === 'positive' ? 'text-green-600' :
            change_type === 'negative' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {change_type === 'positive' ? <TrendingUp className="w-4 h-4" /> :
             change_type === 'negative' ? <TrendingDown className="w-4 h-4" /> : null}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
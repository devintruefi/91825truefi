'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { type BarChart as BarChartType } from '@/lib/types'

interface BarChartBlockProps {
  block: BarChartType
}

export function BarChartBlock({ block }: BarChartBlockProps) {
  const { labels, datasets, colors = ['#0070f3', '#10b981', '#f59e0b', '#ef4444'] } = block.data

  // Transform data for recharts
  const chartData = labels.map((label, i) => {
    const dataPoint: any = { name: label }
    datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[i] || 0
    })
    return dataPoint
  })

  return (
    <div className="my-4">
      <h4 className="text-base font-semibold mb-2">{block.title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          {datasets.map((dataset, i) => (
            <Bar
              key={dataset.label}
              dataKey={dataset.label}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
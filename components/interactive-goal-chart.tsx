"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface GoalChartProps {
  data: Array<{
    month: string
    current: number
    projected: number
  }>
  title: string
  target: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  coordinate?: { x: number; y: number }
}

function CustomTooltip({ active, payload, coordinate }: CustomTooltipProps) {
  if (active && payload && payload.length && coordinate) {
    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none z-50"
        style={{
          position: "absolute",
          left: coordinate.x + 10,
          top: coordinate.y - 10,
          transform: "translate(0, -100%)",
        }}
      >
        <p className="font-medium text-gray-900 dark:text-gray-100">${payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export function InteractiveGoalChart({ data, title, target, color }: GoalChartProps) {
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; value: number } | null>(null)
  const [isClient, setIsClient] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  // Ensure hydration safety
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleMouseMove = useCallback((event: any) => {
    if (event && event.activePayload && event.activePayload.length > 0) {
      const { chartX, chartY } = event
      const value = event.activePayload[0].value
      setTooltipData({ x: chartX, y: chartY, value })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null)
  }, [])

  const chartConfig = {
    current: {
      label: "Current Savings",
      color: color,
    },
    projected: {
      label: "Projected Savings",
      color: `${color}80`,
    },
  }

  // Show loading state during hydration to prevent mismatch
  if (!isClient) {
    return (
      <div className="relative h-[200px] w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading chart...</div>
      </div>
    )
  }

  return (
    <div className="relative" ref={chartRef}>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              axisLine={false}
              tickLine={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={color}
              strokeWidth={3}
              dot={false}
              activeDot={false}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke={`${color}80`}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Custom tooltip */}
      {tooltipData && (
        <div
          className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none z-50 transition-all duration-150"
          style={{
            left: tooltipData.x + 10,
            top: tooltipData.y - 10,
            transform: "translate(0, -100%)",
          }}
        >
          <p className="font-medium text-gray-900 dark:text-gray-100">${tooltipData.value.toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}

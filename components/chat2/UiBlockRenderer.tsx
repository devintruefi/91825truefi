'use client'

import React from 'react'
import { type UiBlock } from '@/lib/types'
import { KpiCard } from './blocks/KpiCard'
import { DataTable } from './blocks/DataTable'
import { BarChartBlock } from './blocks/BarChartBlock'
import { AlertBlock } from './blocks/AlertBlock'

interface UiBlockRendererProps {
  blocks?: UiBlock[]
}

export function UiBlockRenderer({ blocks }: UiBlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 mt-6">
      {blocks.map((block, index) => {
        // Use a composite key for stability
        const key = `${block.type}-${index}`

        switch (block.type) {
          case 'kpi_card':
            return <KpiCard key={key} block={block} />
          case 'table':
            return <DataTable key={key} block={block} />
          case 'bar_chart':
            return <BarChartBlock key={key} block={block} />
          case 'alert':
            return <AlertBlock key={key} block={block} />
          default:
            // Unknown block type - log but don't crash
            console.warn(`Unknown UI block type: ${(block as any).type}`)
            return null
        }
      })}
    </div>
  )
}
import { z } from 'zod'

// UI Block schemas
export const KpiCardSchema = z.object({
  type: z.literal('kpi_card'),
  title: z.string(),
  data: z.object({
    value: z.number(),
    formatted_value: z.string(),
    subtitle: z.string().optional(),
    change: z.number().optional(),
    change_type: z.enum(['positive', 'negative', 'neutral']).optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export const DataTableSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  data: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.any())),
    formatting: z.object({
      align: z.array(z.enum(['left', 'center', 'right'])).optional(),
      highlight_column: z.number().optional(),
    }).optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export const BarChartSchema = z.object({
  type: z.literal('bar_chart'),
  title: z.string(),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(z.object({
      label: z.string(),
      data: z.array(z.number()),
    })),
    colors: z.array(z.string()).optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export const AlertBlockSchema = z.object({
  type: z.literal('alert'),
  title: z.string(),
  data: z.object({
    severity: z.enum(['info', 'warning', 'error', 'success']),
    message: z.string(),
    details: z.string().optional(),
  }),
  metadata: z.record(z.any()).optional(),
})

export const UiBlockSchema = z.discriminatedUnion('type', [
  KpiCardSchema,
  DataTableSchema,
  BarChartSchema,
  AlertBlockSchema,
])

// Agent response schema
export const AgentResponseSchema = z.object({
  answer_markdown: z.string(),
  ui_blocks: z.array(UiBlockSchema).optional(),
  assumptions: z.array(z.string()).optional(),
  computations: z.array(z.any()).optional(),
  next_data_requests: z.array(z.any()).optional(),
  insights: z.record(z.any()).optional(),
})

// Message schema
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: AgentResponseSchema.optional(),
  timestamp: z.date().optional(),
})

// Export types
export type KpiCard = z.infer<typeof KpiCardSchema>
export type DataTable = z.infer<typeof DataTableSchema>
export type BarChart = z.infer<typeof BarChartSchema>
export type AlertBlock = z.infer<typeof AlertBlockSchema>
export type UiBlock = z.infer<typeof UiBlockSchema>
export type AgentResponse = z.infer<typeof AgentResponseSchema>
export type Message = z.infer<typeof MessageSchema>
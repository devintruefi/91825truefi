"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts"
import { InlineMath, BlockMath } from "react-katex"
import "katex/dist/katex.min.css"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Info, CheckCircle } from "lucide-react"
import UnifiedMarkdownRenderer from '@/components/unified-markdown-renderer'

interface PennyResponseRendererProps {
  content: string
  metadata?: {
    ui_blocks?: any[]
    computations?: any[]
    assumptions?: string[]
    future_value?: number
    total_contributions?: number
    total_growth?: number
    growth_percentage?: number
    yearly_projections?: any[]
    [key: string]: any  // Allow for other properties
  }
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const CHART_COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981']

function coerceToMarkdown(maybe: any): string {
  if (!maybe) return ''
  if (typeof maybe === 'string') {
    // A few backends sometimes send a JSON string
    if (maybe.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(maybe)
        if (parsed?.answer_markdown) return String(parsed.answer_markdown)
      } catch {}
    }
    return maybe
  }
  if (typeof maybe === 'object') {
    if (typeof maybe.answer_markdown === 'string') return maybe.answer_markdown
    if (typeof maybe.markdown === 'string') return maybe.markdown
    if (typeof maybe.message === 'string') return maybe.message
  }
  return ''
}

export function PennyResponseRenderer({ content, metadata }: PennyResponseRendererProps) {
  // Debug logging
  console.log('[PennyResponseRenderer] Raw content type:', typeof content)
  console.log('[PennyResponseRenderer] Raw content preview:', typeof content === 'string' ? content.substring(0, 100) : content)

  // Coerce to markdown string properly
  const safeContent = coerceToMarkdown(content)
  console.log('[PennyResponseRenderer] After coerce:', safeContent.substring(0, 100))

  const renderKPICard = (block: any) => {
    const { value, formatted_value, change, change_type, subtitle, icon } = block.data
    const isPositive = change_type === 'positive'
    const Icon = icon === 'wallet' ? Wallet : TrendingUp

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{block.title}</CardTitle>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatted_value || formatCurrency(value)}</div>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            {change && (
              <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                <span>{change}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderTable = (block: any) => {
    const { headers, rows, formatting } = block.data
    const metadata = block.metadata || {}

    // Auto-detect numeric columns
    const isNumericColumn = (colIndex: number) => {
      const numericHeaders = ['Total', 'Avg', 'Average', 'Amount', 'Transactions', 'Value', 'Gain/Loss', 'Progress', 'Count']
      const header = headers[colIndex]
      if (numericHeaders.some(h => header?.includes(h))) return true

      // Check first row for numeric patterns
      if (rows.length > 0) {
        const firstValue = rows[0][colIndex]
        return /^[\$\-\+]?[\d,]+\.?\d*%?$/.test(firstValue)
      }
      return false
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="my-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header: string, i: number) => (
                      <TableHead
                        key={i}
                        className={`${formatting?.align?.[i] === 'right' || isNumericColumn(i) ? 'text-right' : ''} ${isNumericColumn(i) ? 'tabular-nums' : ''}`}
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: string[], rowIdx: number) => (
                    <TableRow key={rowIdx}>
                      {row.map((cell: string, cellIdx: number) => (
                        <TableCell
                          key={cellIdx}
                          className={`${formatting?.align?.[cellIdx] === 'right' || isNumericColumn(cellIdx) ? 'text-right tabular-nums' : ''}
                                     ${formatting?.highlight_column === cellIdx ? 'font-semibold' : ''}`}
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {metadata.total_row && (
                    <TableRow className="font-bold border-t-2">
                      {metadata.total_row.map((cell: string, idx: number) => (
                        <TableCell
                          key={idx}
                          className={formatting?.align?.[idx] === 'right' ? 'text-right' : ''}
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderLineChart = (block: any) => {
    const { labels, datasets, average_line } = block.data
    const metadata = block.metadata || {}

    // Guard against malformed data
    if (!labels || !Array.isArray(labels) || !datasets || !Array.isArray(datasets) || datasets.length === 0) {
      return (
        <Alert className="my-4">
          <AlertTitle>Chart unavailable</AlertTitle>
          <AlertDescription>
            This chart could not be rendered due to missing or invalid data.
          </AlertDescription>
        </Alert>
      )
    }

    const chartData = labels.map((label: string, i: number) => {
      const point: any = { name: label }
      datasets.forEach((dataset: any) => {
        point[dataset.label] = dataset.data[i]
      })
      if (average_line) {
        point['Average'] = average_line
      }
      return point
    })

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  label={metadata.x_axis_label ? { value: metadata.x_axis_label, position: 'insideBottom', offset: -5 } : undefined}
                />
                <YAxis
                  label={metadata.y_axis_label ? { value: metadata.y_axis_label, angle: -90, position: 'insideLeft' } : undefined}
                />
                <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCurrency(value) : value} />
                <Legend />
                {datasets.map((dataset: any, i: number) => (
                  <Line
                    key={dataset.label}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={dataset.borderColor || CHART_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
                {average_line && (
                  <Line
                    type="monotone"
                    dataKey="Average"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderBarChart = (block: any) => {
    const { labels, datasets } = block.data
    const metadata = block.metadata || {}

    // Guard against malformed data
    if (!labels || !Array.isArray(labels) || !datasets || !Array.isArray(datasets) || datasets.length === 0) {
      return (
        <Alert className="my-4">
          <AlertTitle>Chart unavailable</AlertTitle>
          <AlertDescription>
            This chart could not be rendered due to missing or invalid data.
          </AlertDescription>
        </Alert>
      )
    }

    const chartData = labels.map((label: string, i: number) => {
      const point: any = { name: label }
      datasets.forEach((dataset: any) => {
        point[dataset.label] = dataset.data[i]
      })
      return point
    })

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCurrency(value) : value} />
                <Legend />
                {datasets.map((dataset: any, i: number) => (
                  <Bar
                    key={dataset.label}
                    dataKey={dataset.label}
                    fill={dataset.backgroundColor?.[i] || CHART_COLORS[i]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderPieChart = (block: any) => {
    const { labels, values, colors, percentages } = block.data
    const metadata = block.metadata || {}

    // Guard against malformed data
    if (!labels || !Array.isArray(labels) || !values || !Array.isArray(values) || labels.length !== values.length) {
      return (
        <Alert className="my-4">
          <AlertTitle>Chart unavailable</AlertTitle>
          <AlertDescription>
            This chart could not be rendered due to missing or invalid data.
          </AlertDescription>
        </Alert>
      )
    }

    const chartData = labels.map((label: string, i: number) => ({
      name: label,
      value: values[i],
      percentage: percentages?.[i]
    }))

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percentage }: { name: string; percentage?: number }) =>
                    metadata.show_percentages && percentage
                      ? `${name} (${formatPercent(percentage)})`
                      : name
                  }
                >
                  {chartData.map((entry: any, i: number) => (
                    <Cell key={`cell-${i}`} fill={colors?.[i] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                {metadata.show_legend && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderEquation = (block: any) => {
    const { latex, variables, result, steps } = block.data

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="my-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {latex && (
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <BlockMath math={latex} />
              </div>
            )}
            {variables && Object.keys(variables).length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Variables:</h4>
                <div className="space-y-1">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-mono">{key}</span> = {
                        typeof value === 'number' ? formatCurrency(value) : value as string
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
            {steps && steps.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Steps:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {steps.map((step: string, i: number) => (
                    <li key={i} className="text-sm">{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {result && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <div className="font-semibold text-lg">Result: {result}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderAlert = (block: any) => {
    const { severity, message, details, action } = block.data

    const severityConfig = {
      warning: { icon: AlertCircle, className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
      info: { icon: Info, className: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
      success: { icon: CheckCircle, className: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
      error: { icon: AlertCircle, className: 'border-red-500 bg-red-50 dark:bg-red-900/20' }
    }

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info
    const Icon = config.icon

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="my-4"
      >
        <Alert className={config.className}>
          <Icon className="h-4 w-4" />
          <AlertTitle>{block.title}</AlertTitle>
          <AlertDescription>
            <div>{message}</div>
            {details && <div className="mt-2 text-sm">{details}</div>}
            {action && (
              <div className="mt-3">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                  {action}
                </Badge>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </motion.div>
    )
  }

  const renderUIBlock = (block: any) => {
    switch (block.type) {
      case 'kpi_card':
        return renderKPICard(block)
      case 'table':
        return renderTable(block)
      case 'line_chart':
        return renderLineChart(block)
      case 'bar_chart':
        return renderBarChart(block)
      case 'pie_chart':
        return renderPieChart(block)
      case 'equation':
        return renderEquation(block)
      case 'alert':
        return renderAlert(block)
      case 'text':
        return (
          <Card className="my-4">
            <CardContent className="pt-6">
              <UnifiedMarkdownRenderer content={block.data.content || block.data} />
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Main content with markdown support */}
      {safeContent && <UnifiedMarkdownRenderer content={safeContent} />}

      {/* Render UI blocks if available */}
      {metadata?.ui_blocks && metadata.ui_blocks.length > 0 && (
        <div className="space-y-4 mt-6">
          {metadata.ui_blocks.map((block, i) => (
            <div key={i}>
              {renderUIBlock(block)}
            </div>
          ))}
        </div>
      )}

      {/* Render computations if available */}
      {metadata?.computations && metadata.computations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Calculations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metadata.computations.map((comp: any, i: number) => {
                const renderResult = () => {
                  if (typeof comp.result === 'object' && comp.result !== null) {
                    // Special handling for complex results
                    if (comp.result.yearly_projections) {
                      // This is a portfolio projection
                      return (
                        <div className="mt-2 space-y-1">
                          <div>Future Value: {formatCurrency(comp.result.future_value || 0)}</div>
                          <div>Total Growth: {formatCurrency(comp.result.total_growth || 0)}</div>
                          <div>Growth %: {formatPercent(comp.result.growth_percentage || 0)}</div>
                        </div>
                      )
                    } else if (comp.result.current_savings !== undefined) {
                      // This is a savings capacity analysis
                      return (
                        <div className="mt-2 space-y-1">
                          <div>Current Savings: {formatCurrency(comp.result.current_savings || 0)}</div>
                          <div>Savings Rate: {formatPercent(comp.result.current_rate || 0)}</div>
                          {comp.result.recommendation && (
                            <div className="text-xs italic">{comp.result.recommendation}</div>
                          )}
                        </div>
                      )
                    } else {
                      // Generic object display
                      return (
                        <pre className="text-xs mt-1 bg-muted/50 p-2 rounded overflow-auto">
                          {JSON.stringify(comp.result, null, 2)}
                        </pre>
                      )
                    }
                  } else if (typeof comp.result === 'number') {
                    return <span className="font-semibold">{formatCurrency(comp.result)}</span>
                  } else {
                    return <span className="font-semibold">{String(comp.result)}</span>
                  }
                }

                return (
                  <div key={i} className="border-l-2 border-primary/50 pl-4">
                    <div className="font-semibold text-sm">{comp.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{comp.formula}</div>
                    <div className="text-sm mt-1">
                      {renderResult()}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render assumptions if available */}
      {metadata?.assumptions && metadata.assumptions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {metadata.assumptions.map((assumption: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground">{assumption}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Render investment projection data if available */}
      {(metadata?.future_value || metadata?.total_contributions || metadata?.total_growth) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Investment Projection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {metadata.future_value && (
                <div>
                  <div className="text-sm text-muted-foreground">Future Value</div>
                  <div className="text-lg font-semibold">{formatCurrency(metadata.future_value)}</div>
                </div>
              )}
              {metadata.total_contributions && (
                <div>
                  <div className="text-sm text-muted-foreground">Total Contributions</div>
                  <div className="text-lg font-semibold">{formatCurrency(metadata.total_contributions)}</div>
                </div>
              )}
              {metadata.total_growth && (
                <div>
                  <div className="text-sm text-muted-foreground">Total Growth</div>
                  <div className="text-lg font-semibold">{formatCurrency(metadata.total_growth)}</div>
                </div>
              )}
              {metadata.growth_percentage && (
                <div>
                  <div className="text-sm text-muted-foreground">Growth Percentage</div>
                  <div className="text-lg font-semibold">{formatPercent(metadata.growth_percentage)}</div>
                </div>
              )}
            </div>

            {/* Render yearly projections if available */}
            {metadata.yearly_projections && metadata.yearly_projections.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Yearly Projections</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Contributions</TableHead>
                        <TableHead className="text-right">Growth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metadata.yearly_projections.slice(0, 10).map((proj: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{proj.year || i + 1}</TableCell>
                          <TableCell className="text-right">{formatCurrency(proj.balance || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(proj.contributions || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(proj.growth || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

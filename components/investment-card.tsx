"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, StarOff, Edit2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Investment {
  id: string
  name: string
  symbol?: string
  type: "stock" | "bond" | "etf" | "mutual_fund" | "crypto" | "commodity" | "real_estate" | "cash" | "other"
  quantity: number
  purchase_price: number
  current_price: number
  purchase_date: string
  account_id?: string
  notes?: string
  tags?: string[]
  dividends?: number
  expense_ratio?: number
  target_allocation?: number
  risk_level?: "low" | "medium" | "high" | "very_high"
  is_favorite?: boolean
}

interface InvestmentCardProps {
  investment: Investment
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function InvestmentCard({ investment, onEdit, onDelete, onToggleFavorite }: InvestmentCardProps) {
  const value = investment.quantity * investment.current_price
  const gainLoss = (investment.current_price - investment.purchase_price) * investment.quantity
  const gainLossPercent = ((investment.current_price - investment.purchase_price) / investment.purchase_price) * 100

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleFavorite}
            >
              {investment.is_favorite ? 
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : 
                <StarOff className="h-4 w-4" />
              }
            </Button>
            <div>
              <h4 className="font-semibold text-sm">{investment.name}</h4>
              {investment.symbol && (
                <p className="text-xs text-gray-500">{investment.symbol}</p>
              )}
            </div>
          </div>
          <Badge variant={gainLoss >= 0 ? "default" : "destructive"} className="text-xs">
            {investment.type}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Value</span>
            <span className="font-semibold">{formatCurrency(value)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Gain/Loss</span>
            <span className={cn(
              "text-sm font-medium",
              gainLoss >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{investment.quantity} shares</span>
            <span className="text-xs text-gray-500">@ {formatCurrency(investment.current_price)}</span>
          </div>
        </div>

        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onEdit}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs text-red-600 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

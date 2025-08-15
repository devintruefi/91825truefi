"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"

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

interface InvestmentFormProps {
  investment?: Investment | null
  onSave: (investment: Partial<Investment>) => Promise<void>
  onCancel: () => void
}

export function InvestmentForm({ investment, onSave, onCancel }: InvestmentFormProps) {
  const [formData, setFormData] = useState<Partial<Investment>>({
    type: "stock",
    quantity: 0,
    purchase_price: 0,
    current_price: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    risk_level: "medium"
  })

  useEffect(() => {
    if (investment) {
      setFormData(investment)
    }
  }, [investment])

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.purchase_price || !formData.current_price) {
      return
    }
    await onSave({
      ...formData,
      quantity: formData.quantity === '' ? 0 : formData.quantity,
      purchase_price: formData.purchase_price === '' ? 0 : formData.purchase_price,
      current_price: formData.current_price === '' ? 0 : formData.current_price
    })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Investment Name</Label>
          <Input
            value={formData.name || ""}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Apple Inc."
          />
        </div>
        
        <div className="space-y-2">
          <Label>Symbol (Optional)</Label>
          <Input
            value={formData.symbol || ""}
            onChange={(e) => setFormData({...formData, symbol: e.target.value})}
            placeholder="e.g., AAPL"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Type</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => setFormData({...formData, type: value as Investment["type"]})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="bond">Bond</SelectItem>
              <SelectItem value="etf">ETF</SelectItem>
              <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
              <SelectItem value="crypto">Cryptocurrency</SelectItem>
              <SelectItem value="real_estate">Real Estate</SelectItem>
              <SelectItem value="commodity">Commodity</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Risk Level</Label>
          <Select 
            value={formData.risk_level || "medium"} 
            onValueChange={(value) => setFormData({...formData, risk_level: value as Investment["risk_level"]})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            value={formData.quantity || ""}
            onChange={(e) => setFormData({...formData, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Purchase Price</Label>
          <Input
            type="number"
            value={formData.purchase_price || ""}
            onChange={(e) => setFormData({...formData, purchase_price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Current Price</Label>
          <Input
            type="number"
            value={formData.current_price || ""}
            onChange={(e) => setFormData({...formData, current_price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Purchase Date</Label>
          <Input
            type="date"
            value={formData.purchase_date || ""}
            onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
          />
        </div>
        
        <div className="col-span-2 space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Add any notes about this investment..."
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.name || !formData.quantity || !formData.purchase_price || !formData.current_price}
        >
          {investment ? "Update" : "Add"} Investment
        </Button>
      </DialogFooter>
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { SecurityPicker } from "./security-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Info } from "lucide-react"

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
  const [selectedSecurity, setSelectedSecurity] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (investment) {
      setFormData(investment)
      // If editing, set the security picker value
      if (investment.symbol) {
        setSelectedSecurity({
          symbol: investment.symbol,
          name: investment.name,
          type: investment.type,
          current_price: investment.current_price
        })
      }
    }
  }, [investment])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Investment name is required"
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0"
    }

    if (!formData.purchase_price || formData.purchase_price <= 0) {
      newErrors.purchase_price = "Purchase price must be greater than 0"
    }

    if (!formData.current_price || formData.current_price <= 0) {
      newErrors.current_price = "Current price must be greater than 0"
    }

    const purchaseDate = new Date(formData.purchase_date || '')
    if (purchaseDate > new Date()) {
      newErrors.purchase_date = "Purchase date cannot be in the future"
    }

    // Validate symbol requirement for certain types
    if (['stock', 'etf', 'mutual_fund', 'bond'].includes(formData.type || '') && !formData.symbol) {
      newErrors.symbol = "Symbol is required for this security type"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Ensure all numeric fields are properly converted
      const submissionData = {
        ...formData,
        quantity: typeof formData.quantity === 'string' ? parseFloat(formData.quantity) || 0 : formData.quantity || 0,
        purchase_price: typeof formData.purchase_price === 'string' ? parseFloat(formData.purchase_price) || 0 : formData.purchase_price || 0,
        current_price: typeof formData.current_price === 'string' ? parseFloat(formData.current_price) || 0 : formData.current_price || 0
      }
      
      console.log('Submitting investment data:', submissionData)
      await onSave(submissionData)
    } catch (error) {
      console.error('Failed to save investment:', error)
      alert('Failed to save investment. Please check the console for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSecuritySelect = (security: any) => {
    setSelectedSecurity(security)
    if (security) {
      setFormData({
        ...formData,
        name: security.name,
        symbol: security.symbol,
        type: security.type,
        current_price: security.current_price,
        risk_level: getRiskLevelFromType(security.type)
      })
      // Clear name and symbol errors when security is selected
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.name
        delete newErrors.symbol
        return newErrors
      })
    } else {
      setFormData({
        ...formData,
        name: '',
        symbol: '',
        current_price: 0
      })
    }
  }

  const getRiskLevelFromType = (type: string): "low" | "medium" | "high" | "very_high" => {
    const riskMap: Record<string, "low" | "medium" | "high" | "very_high"> = {
      "stock": "high",
      "bond": "low",
      "etf": "medium",
      "mutual_fund": "medium",
      "commodity": "high",
      "crypto": "very_high",
      "real_estate": "medium",
      "cash": "low",
      "other": "medium"
    }
    return riskMap[type?.toLowerCase() || ""] || "medium"
  }

  return (
    <>
      <div className="space-y-6">
        {/* Security Picker Section */}
        <div className="col-span-2">
          <SecurityPicker
            value={selectedSecurity}
            onSelect={handleSecuritySelect}
            placeholder="Search for stocks, ETFs, bonds, or crypto..."
          />
          {errors.symbol && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.symbol}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Manual Entry Section */}
        {!selectedSecurity && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Investment Name <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value})
                  if (errors.name && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, name: '' }))
                  }
                }}
                placeholder="e.g., Private Equity Fund"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Symbol (Optional)</Label>
              <Input
                value={formData.symbol || ""}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                placeholder="e.g., AAPL (if applicable)"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => {
                const newType = value as Investment["type"]
                setFormData({
                  ...formData, 
                  type: newType,
                  risk_level: getRiskLevelFromType(newType)
                })
              }}
              disabled={!!selectedSecurity}
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
            {selectedSecurity && (
              <p className="text-xs text-gray-500">
                <Info className="h-3 w-3 inline mr-1" />
                Auto-filled from selected security
              </p>
            )}
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
            {selectedSecurity && (
              <p className="text-xs text-gray-500">
                <Info className="h-3 w-3 inline mr-1" />
                Auto-assigned based on security type
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              value={formData.quantity || ""}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                setFormData({...formData, quantity: value})
                if (errors.quantity && value > 0) {
                  setErrors(prev => ({ ...prev, quantity: '' }))
                }
              }}
              placeholder="0"
              step="0.000001"
              min="0"
              className={errors.quantity ? "border-red-500" : ""}
            />
            {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Purchase Price (per share) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              value={formData.purchase_price || ""}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                setFormData({...formData, purchase_price: value})
                if (errors.purchase_price && value > 0) {
                  setErrors(prev => ({ ...prev, purchase_price: '' }))
                }
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.purchase_price ? "border-red-500" : ""}
            />
            {errors.purchase_price && <p className="text-sm text-red-500">{errors.purchase_price}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Current Price <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              value={formData.current_price || ""}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                setFormData({...formData, current_price: value})
                if (errors.current_price && value > 0) {
                  setErrors(prev => ({ ...prev, current_price: '' }))
                }
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.current_price ? "border-red-500" : ""}
              disabled={!!selectedSecurity}
            />
            {selectedSecurity && (
              <p className="text-xs text-gray-500">
                <Info className="h-3 w-3 inline mr-1" />
                Auto-filled with live price • as of {new Date().toLocaleString()}
              </p>
            )}
            {errors.current_price && <p className="text-sm text-red-500">{errors.current_price}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Purchase Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={formData.purchase_date || ""}
              onChange={(e) => {
                setFormData({...formData, purchase_date: e.target.value})
                if (errors.purchase_date && new Date(e.target.value) <= new Date()) {
                  setErrors(prev => ({ ...prev, purchase_date: '' }))
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className={errors.purchase_date ? "border-red-500" : ""}
            />
            {errors.purchase_date && <p className="text-sm text-red-500">{errors.purchase_date}</p>}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Add any notes about this investment..."
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter className="flex items-center gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Saving...
            </div>
          ) : (
            `${investment ? "Update" : "Add"} Investment`
          )}
        </Button>
      </DialogFooter>
    </>
  )
}
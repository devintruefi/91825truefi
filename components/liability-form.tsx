"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { Loader2 } from "lucide-react"

interface Liability {
  id?: string
  name: string
  liability_class?: string
  balance?: number
  interest_rate?: number
  notes?: string
}

interface LiabilityFormProps {
  liability?: Liability | null
  onSuccess: () => void
  onCancel: () => void
}

const LIABILITY_CLASSES = [
  "Credit Card",
  "Personal Loan",
  "Student Loan",
  "Auto Loan",
  "Mortgage",
  "Home Equity Loan",
  "Business Loan",
  "Medical Debt",
  "Tax Debt",
  "Other"
]

export function LiabilityForm({ liability, onSuccess, onCancel }: LiabilityFormProps) {
  const { user } = useUser()
  const [formData, setFormData] = useState<Liability>({
    name: "",
    liability_class: "",
    balance: 0,
    interest_rate: 0,
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (liability) {
      setFormData({
        name: liability.name || "",
        liability_class: liability.liability_class || "",
        balance: liability.balance || 0,
        interest_rate: liability.interest_rate || 0,
        notes: liability.notes || ""
      })
    }
  }, [liability])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setLoading(true)
    setError("")

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const url = liability?.id 
        ? `${baseUrl}/liabilities/${user.id}/${liability.id}`
        : `${baseUrl}/liabilities/${user.id}`
      
      const method = liability?.id ? "PUT" : "POST"
      const body = liability?.id ? { ...formData, id: liability.id } : formData

      console.log('Submitting liability:', { url, method, body, apiUrl: process.env.NEXT_PUBLIC_API_URL })

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (response.ok) {
        const responseData = await response.json()
        console.log('Success response:', responseData)
        onSuccess()
      } else {
        const responseText = await response.text()
        console.log('Error response text:', responseText)
        
        try {
          const errorData = JSON.parse(responseText)
          setError(errorData.error || "Failed to save liability")
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          setError(`Server error: ${response.status} - ${responseText.substring(0, 100)}`)
        }
      }
    } catch (err) {
      setError("An error occurred while saving the liability")
      console.error("Error saving liability:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Liability, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === "balance" || field === "interest_rate" ? parseFloat(value.toString()) || 0 : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Liability Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="e.g., Credit Card, Student Loan, Mortgage"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="liability_class">Liability Type</Label>
        <Select
          value={formData.liability_class}
          onValueChange={(value) => handleInputChange("liability_class", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select liability type" />
          </SelectTrigger>
          <SelectContent>
            {LIABILITY_CLASSES.map((className) => (
              <SelectItem key={className} value={className}>
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="balance">Current Balance</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          min="0"
          value={formData.balance}
          onChange={(e) => handleInputChange("balance", e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interest_rate">Interest Rate (%)</Label>
        <Input
          id="interest_rate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.interest_rate}
          onChange={(e) => handleInputChange("interest_rate", e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional details about this liability..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.name}
          className="bg-red-600 hover:bg-red-700"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {liability?.id ? "Update Liability" : "Add Liability"}
        </Button>
      </div>
    </form>
  )
} 
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/contexts/user-context"
import { Loader2 } from "lucide-react"

interface Asset {
  id?: string
  name: string
  asset_class?: string
  value?: number
  notes?: string
}

interface AssetFormProps {
  asset?: Asset | null
  onSuccess: () => void
  onCancel: () => void
}

const ASSET_CLASSES = [
  "Cash & Cash Equivalents",
  "Investment Accounts",
  "Real Estate",
  "Vehicles",
  "Business Ownership",
  "Collectibles",
  "Precious Metals",
  "Cryptocurrency",
  "Other"
]

export function AssetForm({ asset, onSuccess, onCancel }: AssetFormProps) {
  const { user } = useUser()
  const [formData, setFormData] = useState<Asset>({
    name: "",
    asset_class: "",
    value: 0,
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        asset_class: asset.asset_class || "",
        value: asset.value || 0,
        notes: asset.notes || ""
      })
    }
  }, [asset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setLoading(true)
    setError("")

    try {
      const baseUrl = '/api'
      const url = asset?.id 
        ? `${baseUrl}/assets/${user.id}/${asset.id}`
        : `${baseUrl}/assets/${user.id}`
      
      const method = asset?.id ? "PUT" : "POST"
      const body = asset?.id 
        ? { ...formData, id: asset.id, value: formData.value === '' ? 0 : formData.value }
        : { ...formData, value: formData.value === '' ? 0 : formData.value }

      console.log('Submitting asset:', { url, method, body })

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
          setError(errorData.error || "Failed to save asset")
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          setError(`Server error: ${response.status} - ${responseText.substring(0, 100)}`)
        }
      }
    } catch (err) {
      setError("An error occurred while saving the asset")
      console.error("Error saving asset:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Asset, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === "value" ? (value === '' ? '' : parseFloat(value.toString()) || 0) : value
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
        <Label htmlFor="name">Asset Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="e.g., Investment Portfolio, Car, House"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset_class">Asset Class</Label>
        <Select
          value={formData.asset_class}
          onValueChange={(value) => handleInputChange("asset_class", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select asset class" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_CLASSES.map((className) => (
              <SelectItem key={className} value={className}>
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">Estimated Value</Label>
        <Input
          id="value"
          type="number"
          step="0.01"
          min="0"
          value={formData.value}
          onChange={(e) => handleInputChange("value", e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Additional details about this asset..."
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {asset?.id ? "Update Asset" : "Add Asset"}
        </Button>
      </div>
    </form>
  )
} 
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, Plus, Building2, CreditCard, Home, Car, PiggyBank, TrendingUp, Briefcase, DollarSign, X, Check, Loader2 } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { apiClient } from "@/lib/api-client"

interface Asset {
  id: string
  name: string
  type?: string
  subtype?: string
  asset_class?: string
  balance?: number
  value?: number
  institution?: string
  source: "plaid" | "manual"
  description?: string
}

interface Liability {
  id: string
  name: string
  type?: string
  liability_class?: string
  balance: number
  interest_rate?: number
  minimum_payment?: number
  institution?: string
  source: "plaid" | "manual"
  description?: string
}

interface AssetsLiabilitiesData {
  assets: Asset[]
  liabilities: Liability[]
  total_assets: number
  total_liabilities: number
  net_worth: number
  has_plaid_connection: boolean
}

const assetIcons: Record<string, any> = {
  "Real Estate": Home,
  "Vehicle": Car,
  "Investment": TrendingUp,
  "Savings": PiggyBank,
  "Business": Briefcase,
  "Other": DollarSign,
  "checking": Building2,
  "savings": PiggyBank,
  "investment": TrendingUp,
  "brokerage": TrendingUp,
}

const liabilityIcons: Record<string, any> = {
  "Mortgage": Home,
  "Auto Loan": Car,
  "Credit Card": CreditCard,
  "Student Loan": Briefcase,
  "Personal Loan": DollarSign,
  "Other": DollarSign,
  "credit": CreditCard,
  "loan": DollarSign,
}

export function AssetsLiabilitiesTables() {
  const { user } = useUser()
  const [data, setData] = useState<AssetsLiabilitiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [isAddingAsset, setIsAddingAsset] = useState(false)
  const [isAddingLiability, setIsAddingLiability] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states
  const [assetForm, setAssetForm] = useState({
    name: "",
    asset_class: "Other",
    value: 0,
    description: ""
  })

  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    liability_class: "Other",
    balance: 0,
    interest_rate: 0,
    minimum_payment: 0,
    description: ""
  })

  useEffect(() => {
    if (user?.id) {
      fetchAssetsLiabilities()
    }
  }, [user])

  const fetchAssetsLiabilities = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets-liabilities/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setData(data)
      }
    } catch (error) {
      console.error("Error fetching assets/liabilities:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsset = async () => {
    if (!user?.id) return
    
    setSaving(true)
    try {
      const url = editingAsset 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/assets/${editingAsset.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/assets/${user.id}`
      
      const response = await fetch(url, {
        method: editingAsset ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assetForm,
          value: assetForm.value === '' ? 0 : assetForm.value
        })
      })

      if (response.ok) {
        await fetchAssetsLiabilities()
        setEditingAsset(null)
        setIsAddingAsset(false)
        setAssetForm({ name: "", asset_class: "Other", value: 0, description: "" })
      }
    } catch (error) {
      console.error("Error saving asset:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLiability = async () => {
    if (!user?.id) return
    
    setSaving(true)
    try {
      const url = editingLiability 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/liabilities/${editingLiability.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/liabilities/${user.id}`
      
      const response = await fetch(url, {
        method: editingLiability ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...liabilityForm,
          balance: liabilityForm.balance === '' ? 0 : liabilityForm.balance,
          interest_rate: liabilityForm.interest_rate === '' ? 0 : liabilityForm.interest_rate,
          minimum_payment: liabilityForm.minimum_payment === '' ? 0 : liabilityForm.minimum_payment
        })
      })

      if (response.ok) {
        await fetchAssetsLiabilities()
        setEditingLiability(null)
        setIsAddingLiability(false)
        setLiabilityForm({ name: "", liability_class: "Other", balance: 0, interest_rate: 0, minimum_payment: 0, description: "" })
      }
    } catch (error) {
      console.error("Error saving liability:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assets/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchAssetsLiabilities()
      }
    } catch (error) {
      console.error("Error deleting asset:", error)
    }
  }

  const handleDeleteLiability = async (id: string) => {
    if (!confirm("Are you sure you want to delete this liability?")) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/liabilities/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchAssetsLiabilities()
      }
    } catch (error) {
      console.error("Error deleting liability:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!data?.has_plaid_connection) {
    return (
      <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Accounts</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your bank accounts to automatically track your assets and liabilities
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-xl bg-gradient-to-br from-green-50/70 to-emerald-50/70 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(data?.total_assets || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-gradient-to-br from-red-50/70 to-orange-50/70 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {formatCurrency(data?.total_liabilities || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(data?.net_worth || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Assets</CardTitle>
          <Button
            onClick={() => {
              setIsAddingAsset(true)
              setAssetForm({ name: "", asset_class: "Other", value: 0, description: "" })
            }}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.assets.map((asset) => {
                const IconComponent = assetIcons[asset.asset_class || asset.type || "Other"] || DollarSign
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-gray-500" />
                        <span>{asset.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{asset.asset_class || asset.type || "Other"}</TableCell>
                    <TableCell className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(asset.value || asset.balance || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        asset.source === "plaid" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {asset.source === "plaid" ? "Connected" : "Manual"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.source === "manual" && (
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingAsset(asset)
                              setAssetForm({
                                name: asset.name,
                                asset_class: asset.asset_class || "Other",
                                value: asset.value || 0,
                                description: asset.description || ""
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Liabilities Table */}
      <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Liabilities</CardTitle>
          <Button
            onClick={() => {
              setIsAddingLiability(true)
              setLiabilityForm({ name: "", liability_class: "Other", balance: 0, interest_rate: 0, minimum_payment: 0, description: "" })
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Liability
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Min Payment</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.liabilities.map((liability) => {
                const IconComponent = liabilityIcons[liability.liability_class || liability.type || "Other"] || DollarSign
                return (
                  <TableRow key={liability.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-gray-500" />
                        <span>{liability.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{liability.liability_class || liability.type || "Other"}</TableCell>
                    <TableCell className="font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(liability.balance)}
                    </TableCell>
                    <TableCell>
                      {liability.interest_rate ? `${liability.interest_rate}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {liability.minimum_payment ? formatCurrency(liability.minimum_payment) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        liability.source === "plaid" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {liability.source === "plaid" ? "Connected" : "Manual"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {liability.source === "manual" && (
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingLiability(liability)
                              setLiabilityForm({
                                name: liability.name,
                                liability_class: liability.liability_class || "Other",
                                balance: liability.balance,
                                interest_rate: liability.interest_rate || 0,
                                minimum_payment: liability.minimum_payment || 0,
                                description: liability.description || ""
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLiability(liability.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asset Dialog */}
      <Dialog open={isAddingAsset || editingAsset !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAddingAsset(false)
          setEditingAsset(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="e.g., Primary Residence"
              />
            </div>
            <div>
              <Label htmlFor="asset-class">Type</Label>
              <Select
                value={assetForm.asset_class}
                onValueChange={(value) => setAssetForm({ ...assetForm, asset_class: value })}
              >
                <SelectTrigger id="asset-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asset-value">Value</Label>
              <Input
                id="asset-value"
                type="number"
                value={assetForm.value}
                onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="asset-description">Description (Optional)</Label>
              <Input
                id="asset-description"
                value={assetForm.description}
                onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingAsset(false)
                  setEditingAsset(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsset}
                disabled={saving || !assetForm.name}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Liability Dialog */}
      <Dialog open={isAddingLiability || editingLiability !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAddingLiability(false)
          setEditingLiability(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLiability ? "Edit Liability" : "Add New Liability"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="liability-name">Name</Label>
              <Input
                id="liability-name"
                value={liabilityForm.name}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
                placeholder="e.g., Home Mortgage"
              />
            </div>
            <div>
              <Label htmlFor="liability-class">Type</Label>
              <Select
                value={liabilityForm.liability_class}
                onValueChange={(value) => setLiabilityForm({ ...liabilityForm, liability_class: value })}
              >
                <SelectTrigger id="liability-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mortgage">Mortgage</SelectItem>
                  <SelectItem value="Auto Loan">Auto Loan</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Student Loan">Student Loan</SelectItem>
                  <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="liability-balance">Balance</Label>
              <Input
                id="liability-balance"
                type="number"
                value={liabilityForm.balance}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, balance: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="liability-rate">Interest Rate (%)</Label>
              <Input
                id="liability-rate"
                type="number"
                step="0.01"
                value={liabilityForm.interest_rate}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, interest_rate: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="liability-payment">Minimum Payment</Label>
              <Input
                id="liability-payment"
                type="number"
                value={liabilityForm.minimum_payment}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, minimum_payment: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="liability-description">Description (Optional)</Label>
              <Input
                id="liability-description"
                value={liabilityForm.description}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingLiability(false)
                  setEditingLiability(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLiability}
                disabled={saving || !liabilityForm.name}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
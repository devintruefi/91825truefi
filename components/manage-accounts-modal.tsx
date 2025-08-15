"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, CreditCard, PiggyBank, Wallet, TrendingUp, Edit2, Trash2, Eye, EyeOff, Link2, Unlink } from "lucide-react"
import { PlaidConnect } from "./plaid-connect"

interface Account {
  account_id: string
  name: string
  institution_name: string
  type: string
  subtype?: string
  current_balance: string
  available_balance: string
  currency_code: string
}

interface ManageAccountsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onRefresh: () => void
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case "depository":
      return Building2
    case "credit":
      return CreditCard
    case "investment":
      return TrendingUp
    case "loan":
      return Wallet
    default:
      return PiggyBank
  }
}

const getAccountColor = (type: string) => {
  switch (type) {
    case "depository":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30"
    case "credit":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30"
    case "investment":
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
    case "loan":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/30"
  }
}

export function ManageAccountsModal({ open, onOpenChange, accounts, onRefresh }: ManageAccountsModalProps) {
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set())
  const [editingAccount, setEditingAccount] = useState<string | null>(null)

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(num)
  }

  const toggleHideAccount = (accountId: string) => {
    const newHidden = new Set(hiddenAccounts)
    if (newHidden.has(accountId)) {
      newHidden.delete(accountId)
    } else {
      newHidden.add(accountId)
    }
    setHiddenAccounts(newHidden)
  }

  const handleUnlinkAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to unlink this account? This action cannot be undone.")) {
      return
    }
    
    // TODO: Call API to unlink account
    console.log("Unlinking account:", accountId)
    onRefresh()
  }

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((acc, account) => {
    const institution = account.institution_name
    if (!acc[institution]) {
      acc[institution] = []
    }
    acc[institution].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || "0"), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Manage Accounts</DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Balance: <span className="font-bold text-lg">{formatCurrency(totalBalance)}</span>
              </p>
            </div>
            <PlaidConnect onSuccess={onRefresh} />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {Object.entries(accountsByInstitution).map(([institution, institutionAccounts]) => (
            <div key={institution} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  {institution}
                </h3>
                <Badge variant="secondary">
                  {institutionAccounts.length} account{institutionAccounts.length > 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid gap-3">
                {institutionAccounts.map((account) => {
                  const Icon = getAccountIcon(account.type)
                  const colorClass = getAccountColor(account.type)
                  const isHidden = hiddenAccounts.has(account.account_id)
                  
                  return (
                    <Card 
                      key={account.account_id} 
                      className={`hover:shadow-lg transition-all duration-200 ${
                        isHidden ? "opacity-60" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-xl ${colorClass}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{account.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {account.type}
                                </Badge>
                                {account.subtype && (
                                  <Badge variant="outline" className="text-xs">
                                    {account.subtype}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {formatCurrency(account.current_balance)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Available: {formatCurrency(account.available_balance)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleHideAccount(account.account_id)}
                                title={isHidden ? "Show account" : "Hide account"}
                              >
                                {isHidden ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingAccount(account.account_id)}
                                title="Edit account"
                              >
                                <Edit2 className="h-4 w-4 text-gray-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUnlinkAccount(account.account_id)}
                                title="Unlink account"
                              >
                                <Unlink className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Account ID</p>
                              <p className="font-mono text-xs mt-1">
                                ...{account.account_id.slice(-8)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Currency</p>
                              <p className="font-semibold mt-1">{account.currency_code}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Status</p>
                              <Badge className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Link2 className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your bank accounts to get started
              </p>
              <PlaidConnect onSuccess={onRefresh} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
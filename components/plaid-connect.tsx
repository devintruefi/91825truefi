"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/user-context'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, CheckCircle, AlertTriangle } from 'lucide-react'

declare global {
  interface Window {
    Plaid: any
  }
}

interface PlaidConnectProps {
  onSuccess?: (publicToken?: string, metadata?: any) => void
  onError?: () => void
  variant?: "default" | "compact" | "icon"
  className?: string
}

export function PlaidConnect({ onSuccess, onError, variant = "default", className = "" }: PlaidConnectProps) {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [plaidLoaded, setPlaidLoaded] = useState(false)

  // Load Plaid script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => setPlaidLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const createLinkToken = async () => {
    if (!user?.id) {
      setError('User not found')
      return null
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiClient.createLinkToken(user.id, user.email)
      setLinkToken(response.link_token)
      return response.link_token
    } catch (err) {
      setError('Failed to create link token')
      return null
    } finally {
      setLoading(false)
    }
  }

  const openPlaidLink = () => {
    if (!linkToken || !window.Plaid) {
      setError('Plaid not ready')
      return
    }

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (public_token: string, metadata: any) => {
        try {
          setLoading(true)
          setError(null)
          
          // Link the account
          const result = await apiClient.linkPlaidAccount({
            user_id: user!.id,
            public_token,
            institution_id: metadata.institution.institution_id
          })

          if (result.success) {
            setSuccess(`Successfully connected ${result.accounts_count} accounts!`)
            setLinkToken(null)
            // Call onSuccess callback if provided, passing the data
            if (onSuccess) {
              setTimeout(() => onSuccess(public_token, metadata), 1000)
            } else {
              // Refresh the page to show new data
              setTimeout(() => window.location.reload(), 2000)
            }
          } else {
            setError('Failed to link account')
            if (onError) {
              onError()
            }
          }
        } catch (err) {
          setError('Failed to link account')
          if (onError) {
            onError()
          }
        } finally {
          setLoading(false)
        }
      },
      onExit: (err: any, metadata: any) => {
        if (err) {
          setError('Plaid connection failed')
          if (onError) {
            onError()
          }
        }
        setLinkToken(null)
        setLoading(false)
      },
      onEvent: (eventName: string, metadata: any) => {
        console.log('Plaid event:', eventName, metadata)
      }
    })

    handler.open()
  }

  const handleConnectBank = async () => {
    if (!plaidLoaded) {
      setError('Plaid is still loading. Please wait a moment and try again.')
      return
    }

    if (!linkToken) {
      const token = await createLinkToken()
      if (token) {
        // Use the token directly to open Plaid immediately
        setTimeout(() => {
          openPlaidLinkWithToken(token)
        }, 100)
      }
    } else {
      openPlaidLink()
    }
  }
  
  const openPlaidLinkWithToken = (token: string) => {
    if (!window.Plaid) {
      setError('Plaid not ready')
      return
    }

    const handler = window.Plaid.create({
      token: token,
      onSuccess: async (public_token: string, metadata: any) => {
        try {
          setLoading(true)
          setError(null)
          
          // Link the account
          const result = await apiClient.linkPlaidAccount({
            user_id: user!.id,
            public_token,
            institution_id: metadata.institution.institution_id
          })

          if (result.success) {
            setSuccess(`Successfully connected ${result.accounts_count} accounts!`)
            setLinkToken(null)
            // Call onSuccess callback if provided, passing the data
            if (onSuccess) {
              setTimeout(() => onSuccess(public_token, metadata), 1000)
            } else {
              // Refresh the page to show new data
              setTimeout(() => window.location.reload(), 2000)
            }
          } else {
            setError('Failed to link account')
            if (onError) {
              onError()
            }
          }
        } catch (err) {
          setError('Failed to link account')
          if (onError) {
            onError()
          }
        } finally {
          setLoading(false)
        }
      },
      onExit: (err: any, metadata: any) => {
        if (err) {
          setError('Plaid connection failed')
          if (onError) {
            onError()
          }
        }
        setLinkToken(null)
        setLoading(false)
      },
      onEvent: (eventName: string, metadata: any) => {
        console.log('Plaid event:', eventName, metadata)
      }
    })

    handler.open()
  }

  // Compact variant for header/inline use
  if (variant === "compact") {
    return (
      <div className="inline-flex">
        <Button 
          onClick={handleConnectBank}
          disabled={loading || !plaidLoaded}
          className={`bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white ${className}`}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 mr-2" />
          )}
          Connect Bank
        </Button>
        {error && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert variant="destructive" className="w-96">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        {success && (
          <div className="fixed bottom-4 right-4 z-50">
            <Alert className="border-green-200 bg-green-50 w-96">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    )
  }

  // Default card variant
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Connect Bank Account</span>
        </CardTitle>
        <CardDescription>
          Securely connect your bank account using Plaid to view your financial data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Button 
            onClick={handleConnectBank}
            disabled={loading || !plaidLoaded}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!plaidLoaded ? 'Loading Plaid...' : 'Connect Bank Account'}
          </Button>

          {!plaidLoaded && (
            <p className="text-sm text-gray-500 text-center">
              Loading Plaid integration...
            </p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Sandbox Testing</h4>
            <p className="text-sm text-blue-700 mb-2">
              For testing, use these credentials when prompted:
            </p>
            <div className="text-xs text-blue-600 space-y-1">
              <p><strong>Username:</strong> user_good</p>
              <p><strong>Password:</strong> mfa_device</p>
              <p><strong>2FA Code:</strong> 1234</p>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              <strong>Important:</strong> Select "First Platypus Bank" for testing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 
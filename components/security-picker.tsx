"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Check, Building, TrendingUp, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Security {
  symbol: string
  name: string
  type: string
  exchange: string
  currency: string
  sector: string
  current_price: number
  last_updated: string
}

interface SecurityPickerProps {
  value?: Security | null
  onSelect: (security: Security | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SecurityPicker({ 
  value, 
  onSelect, 
  placeholder = "Search by company name or symbol...",
  className = "",
  disabled = false
}: SecurityPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Security[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search function
  const searchSecurities = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 1) {
      setResults([])
      setShowResults(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/securities/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      const data = await response.json()
      
      if (response.ok) {
        setResults(data.results || [])
        setShowResults(true)
        setSelectedIndex(-1)
      } else {
        console.error('Search failed:', data.error)
        setResults([])
        setShowResults(false)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setShowResults(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle input change with debouncing
  const handleInputChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchSecurities(newQuery)
    }, 300)
  }, [searchSecurities])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showResults) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectSecurity(results[selectedIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }, [showResults, results, selectedIndex])

  const handleSelectSecurity = useCallback((security: Security) => {
    onSelect(security)
    setQuery(`${security.name} (${security.symbol})`)
    setShowResults(false)
    setSelectedIndex(-1)
  }, [onSelect])

  const handleClear = useCallback(() => {
    onSelect(null)
    setQuery("")
    setResults([])
    setShowResults(false)
    setSelectedIndex(-1)
  }, [onSelect])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const getTypeColor = (type: string) => {
    const colors = {
      'stock': 'bg-blue-100 text-blue-800',
      'etf': 'bg-green-100 text-green-800',
      'mutual_fund': 'bg-purple-100 text-purple-800',
      'crypto': 'bg-orange-100 text-orange-800',
      'bond': 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  // Set initial display value
  useEffect(() => {
    if (value) {
      setQuery(`${value.name} (${value.symbol})`)
    }
  }, [value])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Label className="text-sm font-medium text-gray-700 mb-2">
        Security <span className="text-red-500">*</span>
      </Label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <Input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          disabled={disabled}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true)
            }
          }}
        />
        
        {(query || value) && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute inset-y-0 right-0 px-3 h-full"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (results.length > 0 || loading) && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto shadow-lg border">
          <CardContent className="p-0">
            {loading && (
              <div className="p-3 text-center text-sm text-gray-500">
                <Search className="h-4 w-4 animate-spin inline mr-2" />
                Searching securities...
              </div>
            )}
            
            {!loading && results.length === 0 && (
              <div className="p-3 text-center text-sm text-gray-500">
                <div className="mb-2">Can't find it?</div>
                <div className="text-xs">Choose "Other" type and add details manually.</div>
              </div>
            )}
            
            {!loading && results.map((security, index) => (
              <button
                key={`${security.symbol}-${security.exchange}`}
                className={cn(
                  "w-full p-3 text-left hover:bg-gray-50 focus:bg-gray-50 border-b last:border-b-0 transition-colors",
                  selectedIndex === index && "bg-blue-50"
                )}
                onClick={() => handleSelectSecurity(security)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {security.name}
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        getTypeColor(security.type)
                      )}>
                        {security.type.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-mono font-medium">{security.symbol}</span>
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {security.exchange}
                      </span>
                      <span>{security.sector}</span>
                    </div>
                  </div>
                  
                  <div className="text-right ml-3">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(security.current_price)}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Live
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selected Security Display */}
      {value && !showResults && (
        <Card className="mt-2 border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">{value.name}</div>
                  <div className="text-xs text-gray-600">
                    {value.symbol} • {value.exchange} • {formatPrice(value.current_price)}
                  </div>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                getTypeColor(value.type)
              )}>
                {value.type.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
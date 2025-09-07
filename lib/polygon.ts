// lib/polygon.ts
// Framework-agnostic Polygon.io API service for TrueFi investment data

export interface QuoteData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: Date
  source: 'polygon' | 'fallback'
}

export interface SearchResult {
  symbol: string
  name: string
  type: string
  exchange: string
  currency: string
}

export interface HistoryPoint {
  t: number  // timestamp (milliseconds)
  o: number  // open
  h: number  // high
  l: number  // low
  c: number  // close
  v: number  // volume
}

interface CacheEntry {
  data: any
  expires: number
}

// Simple in-memory cache with configurable TTL
class PolygonCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 300000 // 5 minutes
  private readonly QUOTE_TTL = 60000    // 60 seconds
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.DEFAULT_TTL)
    })
  }
  
  setQuote(key: string, data: any): void {
    this.set(key, data, this.QUOTE_TTL)
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  size(): number {
    return this.cache.size
  }
}

// Rate limiter for Polygon API respect - adjusted for free tier
class RateLimiter {
  private requests: number[] = []
  private readonly limit = 5      // requests per window (free tier limit)
  private readonly window = 60000  // 60 second window for free tier
  
  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove expired requests
    this.requests = this.requests.filter(t => t > now - this.window)
    return this.requests.length < this.limit
  }
  
  recordRequest(): void {
    this.requests.push(Date.now())
  }
  
  async waitForSlot(): Promise<void> {
    let waitCount = 0
    const maxWaitSeconds = 10 // Maximum wait time
    
    while (!this.canMakeRequest()) {
      if (waitCount === 0) {
        const remainingTime = Math.ceil((this.requests[0] + this.window - Date.now()) / 1000)
        console.log(`Rate limit: waiting ${Math.min(remainingTime, maxWaitSeconds)}s for next available slot`)
      }
      
      // If we've been waiting too long, throw an error instead of continuing to wait
      if (waitCount >= maxWaitSeconds) {
        throw new Error(`Rate limit timeout after ${maxWaitSeconds}s`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      waitCount++
    }
    this.recordRequest()
  }
  
  // Handle 429 rate limit responses with exponential backoff
  async handleRateLimit(attempt: number = 1): Promise<void> {
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000)
    await new Promise(resolve => setTimeout(resolve, backoffMs))
  }
}

export class PolygonService {
  private readonly apiKey: string | undefined
  private readonly baseUrl = 'https://api.polygon.io'
  private readonly cache = new PolygonCache()
  private readonly limiter = new RateLimiter()
  
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY
  }
  
  // Normalize crypto symbols for Polygon format
  private normalizeCryptoSymbol(symbol: string): string {
    const cryptoMap: Record<string, string> = {
      'BTC': 'X:BTCUSD',
      'ETH': 'X:ETHUSD',
      'DOGE': 'X:DOGEUSD',
      'ADA': 'X:ADAUSD',
      'SOL': 'X:SOLUSD',
      'MATIC': 'X:MATICUSD',
      'AVAX': 'X:AVAXUSD',
      'DOT': 'X:DOTUSD',
      'USDC': 'X:USDCUSD',
      'USDT': 'X:USDTUSD'
    }
    
    const upperSymbol = symbol.toUpperCase()
    return cryptoMap[upperSymbol] || symbol
  }
  
  // Check if symbol is likely crypto
  private isCryptoSymbol(symbol: string): boolean {
    const cryptoSymbols = ['BTC', 'ETH', 'DOGE', 'ADA', 'SOL', 'MATIC', 'AVAX', 'DOT', 'USDC', 'USDT']
    return cryptoSymbols.includes(symbol.toUpperCase()) || symbol.includes(':')
  }
  
  // Get last trading day (for weekend/holiday fallback)
  private getLastTradingDay(): Date {
    const today = new Date()
    let tradingDay = new Date(today)
    
    // Step back up to 7 days to find a trading day
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = tradingDay.getDay()
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Basic check - could be enhanced with holiday calendar
        return tradingDay
      }
      
      tradingDay.setDate(tradingDay.getDate() - 1)
    }
    
    return tradingDay // fallback
  }
  
  async getQuote(ticker: string): Promise<QuoteData> {
    if (!this.apiKey) {
      throw new Error('Polygon API key not configured')
    }
    
    const normalizedTicker = this.isCryptoSymbol(ticker) 
      ? this.normalizeCryptoSymbol(ticker) 
      : ticker
    
    const cacheKey = `quote:${normalizedTicker}`
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return { ...cached, source: 'polygon' }
    }
    
    await this.limiter.waitForSlot()
    
    try {
      // Fetch last trade and previous close in parallel
      const [tradeResponse, prevResponse] = await Promise.all([
        fetch(`${this.baseUrl}/v2/last/trade/${normalizedTicker}?apiKey=${this.apiKey}`, {
          headers: { 'Accept': 'application/json' }
        }),
        fetch(`${this.baseUrl}/v2/aggs/ticker/${normalizedTicker}/prev?apiKey=${this.apiKey}`, {
          headers: { 'Accept': 'application/json' }
        })
      ])
      
      // Handle rate limiting
      if (tradeResponse.status === 429 || prevResponse.status === 429) {
        await this.limiter.handleRateLimit()
        throw new Error('Rate limited, will retry')
      }
      
      if (!tradeResponse.ok && !prevResponse.ok) {
        throw new Error(`HTTP ${tradeResponse.status}: Failed to fetch quote`)
      }
      
      const [tradeData, prevData] = await Promise.all([
        tradeResponse.json(),
        prevResponse.json()
      ])
      
      // Extract price data with fallbacks
      const currentPrice = tradeData.results?.p || prevData.results?.[0]?.c || 0
      const previousClose = prevData.results?.[0]?.c || currentPrice
      const volume = prevData.results?.[0]?.v || 0
      
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
      
      const quote: QuoteData = {
        symbol: ticker,
        price: Number(currentPrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        volume,
        timestamp: new Date(),
        source: 'polygon'
      }
      
      this.cache.setQuote(cacheKey, quote)
      return quote
      
    } catch (error) {
      console.error(`Polygon quote error for ${ticker}:`, error)
      throw error
    }
  }
  
  async searchTickers(query: string, limit = 8): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Polygon API key not configured')
    }
    
    if (!query.trim()) {
      return []
    }
    
    const cacheKey = `search:${query.toLowerCase()}:${limit}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached
    
    await this.limiter.waitForSlot()
    
    try {
      const response = await fetch(
        `${this.baseUrl}/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=${limit}&apiKey=${this.apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      )
      
      if (response.status === 429) {
        await this.limiter.handleRateLimit()
        throw new Error('Rate limited, will retry')
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Search failed`)
      }
      
      const data = await response.json()
      
      const results: SearchResult[] = (data.results || [])
        .slice(0, limit)
        .map((item: any) => ({
          symbol: item.ticker || '',
          name: item.name || item.ticker || 'Unknown',
          type: this.normalizeSecurityType(item.market),
          exchange: item.primary_exchange || 'N/A',
          currency: item.currency_name || 'USD'
        }))
      
      this.cache.set(cacheKey, results, 300000) // 5 minute cache for searches
      return results
      
    } catch (error) {
      console.error('Polygon search error:', error)
      throw error
    }
  }
  
  async getHistory(ticker: string, range: string): Promise<HistoryPoint[]> {
    if (!this.apiKey) {
      throw new Error('Polygon API key not configured')
    }
    
    const normalizedTicker = this.isCryptoSymbol(ticker) 
      ? this.normalizeCryptoSymbol(ticker) 
      : ticker
    
    const cacheKey = `history:${normalizedTicker}:${range}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached
    
    await this.limiter.waitForSlot()
    
    // Map ranges to Polygon API parameters
    const { timespan, multiplier, from, to } = this.buildTimeRangeParams(range)
    
    try {
      const fromStr = from.toISOString().split('T')[0]
      const toStr = to.toISOString().split('T')[0]
      
      const response = await fetch(
        `${this.baseUrl}/v2/aggs/ticker/${normalizedTicker}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?apiKey=${this.apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      )
      
      if (response.status === 429) {
        await this.limiter.handleRateLimit()
        throw new Error('Rate limited, will retry')
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: History fetch failed`)
      }
      
      const data = await response.json()
      let results = data.results || []
      
      // Fallback for 1D/1W if no data (weekend/holiday)
      if (results.length === 0 && ['1D', '1W'].includes(range)) {
        const fallbackResult = await this.getHistoryWithTradingDayFallback(normalizedTicker, range)
        results = fallbackResult
      }
      
      const history: HistoryPoint[] = results.map((bar: any) => ({
        t: bar.t,
        o: Number(bar.o.toFixed(2)),
        h: Number(bar.h.toFixed(2)),
        l: Number(bar.l.toFixed(2)),
        c: Number(bar.c.toFixed(2)),
        v: bar.v || 0
      }))
      
      this.cache.set(cacheKey, history, 60000) // 1 minute cache for history
      return history
      
    } catch (error) {
      console.error(`Polygon history error for ${ticker} (${range}):`, error)
      throw error
    }
  }
  
  // Fallback for intraday data on non-trading days
  private async getHistoryWithTradingDayFallback(ticker: string, range: string): Promise<any[]> {
    const lastTradingDay = this.getLastTradingDay()
    
    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const testDate = new Date(lastTradingDay)
      testDate.setDate(testDate.getDate() - daysBack)
      
      // Skip weekends
      if (testDate.getDay() === 0 || testDate.getDay() === 6) continue
      
      try {
        const { timespan, multiplier } = this.buildTimeRangeParams(range)
        const dateStr = testDate.toISOString().split('T')[0]
        
        const response = await fetch(
          `${this.baseUrl}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${dateStr}/${dateStr}?apiKey=${this.apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.results?.length > 0) {
            return data.results
          }
        }
      } catch (error) {
        console.warn(`Fallback attempt ${daysBack} failed:`, error)
      }
    }
    
    return []
  }
  
  private buildTimeRangeParams(range: string): { timespan: string; multiplier: number; from: Date; to: Date } {
    const now = new Date()
    let timespan: string
    let multiplier: number
    let from: Date
    const to = new Date(now)
    
    switch (range) {
      case '1D':
        timespan = 'minute'
        multiplier = 1
        from = new Date(now)
        from.setHours(9, 30, 0, 0) // Market open
        break
        
      case '1W':
        timespan = 'minute'
        multiplier = 5
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
        
      case '1M':
        timespan = 'day'
        multiplier = 1
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
        
      case '3M':
        timespan = 'day'
        multiplier = 1
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
        
      case 'YTD':
        timespan = 'day'
        multiplier = 1
        from = new Date(now.getFullYear(), 0, 1)
        break
        
      case '1Y':
        timespan = 'day'
        multiplier = 1
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
        
      case 'ALL':
        timespan = 'week'
        multiplier = 1
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000) // 5 years max
        break
        
      default:
        throw new Error(`Invalid range: ${range}`)
    }
    
    return { timespan, multiplier, from, to }
  }
  
  // Normalize Polygon market types to our security types
  private normalizeSecurityType(market: string): string {
    const marketMap: Record<string, string> = {
      'stocks': 'stock',
      'crypto': 'crypto',
      'fx': 'currency',
      'otc': 'stock'
    }
    
    return marketMap[market?.toLowerCase()] || 'stock'
  }
  
  // Health check method
  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }
  
  // Get historical price for a specific date
  async getHistoricalPrice(ticker: string, date: string): Promise<number | null> {
    if (!this.apiKey) {
      throw new Error('Polygon API key not configured')
    }
    
    const normalizedTicker = this.isCryptoSymbol(ticker) 
      ? this.normalizeCryptoSymbol(ticker) 
      : ticker
    
    // Check cache first
    const cacheKey = `price:${normalizedTicker}:${date}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached
    
    await this.limiter.waitForSlot()
    
    try {
      // Fetch data for the specific date using open-close endpoint
      const response = await fetch(
        `${this.baseUrl}/v1/open-close/${normalizedTicker}/${date}?apiKey=${this.apiKey}`,
        { headers: { 'Accept': 'application/json' } }
      )
      
      if (response.status === 429) {
        await this.limiter.handleRateLimit()
        throw new Error('Rate limited, will retry')
      }
      
      if (response.status === 404 || !response.ok) {
        // No data for this date (weekend/holiday), try to get nearest trading day
        const nearestPrice = await this.getNearestTradingDayPrice(normalizedTicker, date)
        if (nearestPrice) {
          this.cache.set(cacheKey, nearestPrice, 3600000) // Cache for 1 hour
        }
        return nearestPrice
      }
      
      const data = await response.json()
      const price = data.close || data.open || null
      
      if (price) {
        this.cache.set(cacheKey, price, 3600000) // Cache for 1 hour
      }
      
      return price
    } catch (error) {
      console.error(`Failed to fetch historical price for ${ticker} on ${date}:`, error)
      return null
    }
  }
  
  // Get price from nearest trading day if specific date has no data
  private async getNearestTradingDayPrice(ticker: string, date: string): Promise<number | null> {
    try {
      // Get a few days before the target date to find the last trading day
      const targetDate = new Date(date)
      const fromDate = new Date(targetDate)
      fromDate.setDate(fromDate.getDate() - 5)
      
      const fromStr = fromDate.toISOString().split('T')[0]
      const toStr = date
      
      const response = await fetch(
        `${this.baseUrl}/v2/aggs/ticker/${ticker}/range/1/day/${fromStr}/${toStr}?apiKey=${this.apiKey}&sort=desc&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      )
      
      if (!response.ok) {
        return null
      }
      
      const data = await response.json()
      if (data.results && data.results.length > 0) {
        return data.results[0].c || data.results[0].o || null
      }
      
      return null
    } catch (error) {
      console.error('Failed to get nearest trading day price:', error)
      return null
    }
  }
  
  // Cache statistics for debugging
  getCacheStats(): { size: number; quoteTTL: number; defaultTTL: number } {
    return {
      size: this.cache.size(),
      quoteTTL: 60000,
      defaultTTL: 300000
    }
  }
}

// Export singleton instance
export const polygonService = new PolygonService()
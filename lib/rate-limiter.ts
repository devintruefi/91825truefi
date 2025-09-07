// Simple in-memory rate limiter
// In production, consider using Redis or a distributed solution

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a request should be allowed
   * @param key - Unique identifier (IP, user ID, etc.)
   * @param limit - Maximum requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns true if request is allowed, false if rate limited
   */
  check(key: string, limit: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    // No record or expired window - allow and create new record
    if (!record || now > record.resetAt) {
      this.requests.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return true;
    }

    // Within window - check limit
    if (record.count >= limit) {
      return false; // Rate limited
    }

    // Increment and allow
    record.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   * @param key - Unique identifier
   * @param limit - Maximum requests allowed in window
   * @returns Number of remaining requests
   */
  remaining(key: string, limit: number = 60): number {
    const record = this.requests.get(key);
    if (!record || Date.now() > record.resetAt) {
      return limit;
    }
    return Math.max(0, limit - record.count);
  }

  /**
   * Get reset time for a key
   * @param key - Unique identifier
   * @returns Timestamp when rate limit resets, or 0 if no limit
   */
  resetTime(key: string): number {
    const record = this.requests.get(key);
    return record?.resetAt || 0;
  }

  /**
   * Clean up expired records to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and clear cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Express/Next.js middleware helper
 * @param options - Rate limit options
 */
export function withRateLimit(
  options: {
    limit?: number;
    windowMs?: number;
    keyGenerator?: (req: any) => string;
    handler?: (req: any, res: any) => void;
  } = {}
) {
  const {
    limit = 60,
    windowMs = 60000,
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || req.ip || 'unknown',
    handler = (req, res) => {
      return new Response(
        JSON.stringify({ error: 'Too many requests, please try again later' }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(windowMs / 1000))
          }
        }
      );
    }
  } = options;

  return (req: any) => {
    const key = keyGenerator(req);
    
    if (!rateLimiter.check(key, limit, windowMs)) {
      // Rate limited
      const remaining = rateLimiter.remaining(key, limit);
      const resetTime = rateLimiter.resetTime(key);
      
      console.warn(`Rate limit exceeded for ${key}: ${limit} requests in ${windowMs}ms`);
      
      // Set rate limit headers
      if (req.headers && typeof req.headers.set === 'function') {
        req.headers.set('X-RateLimit-Limit', String(limit));
        req.headers.set('X-RateLimit-Remaining', String(remaining));
        req.headers.set('X-RateLimit-Reset', String(resetTime));
      }
      
      return handler(req, null);
    }
    
    // Request allowed
    return null;
  };
}
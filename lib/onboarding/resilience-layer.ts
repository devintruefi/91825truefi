/**
 * Resilience Layer - Race condition handling and request deduplication
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory request tracking (use Redis in production)
const activeRequests = new Map<string, {
  promise: Promise<any>;
  timestamp: number;
  nonce: string;
}>();

const completedRequests = new Map<string, {
  result: any;
  timestamp: number;
}>();

// Configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const CACHE_TTL = 60000; // 1 minute
const DEBOUNCE_WINDOW = 300; // 300ms

/**
 * Debounced request handler with deduplication
 */
export class ResilientRequestHandler {
  private pendingRequests = new Map<string, NodeJS.Timeout>();
  private requestQueue = new Map<string, Array<(result: any) => void>>();
  
  /**
   * Handle a request with deduplication and debouncing
   */
  async handleRequest<T>(
    requestKey: string,
    nonce: string,
    handler: () => Promise<T>
  ): Promise<T> {
    // Check if request is already in progress
    const activeRequest = activeRequests.get(requestKey);
    if (activeRequest && activeRequest.nonce === nonce) {
      console.log(`Request ${requestKey} already in progress with same nonce`);
      return activeRequest.promise;
    }
    
    // Check if we have a recent cached result
    const cachedResult = completedRequests.get(requestKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      console.log(`Returning cached result for ${requestKey}`);
      return cachedResult.result;
    }
    
    // Clear any pending debounced request
    const pendingTimeout = this.pendingRequests.get(requestKey);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.pendingRequests.delete(requestKey);
    }
    
    // Create new request promise
    const requestPromise = this.executeWithTimeout(handler, REQUEST_TIMEOUT);
    
    // Track active request
    activeRequests.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now(),
      nonce
    });
    
    try {
      const result = await requestPromise;
      
      // Cache successful result
      completedRequests.set(requestKey, {
        result,
        timestamp: Date.now()
      });
      
      // Clean up after cache TTL
      setTimeout(() => {
        completedRequests.delete(requestKey);
      }, CACHE_TTL);
      
      return result;
    } finally {
      // Clean up active request
      activeRequests.delete(requestKey);
    }
  }
  
  /**
   * Debounce a request
   */
  debounceRequest<T>(
    requestKey: string,
    handler: () => Promise<T>,
    delay: number = DEBOUNCE_WINDOW
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      const existing = this.pendingRequests.get(requestKey);
      if (existing) {
        clearTimeout(existing);
      }
      
      // Add to queue
      if (!this.requestQueue.has(requestKey)) {
        this.requestQueue.set(requestKey, []);
      }
      this.requestQueue.get(requestKey)!.push(resolve);
      
      // Set new timeout
      const timeout = setTimeout(async () => {
        this.pendingRequests.delete(requestKey);
        const queue = this.requestQueue.get(requestKey) || [];
        this.requestQueue.delete(requestKey);
        
        try {
          const result = await handler();
          queue.forEach(resolver => resolver(result));
        } catch (error) {
          queue.forEach(resolver => resolver(Promise.reject(error)));
        }
      }, delay);
      
      this.pendingRequests.set(requestKey, timeout);
    });
  }
  
  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(
    handler: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      handler(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }
}

/**
 * Transaction wrapper for atomic operations
 */
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>
): Promise<T> {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await operation(tx);
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'Serializable'
      });
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a transient error that we should retry
      if (isTransientError(error)) {
        console.log(`Transaction attempt ${attempt + 1} failed, retrying...`);
        await sleep(Math.pow(2, attempt) * 100); // Exponential backoff
        continue;
      }
      
      // Non-transient error, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Check if error is transient and should be retried
 */
function isTransientError(error: any): boolean {
  const transientCodes = [
    'P2034', // Transaction failed due to concurrent update
    'P2028', // Transaction API error
    'P2024', // Timed out fetching a new connection from pool
  ];
  
  return transientCodes.includes(error?.code) ||
         error?.message?.includes('deadlock') ||
         error?.message?.includes('timeout');
}

/**
 * Sleep helper for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Distributed lock for critical sections (simplified version)
 */
export class DistributedLock {
  private locks = new Map<string, {
    holder: string;
    timestamp: number;
    ttl: number;
  }>();
  
  /**
   * Acquire a lock
   */
  async acquire(
    key: string,
    holder: string,
    ttl: number = 5000
  ): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);
    
    // Check if lock exists and is still valid
    if (existing && now - existing.timestamp < existing.ttl) {
      if (existing.holder === holder) {
        // Same holder, refresh lock
        existing.timestamp = now;
        return true;
      }
      return false; // Lock held by another holder
    }
    
    // Acquire new lock
    this.locks.set(key, {
      holder,
      timestamp: now,
      ttl
    });
    
    // Auto-release after TTL
    setTimeout(() => {
      const current = this.locks.get(key);
      if (current && current.holder === holder) {
        this.locks.delete(key);
      }
    }, ttl);
    
    return true;
  }
  
  /**
   * Release a lock
   */
  release(key: string, holder: string): boolean {
    const existing = this.locks.get(key);
    if (existing && existing.holder === holder) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }
  
  /**
   * Execute with lock
   */
  async withLock<T>(
    key: string,
    holder: string,
    operation: () => Promise<T>,
    options: { ttl?: number; maxWait?: number } = {}
  ): Promise<T> {
    const { ttl = 5000, maxWait = 10000 } = options;
    const startTime = Date.now();
    
    // Try to acquire lock with retries
    while (Date.now() - startTime < maxWait) {
      if (await this.acquire(key, holder, ttl)) {
        try {
          return await operation();
        } finally {
          this.release(key, holder);
        }
      }
      
      // Wait before retry
      await sleep(100);
    }
    
    throw new Error(`Failed to acquire lock for ${key} within ${maxWait}ms`);
  }
}

/**
 * Request validator with rate limiting
 */
export class RequestValidator {
  private requestCounts = new Map<string, {
    count: number;
    windowStart: number;
  }>();
  
  private readonly maxRequestsPerWindow = 10;
  private readonly windowSize = 60000; // 1 minute
  
  /**
   * Check if request is allowed
   */
  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requestCounts.get(userId);
    
    if (!userRequests || now - userRequests.windowStart > this.windowSize) {
      // New window
      this.requestCounts.set(userId, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    if (userRequests.count >= this.maxRequestsPerWindow) {
      return false; // Rate limit exceeded
    }
    
    userRequests.count++;
    return true;
  }
  
  /**
   * Reset rate limit for user
   */
  reset(userId: string): void {
    this.requestCounts.delete(userId);
  }
}

/**
 * Singleton instances
 */
export const requestHandler = new ResilientRequestHandler();
export const distributedLock = new DistributedLock();
export const requestValidator = new RequestValidator();

/**
 * Structured logging for onboarding events
 */
export async function logOnboardingEvent(
  eventType: 'step_advanced' | 'out_of_sync' | 'resync' | 'error',
  data: {
    userId: string;
    sessionId?: string;
    stepId?: string;
    oldStep?: string;
    newStep?: string;
    instanceId?: string;
    nonce?: string;
    error?: string;
    metadata?: any;
  }
): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...data
    };
    
    console.log(`[ONBOARDING_${eventType.toUpperCase()}]`, JSON.stringify(logEntry));
    
    // Also log to database for analysis
    if (data.userId) {
      await prisma.agent_audit_events.create({
        data: {
          session_id: data.sessionId || crypto.randomUUID(),
          user_id: data.userId,
          event_type: `onboarding_${eventType}`,
          event_data: logEntry,
          created_at: new Date()
        }
      }).catch(err => {
        console.error('Failed to log audit event:', err);
      });
    }
  } catch (error) {
    console.error('Error logging onboarding event:', error);
  }
}
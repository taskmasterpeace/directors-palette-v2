/**
 * Simple in-memory rate limiter for API routes.
 *
 * SECURITY: Prevents brute-force attacks on sensitive endpoints like
 * coupon redemption, credit grants, and authentication.
 *
 * NOTE: This is per-instance only. For multi-instance deployments
 * (Vercel serverless), consider Upstash Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param key - Unique identifier (e.g. userId, IP, or route+userId combo)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and metadata
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // No entry or expired window - start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  // Within window - check count
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  // Increment and allow
  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Pre-configured rate limits for common endpoints.
 */
export const RATE_LIMITS = {
  /** Coupon redemption: 5 attempts per 60 seconds per user */
  COUPON_REDEEM: { maxRequests: 5, windowSeconds: 60 },
  /** Image generation: 10 requests per 60 seconds per user */
  IMAGE_GENERATION: { maxRequests: 10, windowSeconds: 60 },
  /** Admin credit grants: 10 per 60 seconds */
  ADMIN_CREDIT_GRANT: { maxRequests: 10, windowSeconds: 60 },
  /** API key operations: 20 per 60 seconds */
  API_KEY_OPS: { maxRequests: 20, windowSeconds: 60 },
} as const

/**
 * Rate limiting middleware for the macts API server.
 *
 * Provides in-memory sliding window rate limiting keyed by API key ID.
 *
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'
import type { AuthVariables } from './auth.js'

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Maximum requests per window (default: 100) */
  max?: number
  /** Custom key extractor function */
  keyExtractor?: (c: { get: (key: 'apiKeyPayload') => { sub: string } }) => string
}

interface WindowEntry {
  count: number
  resetAt: number
}

/**
 * Rate limiter instance.
 */
export interface RateLimiterInstance {
  /** Hono middleware handler */
  middleware(): MiddlewareHandler<{ Variables: AuthVariables }>
  /** Clean up the interval timer */
  close(): void
}

/**
 * Create an in-memory sliding window rate limiter.
 *
 * Rate limits are keyed by the API key ID (`sub` claim from the auth payload).
 * Each key gets its own independent counter and window.
 *
 * @param options - Rate limit configuration
 * @returns Rate limiter instance with middleware and cleanup
 *
 * @example
 * ```typescript
 * import { createRateLimiter } from './middleware/rate-limit.js';
 *
 * const limiter = createRateLimiter({ windowMs: 60_000, max: 100 });
 * app.use('/api/v1/rpc/*', limiter.middleware());
 *
 * // On shutdown:
 * limiter.close();
 * ```
 */
export function createRateLimiter(options: RateLimitOptions = {}): RateLimiterInstance {
  const { windowMs = 60_000, max = 100, keyExtractor } = options

  const windows = new Map<string, WindowEntry>()

  // Periodic cleanup of expired windows
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of windows) {
      if (entry.resetAt <= now) {
        windows.delete(key)
      }
    }
  }, 60_000)
  cleanupInterval.unref()

  function getKey(c: { get: (key: 'apiKeyPayload') => { sub: string } }): string {
    if (keyExtractor) {
      return keyExtractor(c)
    }
    try {
      return c.get('apiKeyPayload').sub
    } catch {
      return 'anonymous'
    }
  }

  function middleware(): MiddlewareHandler<{ Variables: AuthVariables }> {
    return async (c, next) => {
      const key = getKey(c)
      const now = Date.now()

      let entry = windows.get(key)
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs }
        windows.set(key, entry)
      }

      entry.count++

      // Set rate limit headers on all responses
      const remaining = Math.max(0, max - entry.count)
      const resetSeconds = Math.ceil((entry.resetAt - now) / 1000)

      c.header('X-RateLimit-Limit', String(max))
      c.header('X-RateLimit-Remaining', String(remaining))
      c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

      if (entry.count > max) {
        c.header('Retry-After', String(resetSeconds))
        return c.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. Try again in ${String(resetSeconds)} seconds.`,
            },
          },
          429
        )
      }

      return next()
    }
  }

  return {
    middleware,
    close() {
      clearInterval(cleanupInterval)
      windows.clear()
    },
  }
}

/**
 * Tests for rate limiting middleware.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { AuthVariables } from './auth.js'
import { createRateLimiter, type RateLimiterInstance } from './rate-limit.js'

function createTestApp(limiter: RateLimiterInstance, keyId = 'test-key') {
  const app = new Hono<{ Variables: AuthVariables }>()

  // Simulate auth middleware setting the payload
  app.use('*', async (c, next) => {
    c.set('apiKeyPayload', { iss: 'macts' as const, sub: keyId, iat: 0, permissions: [] })
    await next()
  })

  app.use('*', limiter.middleware())

  app.get('/test', (c) => c.json({ ok: true }))

  return app
}

describe('createRateLimiter', () => {
  let limiter: RateLimiterInstance

  afterEach(() => {
    limiter.close()
    vi.useRealTimers()
  })

  describe('positive cases', () => {
    it('should allow requests within the rate limit', async () => {
      limiter = createRateLimiter({ max: 5, windowMs: 60_000 })
      const app = createTestApp(limiter)

      for (let i = 0; i < 5; i++) {
        const res = await app.request('/test')
        expect(res.status).toBe(200)
      }
    })

    it('should set X-RateLimit-Limit header on all responses', async () => {
      limiter = createRateLimiter({ max: 10, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
    })

    it('should set X-RateLimit-Remaining header on all responses', async () => {
      limiter = createRateLimiter({ max: 5, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res1 = await app.request('/test')
      expect(res1.headers.get('X-RateLimit-Remaining')).toBe('4')

      const res2 = await app.request('/test')
      expect(res2.headers.get('X-RateLimit-Remaining')).toBe('3')
    })

    it('should set X-RateLimit-Reset header on all responses', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))

      limiter = createRateLimiter({ max: 5, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res = await app.request('/test')
      const resetTimestamp = Number(res.headers.get('X-RateLimit-Reset'))

      // Should be approximately 60 seconds from now (Unix timestamp in seconds)
      const expectedReset = Math.ceil((Date.now() + 60_000) / 1000)
      expect(resetTimestamp).toBe(expectedReset)
    })

    it('should decrement remaining count with each request', async () => {
      limiter = createRateLimiter({ max: 3, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res1 = await app.request('/test')
      expect(res1.headers.get('X-RateLimit-Remaining')).toBe('2')

      const res2 = await app.request('/test')
      expect(res2.headers.get('X-RateLimit-Remaining')).toBe('1')

      const res3 = await app.request('/test')
      expect(res3.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('negative cases - rate limit exceeded', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app = createTestApp(limiter)

      // First two requests should succeed
      await app.request('/test')
      await app.request('/test')

      // Third request should be rate limited
      const res = await app.request('/test')
      expect(res.status).toBe(429)
    })

    it('should return RATE_LIMIT_EXCEEDED error code on 429', async () => {
      limiter = createRateLimiter({ max: 1, windowMs: 60_000 })
      const app = createTestApp(limiter)

      await app.request('/test')
      const res = await app.request('/test')

      expect(res.status).toBe(429)

      const body = (await res.json()) as { error: { code: string; message: string } }
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(body.error.message).toMatch(/^Rate limit exceeded\. Try again in \d+ seconds\.$/)
    })

    it('should include Retry-After header on 429 responses', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))

      limiter = createRateLimiter({ max: 1, windowMs: 60_000 })
      const app = createTestApp(limiter)

      await app.request('/test')
      const res = await app.request('/test')

      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBe('60')
    })

    it('should not include Retry-After header on successful responses', async () => {
      limiter = createRateLimiter({ max: 5, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      expect(res.headers.get('Retry-After')).toBeNull()
    })

    it('should show zero remaining when at the limit', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app = createTestApp(limiter)

      await app.request('/test')
      await app.request('/test')

      const res = await app.request('/test')
      expect(res.status).toBe(429)
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('per-key isolation', () => {
    it('should rate limit different keys independently', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })

      const appA = createTestApp(limiter, 'key-a')
      const appB = createTestApp(limiter, 'key-b')

      // Exhaust key-a's limit
      await appA.request('/test')
      await appA.request('/test')

      const resA = await appA.request('/test')
      expect(resA.status).toBe(429)

      // key-b should still work
      const resB = await appB.request('/test')
      expect(resB.status).toBe(200)
    })

    it('should use custom keyExtractor when provided', async () => {
      limiter = createRateLimiter({
        max: 1,
        windowMs: 60_000,
        keyExtractor: () => 'shared-key',
      })

      const appA = createTestApp(limiter, 'key-a')
      const appB = createTestApp(limiter, 'key-b')

      // First request uses up the shared key's limit
      const res1 = await appA.request('/test')
      expect(res1.status).toBe(200)

      // Second request from different app should be limited (same shared key)
      const res2 = await appB.request('/test')
      expect(res2.status).toBe(429)
    })
  })

  describe('window reset', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    })

    it('should reset the counter after the window expires', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app = createTestApp(limiter)

      // Exhaust the limit
      await app.request('/test')
      await app.request('/test')

      const res = await app.request('/test')
      expect(res.status).toBe(429)

      // Advance time past the window
      vi.advanceTimersByTime(60_001)

      // Should work again
      const resAfterReset = await app.request('/test')
      expect(resAfterReset.status).toBe(200)
      expect(resAfterReset.headers.get('X-RateLimit-Remaining')).toBe('1')
    })

    it('should not reset the counter before the window expires', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app = createTestApp(limiter)

      // Exhaust the limit
      await app.request('/test')
      await app.request('/test')

      // Advance time but not past the window
      vi.advanceTimersByTime(30_000)

      const res = await app.request('/test')
      expect(res.status).toBe(429)
    })
  })

  describe('edge cases', () => {
    it('should use default options when none provided', async () => {
      limiter = createRateLimiter()
      const app = createTestApp(limiter)

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('99')
    })

    it('should handle max of 0 (block all requests)', async () => {
      limiter = createRateLimiter({ max: 0, windowMs: 60_000 })
      const app = createTestApp(limiter)

      const res = await app.request('/test')
      expect(res.status).toBe(429)
    })

    it('should fall back to anonymous key when apiKeyPayload is not set', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })

      const app = new Hono<{ Variables: AuthVariables }>()
      // No auth middleware - payload is not set
      app.use('*', limiter.middleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res1 = await app.request('/test')
      expect(res1.status).toBe(200)

      const res2 = await app.request('/test')
      expect(res2.status).toBe(200)

      const res3 = await app.request('/test')
      expect(res3.status).toBe(429)
    })

    it('should clean up state when close is called', async () => {
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app = createTestApp(limiter)

      await app.request('/test')
      await app.request('/test')

      // Rate limited
      const res1 = await app.request('/test')
      expect(res1.status).toBe(429)

      // Close and recreate
      limiter.close()
      limiter = createRateLimiter({ max: 2, windowMs: 60_000 })
      const app2 = createTestApp(limiter)

      // Should work again with fresh state
      const res2 = await app2.request('/test')
      expect(res2.status).toBe(200)
    })
  })
})

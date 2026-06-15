/**
 * Tests for in-flight request tracker middleware.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createInFlightTracker } from './in-flight.js'

describe('createInFlightTracker', () => {
  describe('count', () => {
    it('should start at zero', () => {
      const tracker = createInFlightTracker()
      expect(tracker.count).toBe(0)
    })

    it('should increment during request and decrement after', async () => {
      const tracker = createInFlightTracker()
      let countDuringRequest = -1

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/test', (c) => {
        countDuringRequest = tracker.count
        return c.json({ ok: true })
      })

      await app.request('/test')

      expect(countDuringRequest).toBe(1)
      expect(tracker.count).toBe(0)
    })

    it('should track multiple concurrent requests', async () => {
      const tracker = createInFlightTracker()
      let maxCount = 0

      // Use a deferred pattern to control request completion
      const resolvers: (() => void)[] = []

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/slow', async (c) => {
        maxCount = Math.max(maxCount, tracker.count)
        await new Promise<void>((resolve) => {
          resolvers.push(resolve)
        })
        return c.json({ ok: true })
      })

      // Start multiple requests concurrently
      const req1 = app.request('/slow')
      const req2 = app.request('/slow')
      const req3 = app.request('/slow')

      // Wait for all resolvers to be registered
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (resolvers.length === 3) {
            clearInterval(interval)
            resolve()
          }
        }, 10)
      })

      expect(tracker.count).toBe(3)
      expect(maxCount).toBe(3)

      // Resolve all requests
      for (const resolve of resolvers) {
        resolve()
      }

      await Promise.all([req1, req2, req3])
      expect(tracker.count).toBe(0)
    })
  })

  describe('middleware', () => {
    it('should not interfere with request processing', async () => {
      const tracker = createInFlightTracker()

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/test', (c) => {
        return c.json({ message: 'hello' })
      })

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      const body = (await res.json()) as { message: string }
      expect(body.message).toBe('hello')
    })

    it('should decrement count even when handler throws', async () => {
      const tracker = createInFlightTracker()

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/error', () => {
        throw new Error('handler error')
      })
      app.onError((_err, c) => {
        return c.json({ error: 'internal' }, 500)
      })

      const res = await app.request('/error')

      expect(res.status).toBe(500)
      expect(tracker.count).toBe(0)
    })

    it('should decrement count when downstream middleware throws', async () => {
      const tracker = createInFlightTracker()

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.use('*', () => {
        throw new Error('middleware error')
      })
      app.get('/test', (c) => c.json({ ok: true }))
      app.onError((_err, c) => {
        return c.json({ error: 'internal' }, 500)
      })

      const res = await app.request('/test')

      expect(res.status).toBe(500)
      expect(tracker.count).toBe(0)
    })
  })

  describe('waitForDrain', () => {
    it('should resolve immediately when no requests are in-flight', async () => {
      const tracker = createInFlightTracker()
      await tracker.waitForDrain(1000)
      // If we get here without timeout, the test passes
    })

    it('should resolve when all in-flight requests complete', async () => {
      const tracker = createInFlightTracker()
      let resolveRequest: (() => void) | null = null

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/slow', async (c) => {
        await new Promise<void>((resolve) => {
          resolveRequest = resolve
        })
        return c.json({ ok: true })
      })

      // Start a request
      const requestPromise = app.request('/slow')

      // Wait for the request to register
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (resolveRequest) {
            clearInterval(interval)
            resolve()
          }
        }, 10)
      })

      expect(tracker.count).toBe(1)

      // Start draining
      let drained = false
      const drainPromise = tracker.waitForDrain(5000).then(() => {
        drained = true
      })

      // Drain should not have resolved yet
      expect(drained).toBe(false)

      // Complete the request. The poll loop above guarantees resolveRequest is set;
      // the assignment happens inside the route handler closure, which TypeScript's
      // control-flow analysis cannot see, hence the non-null assertion.
      const resolve = resolveRequest as unknown as () => void
      resolve()
      await requestPromise

      // Now drain should resolve
      await drainPromise
      expect(drained).toBe(true)
      expect(tracker.count).toBe(0)
    })

    it('should reject with timeout error when requests do not complete', async () => {
      const tracker = createInFlightTracker()
      let resolveRequest: (() => void) | null = null

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/stuck', async (c) => {
        await new Promise<void>((resolve) => {
          resolveRequest = resolve
        })
        return c.json({ ok: true })
      })

      // Start a request that won't complete
      const requestPromise = app.request('/stuck')

      // Wait for the request to register
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (resolveRequest) {
            clearInterval(interval)
            resolve()
          }
        }, 10)
      })

      expect(tracker.count).toBe(1)

      // Wait for drain with a very short timeout
      await expect(tracker.waitForDrain(50)).rejects.toThrow(
        /Drain timeout: 1 requests still in-flight after 50ms/
      )

      // Clean up: resolve the stuck request. The poll loop above guarantees
      // resolveRequest is set; the assignment happens inside the route handler
      // closure, invisible to TypeScript's control-flow analysis.
      const resolve = resolveRequest as unknown as () => void
      resolve()
      await requestPromise
    })

    it('should include correct count in timeout error message', async () => {
      const tracker = createInFlightTracker()
      const resolvers: (() => void)[] = []

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/stuck', async (c) => {
        await new Promise<void>((resolve) => {
          resolvers.push(resolve)
        })
        return c.json({ ok: true })
      })

      // Start multiple requests
      const req1 = app.request('/stuck')
      const req2 = app.request('/stuck')

      // Wait for both to register
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (resolvers.length === 2) {
            clearInterval(interval)
            resolve()
          }
        }, 10)
      })

      expect(tracker.count).toBe(2)

      await expect(tracker.waitForDrain(50)).rejects.toThrow(
        /Drain timeout: 2 requests still in-flight after 50ms/
      )

      // Clean up
      for (const resolve of resolvers) {
        resolve()
      }
      await Promise.all([req1, req2])
    })
  })

  describe('edge cases', () => {
    it('should handle rapid request start and stop', async () => {
      const tracker = createInFlightTracker()

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.get('/fast', (c) => c.json({ ok: true }))

      // Fire many requests sequentially
      for (let i = 0; i < 100; i++) {
        await app.request('/fast')
      }

      expect(tracker.count).toBe(0)
    })

    it('should work with multiple middleware in the chain', async () => {
      const tracker = createInFlightTracker()

      const app = new Hono()
      app.use('*', tracker.middleware())
      app.use('*', async (c, next) => {
        c.header('x-custom', 'value')
        await next()
      })
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      expect(res.headers.get('x-custom')).toBe('value')
      expect(tracker.count).toBe(0)
    })
  })
})

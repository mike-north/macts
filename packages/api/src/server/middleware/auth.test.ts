/**
 * Tests for auth middleware.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, type AuthVariables, type AuthErrorResponse } from './auth.js'

// Mock the validator module
vi.mock('../../keys/validator.js', () => ({
  validateApiKey: vi.fn(),
}))

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('positive cases', () => {
    it('should allow request with valid token', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      const mockPayload = {
        iss: 'macts' as const,
        sub: 'key-123',
        iat: Date.now() / 1000,
        permissions: ['calendar:events:list'],
      }

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        payload: mockPayload,
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => {
        const payload = c.get('apiKeyPayload')
        return c.json({ keyId: payload.sub, permissions: payload.permissions })
      })

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_test',
        },
      })

      expect(res.status).toBe(200)
      expect(validateApiKey).toHaveBeenCalledWith('macts_sk_test')

      const body = (await res.json()) as { keyId: string; permissions: string[] }
      expect(body).toEqual({
        keyId: 'key-123',
        permissions: ['calendar:events:list'],
      })
    })

    it('should set apiKeyPayload in context', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      const mockPayload = {
        iss: 'macts' as const,
        sub: 'key-456',
        iat: Date.now() / 1000,
        permissions: ['reminders:*:*'],
      }

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        payload: mockPayload,
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/protected', (c) => {
        const payload = c.get('apiKeyPayload')
        return c.json({ payload })
      })

      const res = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer macts_sk_valid_token',
        },
      })

      expect(res.status).toBe(200)

      const body = (await res.json()) as { payload: typeof mockPayload }
      expect(body.payload).toEqual(mockPayload)
    })

    it('should proceed to next middleware after validation', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        payload: {
          iss: 'macts',
          sub: 'key-789',
          iat: Date.now() / 1000,
          permissions: ['calendar:app:switchView'],
        },
      })

      let secondMiddlewareRan = false

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.use('/*', async (_c, next) => {
        secondMiddlewareRan = true
        await next()
      })
      app.get('/test', (_c) => _c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_test',
        },
      })

      expect(res.status).toBe(200)
      expect(secondMiddlewareRan).toBe(true)
    })
  })

  describe('negative cases - missing/invalid headers', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('MISSING_AUTHORIZATION')
      expect(body.error.message).toBe('Authorization header is required')
    })

    it('should return 401 for non-Bearer auth scheme', async () => {
      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNz',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_AUTH_SCHEME')
      expect(body.error.message).toBe('Authorization header must use Bearer scheme')
    })

    it('should return 401 for malformed Bearer token', async () => {
      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_AUTH_SCHEME')
      expect(body.error.message).toBe('Authorization header must use Bearer scheme')
    })

    it('should return 401 for Authorization header without Bearer prefix', async () => {
      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'macts_sk_token',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_AUTH_SCHEME')
      expect(body.error.message).toBe('Authorization header must use Bearer scheme')
    })
  })

  describe('negative cases - token validation failures', () => {
    it('should return 401 for expired token', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Token has expired',
        errorCode: 'EXPIRED',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_expired',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('EXPIRED')
      expect(body.error.message).toBe('Token has expired')
    })

    it('should return 401 for revoked token', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Token has been revoked',
        errorCode: 'REVOKED',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_revoked',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('REVOKED')
      expect(body.error.message).toBe('Token has been revoked')
    })

    it('should return 401 for malformed token payload', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Malformed token payload',
        errorCode: 'MALFORMED_PAYLOAD',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_malformed',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('MALFORMED_PAYLOAD')
      expect(body.error.message).toBe('Malformed token payload')
    })

    it('should return 401 for invalid token format', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Invalid token format: must start with macts_sk_',
        errorCode: 'INVALID_FORMAT',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer invalid_token',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_FORMAT')
      expect(body.error.message).toBe('Invalid token format: must start with macts_sk_')
    })

    it('should return 401 for invalid signature', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Invalid token signature',
        errorCode: 'INVALID_SIGNATURE',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_bad_signature',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_SIGNATURE')
      expect(body.error.message).toBe('Invalid token signature')
    })
  })

  describe('edge cases', () => {
    it('should handle validation errors without error message', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        errorCode: 'INVALID_FORMAT',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_test',
        },
      })

      expect(res.status).toBe(401)

      const body = (await res.json()) as AuthErrorResponse
      expect(body.error.code).toBe('INVALID_FORMAT')
      expect(body.error.message).toBe('Token validation failed')
    })

    it('should not proceed to handler when validation fails', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Token has expired',
        errorCode: 'EXPIRED',
      })

      let handlerRan = false

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => {
        handlerRan = true
        return c.json({ ok: true })
      })

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer macts_sk_expired',
        },
      })

      expect(res.status).toBe(401)
      expect(handlerRan).toBe(false)
    })

    it('should handle empty Bearer token', async () => {
      const { validateApiKey } = await import('../../keys/validator.js')

      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Invalid token format',
        errorCode: 'INVALID_FORMAT',
      })

      const app = new Hono<{ Variables: AuthVariables }>()
      app.use('/*', authMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: {
          Authorization: 'Bearer token',
        },
      })

      // "Bearer token" will pass header parsing and call validateApiKey
      expect(res.status).toBe(401)
      expect(validateApiKey).toHaveBeenCalledWith('token')
    })
  })
})

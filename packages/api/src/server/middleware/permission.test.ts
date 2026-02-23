/**
 * Tests for permission middleware.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { ApiKeyPayload } from '@macts/core'
import {
  requirePermission,
  rpcPathToPermission,
  type PermissionErrorResponse,
} from './permission.js'
import type { AuthVariables } from './auth.js'

// Mock the validator module
vi.mock('../../keys/validator.js', () => ({
  checkPayloadPermission: vi.fn(),
}))

describe('rpcPathToPermission', () => {
  describe('positive cases', () => {
    it('should convert RPC path with prefix to permission string', () => {
      expect(rpcPathToPermission('/rpc/calendar.events.list')).toBe('calendar:events:list')
      expect(rpcPathToPermission('/rpc/reminders.lists.create')).toBe('reminders:lists:create')
      expect(rpcPathToPermission('/rpc/calendar.app.switchView')).toBe('calendar:app:switchView')
    })

    it('should handle paths without /rpc/ prefix', () => {
      expect(rpcPathToPermission('calendar.events.list')).toBe('calendar:events:list')
      expect(rpcPathToPermission('testapp.items.get')).toBe('testapp:items:get')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(rpcPathToPermission('')).toBe('')
    })

    it('should handle path with no dots', () => {
      expect(rpcPathToPermission('/rpc/health')).toBe('health')
    })

    it('should handle multiple slashes', () => {
      // The implementation only replaces /^\/rpc\//, so extra slashes remain
      expect(rpcPathToPermission('//rpc//calendar.events.list')).toBe('//rpc//calendar:events:list')
    })
  })
})

describe('requirePermission', () => {
  let mockPayload: ApiKeyPayload

  beforeEach(() => {
    vi.resetAllMocks()

    mockPayload = {
      iss: 'macts',
      sub: 'key-123',
      iat: Date.now() / 1000,
      permissions: ['calendar:events:list', 'calendar:calendars:*'],
    }
  })

  describe('positive cases', () => {
    it('should allow request with valid permission', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:events:list',
        matchedBy: 'calendar:events:list',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      // Simulate auth middleware setting the payload
      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) => {
        return c.json({ success: true })
      })

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      expect(checkPayloadPermission).toHaveBeenCalledWith(
        mockPayload,
        'calendar:events:list',
        undefined
      )

      const body = (await res.json()) as { success: boolean }
      expect(body).toEqual({ success: true })
    })

    it('should allow request with wildcard permission', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:calendars:get',
        matchedBy: 'calendar:calendars:*',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.calendars.get', requirePermission('calendar:calendars:get'), (c) => {
        return c.json({ success: true })
      })

      const res = await app.request('/rpc/calendar.calendars.get', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      expect(checkPayloadPermission).toHaveBeenCalledWith(
        mockPayload,
        'calendar:calendars:get',
        undefined
      )
    })

    it('should proceed to next middleware after permission check', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:events:list',
        matchedBy: 'calendar:events:list',
      })

      let secondMiddlewareRan = false

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.use('/rpc/*', requirePermission('calendar:events:list'))
      app.use('/rpc/*', async (_c, next) => {
        secondMiddlewareRan = true
        await next()
      })

      app.post('/rpc/test', (_c) => _c.json({ ok: true }))

      const res = await app.request('/rpc/test', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      expect(secondMiddlewareRan).toBe(true)
    })

    it('should pass permission history to check function', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      const permissionHistory = [
        {
          version: '2.0.0',
          permission: 'calendar:events:old',
          changed: '2024-01-01',
          reason: 'Renamed for consistency',
        },
      ]

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:events:list',
        matchedBy: 'calendar:events:list',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post(
        '/rpc/calendar.events.list',
        requirePermission('calendar:events:list', { permissionHistory }),
        (c) => c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      expect(checkPayloadPermission).toHaveBeenCalledWith(
        mockPayload,
        'calendar:events:list',
        permissionHistory
      )
    })
  })

  describe('negative cases - missing permission', () => {
    it('should return 403 when permission is denied', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: 'reminders:lists:create',
        hint: 'Missing required permission: reminders:lists:create',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/reminders.lists.create', requirePermission('reminders:lists:create'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/reminders.lists.create', {
        method: 'POST',
      })

      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.code).toBe('PERMISSION_DENIED')
      expect(body.error.required).toBe('reminders:lists:create')
      expect(body.error.message).toBe('Missing required permission: reminders:lists:create')
    })

    it('should not proceed to handler when permission denied', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: 'calendar:events:delete',
      })

      let handlerRan = false

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.events.delete', requirePermission('calendar:events:delete'), (c) => {
        handlerRan = true
        return c.json({ success: true })
      })

      const res = await app.request('/rpc/calendar.events.delete', {
        method: 'POST',
      })

      expect(res.status).toBe(403)
      expect(handlerRan).toBe(false)
    })

    it('should include hint in error response when provided', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: 'calendar:events:create',
        hint: 'You need calendar:events:create permission to create events',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.events.create', requirePermission('calendar:events:create'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.create', {
        method: 'POST',
      })

      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.hint).toBe('You need calendar:events:create permission to create events')
    })

    it('should include changelog in error response when provided', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: 'calendar:events:list',
        hint: 'Permission was renamed in v2.0.0',
        changelog: {
          version: '2.0.0',
          previousPermission: 'calendar:events:old',
          reason: 'Renamed for consistency',
        },
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.changelog).toEqual({
        version: '2.0.0',
        previousPermission: 'calendar:events:old',
        reason: 'Renamed for consistency',
      })
    })
  })

  describe('edge cases', () => {
    it('should return 500 when apiKeyPayload is missing (auth middleware not applied)', async () => {
      const app = new Hono<{ Variables: AuthVariables }>()

      // Don't set the payload - simulating missing auth middleware
      app.post('/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(500)

      const body = (await res.json()) as { error: { code: string; message: string } }
      expect(body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication required but no payload found',
        },
      })
    })

    it('should use default message when hint is not provided', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: 'calendar:app:quit',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/calendar.app.quit', requirePermission('calendar:app:quit'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.app.quit', {
        method: 'POST',
      })

      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.message).toBe('Missing required permission: calendar:app:quit')
    })

    it('should handle empty permission string', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: false,
        required: '',
      })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post('/rpc/test', requirePermission(''), (c) => c.json({ success: true }))

      const res = await app.request('/rpc/test', {
        method: 'POST',
      })

      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.required).toBe('')
    })

    it('should work with multiple permission middleware in chain', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      // First permission check passes
      vi.mocked(checkPayloadPermission)
        .mockReturnValueOnce({
          granted: true,
          required: 'calendar:events:list',
          matchedBy: 'calendar:events:list',
        })
        // Second permission check fails
        .mockReturnValueOnce({
          granted: false,
          required: 'calendar:events:delete',
        })

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', mockPayload)
        await next()
      })

      app.post(
        '/rpc/calendar.events.list',
        requirePermission('calendar:events:list'),
        requirePermission('calendar:events:delete'),
        (c) => c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      // Should fail at second permission check
      expect(res.status).toBe(403)

      const body = (await res.json()) as PermissionErrorResponse
      expect(body.error.required).toBe('calendar:events:delete')
    })
  })

  describe('wildcard permissions', () => {
    it('should accept permission matched by wildcard', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      // Payload has calendar:*:* which should match calendar:events:list
      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:events:list',
        matchedBy: 'calendar:*:*',
      })

      const payloadWithWildcard: ApiKeyPayload = {
        iss: 'macts',
        sub: 'key-456',
        iat: Date.now() / 1000,
        permissions: ['calendar:*:*'],
      }

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', payloadWithWildcard)
        await next()
      })

      app.post('/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      expect(checkPayloadPermission).toHaveBeenCalledWith(
        payloadWithWildcard,
        'calendar:events:list',
        undefined
      )
    })

    it('should accept permission matched by partial wildcard', async () => {
      const { checkPayloadPermission } = await import('../../keys/validator.js')

      // Payload has calendar:events:* which should match calendar:events:list
      vi.mocked(checkPayloadPermission).mockReturnValue({
        granted: true,
        required: 'calendar:events:list',
        matchedBy: 'calendar:events:*',
      })

      const payloadWithPartialWildcard: ApiKeyPayload = {
        iss: 'macts',
        sub: 'key-789',
        iat: Date.now() / 1000,
        permissions: ['calendar:events:*'],
      }

      const app = new Hono<{ Variables: AuthVariables }>()

      app.use('/*', async (c, next) => {
        c.set('apiKeyPayload', payloadWithPartialWildcard)
        await next()
      })

      app.post('/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) =>
        c.json({ success: true })
      )

      const res = await app.request('/rpc/calendar.events.list', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
    })
  })
})

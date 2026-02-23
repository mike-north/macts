/**
 * End-to-end tests for the macts API server.
 *
 * Uses real authentication, permissions, validation, rate limiting,
 * and storage (no mocks). Tests the full middleware stack through
 * the Hono app.request() interface.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { AppManifest } from '@macts/core'

/**
 * Dynamically imported modules that depend on HOME environment.
 * These are re-imported for each test to reset singleton state.
 */
let storage: typeof import('../keys/storage.js')
let generator: typeof import('../keys/generator.js')
let serverModule: typeof import('./index.js')

/** Type aliases for responses */
interface ErrorResponse {
  error: {
    code: string
    message: string
    required?: string
    details?: unknown
  }
}

/** Test manifest with realistic commands */
const testManifest: AppManifest = {
  version: '1.0',
  app: {
    name: 'TestApp',
    bundleId: 'com.test.app',
    version: '1.0.0',
    tccEntitlements: ['calendar'],
  },
  resources: {
    Item: {
      name: 'Item',
      plural: 'items',
      description: 'A test item',
      properties: {
        id: { access: 'r', type: 'string', description: 'ID', optional: false },
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
    },
  },
  hierarchy: {
    children: {
      items: { resource: 'Item', access: 'rw' },
    },
  },
  commands: {
    list: {
      name: 'list',
      description: 'List items',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [],
      returns: 'Item[]',
      permission: 'testapp:items:list',
    },
    get: {
      name: 'get',
      description: 'Get an item by ID',
      scope: 'resource',
      resourceType: 'Item',
      parameters: [{ name: 'id', type: 'string', description: 'Item ID', required: true }],
      returns: 'Item',
      permission: 'testapp:items:get',
    },
    quit: {
      name: 'quit',
      description: 'Quit the application',
      scope: 'application',
      parameters: [],
      permission: 'testapp:app:quit',
    },
  },
  enums: {},
  suites: [],
  relationships: [],
}

describe('E2E: API Server', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalEnvSecret: string | undefined

  beforeEach(async () => {
    // Create isolated temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-e2e-test-'))

    // Override HOME so storage uses temp directory
    originalHome = process.env['HOME']
    originalEnvSecret = process.env['MACTS_API_KEY_SECRET']
    process.env['HOME'] = tempDir

    // Set a known signing secret for deterministic key generation
    process.env['MACTS_API_KEY_SECRET'] = 'test-secret-for-e2e-tests-must-be-32-chars!!'

    // Reset all module singletons (database, cached secret, etc.)
    vi.resetModules()

    // Re-import modules to pick up new HOME / secret
    storage = await import('../keys/storage.js')
    generator = await import('../keys/generator.js')
    serverModule = await import('./index.js')
  })

  afterEach(() => {
    // Close database before restoring env
    storage.closeDatabase()

    // Restore environment
    process.env['HOME'] = originalHome
    if (originalEnvSecret !== undefined) {
      process.env['MACTS_API_KEY_SECRET'] = originalEnvSecret
    } else {
      delete process.env['MACTS_API_KEY_SECRET']
    }

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('authentication flow', () => {
    it('should authenticate with a valid API key and reach the endpoint', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-auth-test',
        permissions: ['testapp:items:list'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // Should pass auth and permission checks.
      // Will return 500 because JXA execution doesn't work in tests,
      // but the point is it got past auth (not 401) and permissions (not 403).
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(403)
    })

    it('should reject requests without authorization header', async () => {
      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('MISSING_AUTHORIZATION')
    })

    it('should reject requests with a tampered token', async () => {
      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer macts_sk_this.is.not.a.valid.jwt',
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('permission denied', () => {
    it('should return 403 when key lacks required permission', async () => {
      // Create key with only list permission
      const { token } = await generator.createApiKey({
        name: 'e2e-limited-key',
        permissions: ['testapp:items:list'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      // Try to access an endpoint requiring a different permission
      const res = await app.request('/api/v1/rpc/testapp.app.quit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(403)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('PERMISSION_DENIED')
      expect(body.error.required).toBe('testapp:app:quit')
    })

    it('should allow access when key has the required permission', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-full-key',
        permissions: ['testapp:app:quit'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.app.quit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // Should pass auth and permission -- 500 from JXA is expected
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(403)
    })
  })

  describe('rate limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-rate-limit-key',
        permissions: ['testapp:items:list'],
      })

      // Create server with very low rate limit
      const { app } = serverModule.createMultiServer([testManifest], {
        cors: false,
        logging: false,
        rateLimit: { max: 2, windowMs: 60_000 },
      })

      const makeRequest = () =>
        app.request('/api/v1/rpc/testapp.items.list', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

      // First two requests should not be rate limited
      const res1 = await makeRequest()
      expect(res1.status).not.toBe(429)

      const res2 = await makeRequest()
      expect(res2.status).not.toBe(429)

      // Third request should be rate limited
      const res3 = await makeRequest()
      expect(res3.status).toBe(429)

      const body = (await res3.json()) as ErrorResponse
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(res3.headers.get('Retry-After')).toBeTruthy()
    })

    it('should allow requests when rate limiting is disabled', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-no-rate-limit-key',
        permissions: ['testapp:items:list'],
      })

      const { app } = serverModule.createMultiServer([testManifest], {
        cors: false,
        logging: false,
        rateLimit: false,
      })

      const makeRequest = () =>
        app.request('/api/v1/rpc/testapp.items.list', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

      // Should never get 429 regardless of request count
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest()
        expect(res.status).not.toBe(429)
      }
    })
  })

  describe('key revocation', () => {
    it('should reject requests with a revoked key', async () => {
      const { token, metadata } = await generator.createApiKey({
        name: 'e2e-revoke-key',
        permissions: ['testapp:items:list'],
      })

      // Revoke the key before making any requests
      // (avoids revocation cache interference)
      const revoked = storage.revokeKey(metadata.id)
      expect(revoked).toBe(true)

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(401)

      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('REVOKED')
    })

    it('should allow requests with a non-revoked key', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-active-key',
        permissions: ['testapp:items:list'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // Should pass auth -- 500 from JXA execution is expected
      expect(res.status).not.toBe(401)
    })
  })

  describe('request validation', () => {
    it('should return 400 for invalid JSON body', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-validation-key',
        permissions: ['testapp:items:get'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1/rpc/testapp.items.get', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: 'not valid json {{{',
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('INVALID_REQUEST')
    })

    it('should return 400 VALIDATION_ERROR for missing required parameter', async () => {
      const { token } = await generator.createApiKey({
        name: 'e2e-missing-param-key',
        permissions: ['testapp:items:get'],
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      // The 'get' command requires an 'id' parameter
      const res = await app.request('/api/v1/rpc/testapp.items.get', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('Request validation failed')
    })
  })

  describe('unauthenticated endpoints', () => {
    it('should serve health endpoint without auth', async () => {
      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/health')
      expect(res.status).toBe(200)

      const body = (await res.json()) as { status: string; apps: string[] }
      expect(body.status).toBe('ok')
      expect(body.apps).toEqual(['TestApp'])
    })

    it('should serve API info endpoint without auth', async () => {
      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      const res = await app.request('/api/v1')
      expect(res.status).toBe(200)

      const body = (await res.json()) as { name: string; apps: { name: string }[] }
      expect(body.name).toBe('macts API')
      expect(body.apps).toEqual([{ name: 'TestApp', bundleId: 'com.test.app' }])
    })
  })

  describe('key expiration', () => {
    it('should reject expired keys', async () => {
      // Create key that expires in 1 second
      const { token } = await generator.createApiKey({
        name: 'e2e-expiring-key',
        permissions: ['testapp:items:list'],
        expires: '1s',
      })

      const app = serverModule.createApp([testManifest], {
        cors: false,
        logging: false,
      })

      // Wait for expiration
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1500)
      })

      const res = await app.request('/api/v1/rpc/testapp.items.list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('EXPIRED')
    })
  })
})

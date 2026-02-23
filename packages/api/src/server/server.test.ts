import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppManifest } from '@macts/core'
import { createApp } from './index.js'
import { rpcPathToPermission } from './middleware/permission.js'

// Type for error responses
interface ErrorResponse {
  error: {
    code: string
    message: string
    required?: string
  }
}

// Mock the validator module
vi.mock('../keys/validator.js', () => ({
  validateApiKey: vi.fn(),
  checkPayloadPermission: vi.fn(),
}))

// Sample manifest for testing
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
    switchView: {
      name: 'switchView',
      description: 'Switch the app view',
      scope: 'application',
      parameters: [{ name: 'view', type: 'string', description: 'View name', required: true }],
      permission: 'testapp:app:switchView',
    },
  },
  enums: {},
  suites: [],
  relationships: [],
}

describe('rpcPathToPermission', () => {
  it('converts RPC path to permission string', () => {
    expect(rpcPathToPermission('/rpc/calendar.events.list')).toBe('calendar:events:list')
    expect(rpcPathToPermission('/rpc/calendar.app.switchView')).toBe('calendar:app:switchView')
    expect(rpcPathToPermission('/rpc/reminders.lists.create')).toBe('reminders:lists:create')
  })

  it('handles paths without /rpc/ prefix', () => {
    expect(rpcPathToPermission('calendar.events.list')).toBe('calendar:events:list')
  })
})

describe('createApp', () => {
  it('creates a Hono app with health endpoint', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/health')
    expect(res.status).toBe(200)

    const body = (await res.json()) as { status: string; version: string; apps: string[] }
    expect(body).toEqual({
      status: 'ok',
      version: '1.0.0',
      apps: ['TestApp'],
    })
  })

  it('creates a Hono app with API info endpoint', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1')
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      name: string
      version: string
      apps: { name: string; bundleId: string }[]
    }
    expect(body).toMatchObject({
      name: 'macts API',
      version: 'v1',
      apps: [{ name: 'TestApp', bundleId: 'com.test.app' }],
    })
  })

  it('returns 401 for RPC endpoints without auth', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
    })

    expect(res.status).toBe(401)

    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('MISSING_AUTHORIZATION')
  })

  it('returns 401 for invalid auth scheme', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
      headers: {
        Authorization: 'Basic dXNlcjpwYXNz',
      },
    })

    expect(res.status).toBe(401)

    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('INVALID_AUTH_SCHEME')
  })

  it('returns 404 for unknown routes', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/unknown/path')
    expect(res.status).toBe(404)

    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('RPC endpoints', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('generates correct endpoint paths from manifest', async () => {
    const app = createApp([testManifest], { cors: false, logging: false })

    // Resource-scoped command should be at /rpc/{app}.{resource}.{command}
    const listRes = await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
    })
    // Should return 401 (needs auth) not 404
    expect(listRes.status).toBe(401)

    // App-scoped command should be at /rpc/{app}.app.{command}
    const switchRes = await app.request('/api/v1/rpc/testapp.app.switchView', {
      method: 'POST',
    })
    // Should return 401 (needs auth) not 404
    expect(switchRes.status).toBe(401)
  })

  it('exposes introspection endpoint', async () => {
    const { validateApiKey } = await import('../keys/validator.js')
    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      payload: {
        iss: 'macts',
        sub: 'key-123',
        iat: Date.now() / 1000,
        permissions: ['testapp:*:*'],
      },
    })

    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1/introspect', {
      headers: {
        Authorization: 'Bearer macts_sk_test',
      },
    })

    expect(res.status).toBe(200)

    const body = (await res.json()) as { app: string; bundleId: string; endpoints: unknown[] }
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.arrayContaining returns any */
    expect(body).toMatchObject({
      app: 'TestApp',
      bundleId: 'com.test.app',
      endpoints: expect.arrayContaining([
        expect.objectContaining({
          path: '/rpc/testapp.items.list',
          permission: 'testapp:items:list',
          method: 'POST',
        }),
        expect.objectContaining({
          path: '/rpc/testapp.app.switchView',
          permission: 'testapp:app:switchView',
          method: 'POST',
        }),
      ]),
    })
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  })
})

describe('auth middleware integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('allows requests with valid API key', async () => {
    const { validateApiKey, checkPayloadPermission } = await import('../keys/validator.js')

    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      payload: {
        iss: 'macts',
        sub: 'key-123',
        iat: Date.now() / 1000,
        permissions: ['testapp:items:list'],
      },
    })

    vi.mocked(checkPayloadPermission).mockReturnValue({
      granted: true,
      required: 'testapp:items:list',
      matchedBy: 'testapp:items:list',
    })

    const app = createApp([testManifest], { cors: false, logging: false })

    // Make the request - will fail with 500 because JXA won't actually execute in tests
    // But the auth and permission checks should pass
    await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer macts_sk_test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    expect(validateApiKey).toHaveBeenCalledWith('macts_sk_test')
    expect(checkPayloadPermission).toHaveBeenCalled()
  })

  it('rejects requests with invalid API key', async () => {
    const { validateApiKey } = await import('../keys/validator.js')

    vi.mocked(validateApiKey).mockResolvedValue({
      valid: false,
      error: 'Invalid token signature',
      errorCode: 'INVALID_SIGNATURE',
    })

    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer macts_sk_invalid',
      },
    })

    expect(res.status).toBe(401)

    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('INVALID_SIGNATURE')
  })

  it('rejects requests without required permission', async () => {
    const { validateApiKey, checkPayloadPermission } = await import('../keys/validator.js')

    vi.mocked(validateApiKey).mockResolvedValue({
      valid: true,
      payload: {
        iss: 'macts',
        sub: 'key-123',
        iat: Date.now() / 1000,
        permissions: ['testapp:calendars:list'], // Different permission
      },
    })

    vi.mocked(checkPayloadPermission).mockReturnValue({
      granted: false,
      required: 'testapp:items:list',
      hint: 'Missing required permission: testapp:items:list',
    })

    const app = createApp([testManifest], { cors: false, logging: false })

    const res = await app.request('/api/v1/rpc/testapp.items.list', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer macts_sk_test',
      },
    })

    expect(res.status).toBe(403)

    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.required).toBe('testapp:items:list')
  })
})

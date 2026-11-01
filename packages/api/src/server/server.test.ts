/**
 * Tests for the server composition around the adapter: the unauthenticated
 * endpoints, route registration, and the app-level fallbacks.
 *
 * The executor and verifier are injected through `ServerOptions`, so no Mac
 * app or key store is needed. Expected envelopes follow phases/13 D6.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D6)
 */

import { afterEach, describe, expect, it } from 'vitest'
import pino from 'pino'
import type { AppManifest } from '@macts/core'
import { createLogger, setLogger } from '@macts/runtime'
import { createApp, createMultiServer, createServer } from './index.js'
import {
  createFakeVerifier,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  post,
} from './test-helpers.js'

const TOKEN = 'macts_sk_testapp-token'

/** A manifest with a resource command and an application command. */
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

/** A server over {@link testManifest} whose token holds `permissions`. */
function testApp(permissions: string[]): ReturnType<typeof createTestServer> {
  return createTestServer({
    manifests: [testManifest],
    verifier: createFakeVerifier({ [TOKEN]: { subject: 'key-123', permissions } }),
  })
}

describe('unauthenticated endpoints', () => {
  it('serves /api/v1 with the served apps', async () => {
    const { app } = testApp([])

    const res = await app.request('/api/v1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      name: 'macts API',
      version: 'v1',
      documentation: 'https://github.com/macts/macts',
      apps: [{ name: 'TestApp', bundleId: 'com.test.app' }],
    })
  })

  it('serves /health with the served app names', async () => {
    const { app } = testApp([])

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; apps: string[] }
    expect(body.status).toBe('ok')
    expect(body.apps).toEqual(['TestApp'])
  })
})

describe('operation routes', () => {
  it('registers resource commands at app.resource.command and app commands at app.app.command', async () => {
    const { app } = testApp([])

    // Without a credential each answers 401 (it exists), not 404.
    expect((await post(app, 'testapp.items.list')).status).toBe(401)
    expect((await post(app, 'testapp.app.switchView')).status).toBe(401)
  })

  it('runs an authorized call through the injected executor', async () => {
    const { app, executor } = testApp(['testapp:items:list'])

    const res = await post(app, 'testapp.items.list', {}, TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests[0]?.target).toEqual({ command: 'list', resource: 'Item' })
  })

  it('rejects a call without the required permission', async () => {
    const { app, executor } = testApp(['testapp:calendars:list'])

    const res = await post(app, 'testapp.items.list', {}, TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details).toMatchObject({ required: 'testapp:items:list' })
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects an unrecognized credential with 401 UNAUTHENTICATED', async () => {
    const { app } = testApp([])

    const res = await post(app, 'testapp.items.list', {}, 'macts_sk_invalid')

    expect(res.status).toBe(401)
    expect((await errorBody(res)).error).toMatchObject({
      code: 'UNAUTHENTICATED',
      details: { reason: 'invalid' },
    })
  })

  it('serves the same routes from createServer and createMultiServer', async () => {
    const options = {
      cors: false,
      executor: createRecordingExecutor(),
      verifier: createFakeVerifier({ [TOKEN]: { subject: 'k', permissions: ['testapp:*:*'] } }),
    }
    const single = createServer(testManifest, options).app
    const multi = createMultiServer([testManifest], options).app

    expect((await post(single, 'testapp.items.list', {}, TOKEN)).status).toBe(200)
    expect((await post(multi, 'testapp.items.list', {}, TOKEN)).status).toBe(200)
  })
})

describe('app-level fallbacks', () => {
  afterEach(() => {
    setLogger(createLogger())
  })

  it('answers an unexpected server failure with a generic 500 INTERNAL envelope', async () => {
    // Request logging writes through a logger whose destination throws, so the
    // failure happens in server middleware, outside any operation handler.
    const failing = pino(
      { level: 'info' },
      {
        write: () => {
          throw new Error('disk on fire')
        },
      }
    )
    const app = createApp([testManifest], {
      cors: false,
      logging: true,
      logger: failing,
      executor: createRecordingExecutor(),
    })

    const res = await app.request('/health')

    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('disk on fire')
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error', details: {} },
    })
  })
})

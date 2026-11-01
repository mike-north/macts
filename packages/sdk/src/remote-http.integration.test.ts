/**
 * Integration: the remote client through the real HTTP stack.
 *
 * The client talks to the real `@macts/api` app (its adapter, runtime,
 * key-store verifier, permission check, and governance) through the app's own
 * `fetch`, so the request and response bytes are exactly what the service
 * produces. Only the executor is a recording stub. Keys are real, minted with
 * the runtime's key helpers in a temporary `MACTS_HOME`.
 *
 * Expected outcomes are hand-written from phases/13 D5 (the service runs the
 * full pipeline) and D6 (the client reconstructs the class from the envelope's
 * code): a success decodes, a missing permission is `PermissionDeniedError`
 * with `details.required`, and an executor `TargetNotFoundError` reaches the
 * caller as `TargetNotFoundError`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 */

import { inspect } from 'node:util'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import { MactsError, PermissionDeniedError, TargetNotFoundError } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './remote.js'
import {
  FIXTURE_MANIFEST,
  createRecordingExecutor,
  fixtureContract,
  rejection,
  type FixtureClient,
  type RecordingExecutor,
} from './test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-remote-http-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

// Denied calls log to the process-wide logger; keep expected failures quiet.
setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** A fixture client whose requests are served by the real API app over `executor`. */
function clientOverApi(token: string, executor: RecordingExecutor): FixtureClient {
  const app = createApp([FIXTURE_MANIFEST], {
    cors: false,
    prettyJson: false,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
  })
  const fetch: typeof globalThis.fetch = async (input, init) => app.fetch(new Request(input, init))
  return createClient(fixtureContract(), { token, url: 'http://macts.test', fetch })
}

describe('remote client over the real HTTP adapter and runtime', () => {
  it('runs a permitted call and decodes the service result', async () => {
    const { token } = await createApiKey({ name: 'Remote', permissions: ['fixture:widgets:get'] })
    const executor = createRecordingExecutor()

    const widget = await clientOverApi(token, executor).widgets.get('w-1')

    expect(widget).toEqual({ name: 'Sprocket', count: 7 })
    expect(executor.requests).toHaveLength(1)
    expect(executor.requests[0]?.input).toEqual({ id: 'w-1' })
    expect(executor.requests[0]?.target).toEqual({ command: 'get', resource: 'Widget' })
  })

  it('reconstructs a 403 permission denial as PermissionDeniedError naming the permission', async () => {
    const { token } = await createApiKey({ name: 'Lister', permissions: ['fixture:widgets:list'] })
    const executor = createRecordingExecutor()

    const error = await rejection(clientOverApi(token, executor).widgets.get('w-1'))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(error).toMatchObject({
      code: 'PERMISSION_DENIED',
      details: { required: 'fixture:widgets:get' },
    })
    expect(executor.requests).toHaveLength(0)
    expect(inspect(error, { depth: Infinity })).not.toContain(token)
  })

  it('delivers an executor TargetNotFoundError to the caller as TargetNotFoundError', async () => {
    const { token } = await createApiKey({ name: 'Getter', permissions: ['fixture:widgets:get'] })
    const executor = createRecordingExecutor(() =>
      Promise.reject(new TargetNotFoundError('No such widget.', { resource: 'Widget' }))
    )

    const error = await rejection(clientOverApi(token, executor).widgets.get('w-404'))

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect(error).toBeInstanceOf(MactsError)
    expect(error).toMatchObject({ message: 'No such widget.', details: { resource: 'Widget' } })
    expect(inspect(error, { depth: Infinity })).not.toContain(token)
  })
})

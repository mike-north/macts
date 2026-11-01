/**
 * User-acceptance tests for the remote client against a real network listener.
 *
 * The macts API app is served by `@hono/node-server` on an ephemeral loopback
 * port, and the client reaches it with the global `fetch`, exactly as an
 * application on another machine would. Nothing is called in process: request
 * and response bytes cross a real socket. The app is the real one (adapter,
 * runtime, key-store verifier, permission check, rate limiter, governance);
 * only the executor is a recording stub. Keys are real, minted in a temporary
 * `MACTS_HOME`.
 *
 * Expected outcomes are written by hand from phases/13 D5 (the service runs
 * the full pipeline), D6 (the client rebuilds the class from the envelope's
 * code, and an unreachable service is `TransportError`), and the error
 * registry's details:
 *
 * - 200: the result decodes through the output contract.
 * - 403 `PERMISSION_DENIED`: `details.required` is the operation's permission,
 *   and `details.hint` names it together with its resource wildcard.
 * - 429 `RATE_LIMITED`: `details.retryAfterSeconds` matches the `Retry-After`
 *   header. A window that opens at the fixed instant lasts its full 60
 *   seconds.
 * - Connection refused: `TransportError` with `reason: 'unreachable'`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 * @see https://hono.dev/docs/getting-started/nodejs
 * @see https://www.rfc-editor.org/rfc/rfc9110#field.retry-after
 */

import type { AddressInfo } from 'node:net'
import { inspect } from 'node:util'
import { serve, type ServerType } from '@hono/node-server'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, type AppOptions } from '@macts/api/server'
import {
  PermissionDeniedError,
  RateLimitedError,
  TransportError,
  type WireValue,
} from '@macts/contracts'
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
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-remote-listener-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

// Denied calls log to the process-wide logger; keep expected failures quiet.
setLogger(createLogger({ level: 'silent' }))

/** A fixed clock: every rate-limit window opens at this instant. */
const fixedClock = (): Date => new Date('2026-01-15T10:00:00.000Z')

const openServers: ServerType[] = []

afterEach(async () => {
  await Promise.all(openServers.splice(0).map(close))
})

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** Close a listener, dropping keep-alive connections so the close can finish. */
function close(server: ServerType): Promise<void> {
  return new Promise((resolve) => {
    if ('closeAllConnections' in server) server.closeAllConnections()
    server.close(() => {
      resolve()
    })
  })
}

/** Start a listener on an ephemeral 127.0.0.1 port and return it with its base URL. */
async function listen(fetch: (request: Request) => Response | Promise<Response>): Promise<{
  server: ServerType
  url: string
}> {
  const server = await new Promise<ServerType>((resolve) => {
    const started = serve({ fetch, port: 0, hostname: '127.0.0.1' }, () => {
      resolve(started)
    })
  })
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${String(port)}` }
}

/** The real macts API app on a real listener, with a recording executor. */
async function serveApi(
  executor: RecordingExecutor,
  options: Pick<AppOptions, 'rateLimit'> = {}
): Promise<string> {
  const app = createApp([FIXTURE_MANIFEST], {
    cors: false,
    prettyJson: false,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
    ...options,
  })
  const { server, url } = await listen(app.fetch)
  openServers.push(server)
  return url
}

/** The status and headers of each response the client received, in order. */
interface Observed {
  readonly status: number
  readonly headers: Headers
}

/** A fixture client over the global `fetch`, recording each response's status and headers. */
function remoteClient(token: string, url: string): { client: FixtureClient; seen: Observed[] } {
  const seen: Observed[] = []
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init)
    seen.push({ status: response.status, headers: response.headers })
    return response
  }
  return { client: createClient(fixtureContract(), { token, url, fetch }), seen }
}

describe('remote client over a real listener', () => {
  it('runs a permitted call over the socket and decodes the 200 result', async () => {
    const { token } = await createApiKey({ name: 'Getter', permissions: ['fixture:widgets:get'] })
    // D3: the integer travels as the control record {"integer":"3"}.
    const result: WireValue = { name: 'Sprocket', count: { integer: '3' } }
    const executor = createRecordingExecutor(() => Promise.resolve(result))
    const { client, seen } = remoteClient(token, await serveApi(executor))

    const widget = await client.widgets.get('w-1')

    expect(seen.map((response) => response.status)).toEqual([200])
    expect(widget).toEqual({ name: 'Sprocket', count: 3 })
    expect(executor.requests).toHaveLength(1)
  })

  it('rebuilds a 403 as PermissionDeniedError with the required permission and a hint', async () => {
    const { token } = await createApiKey({ name: 'Lister', permissions: ['fixture:widgets:list'] })
    const executor = createRecordingExecutor()
    const { client, seen } = remoteClient(token, await serveApi(executor))

    const error = await rejection(client.widgets.get('w-1'))

    expect(seen.map((response) => response.status)).toEqual([403])
    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(error).toMatchObject({
      code: 'PERMISSION_DENIED',
      details: {
        required: 'fixture:widgets:get',
        hint:
          'Missing required permission "fixture:widgets:get". Grant "fixture:widgets:get" ' +
          '(or the resource wildcard "fixture:widgets:*") to authorize this call.',
      },
    })
    expect(executor.requests).toHaveLength(0)
    expect(inspect(error, { depth: Infinity })).not.toContain(token)
  })

  it('rebuilds a 429 as RateLimitedError whose retryAfterSeconds matches Retry-After', async () => {
    const { token } = await createApiKey({ name: 'Busy', permissions: ['fixture:widgets:get'] })
    const executor = createRecordingExecutor(() =>
      Promise.resolve({ name: 'Sprocket', count: { integer: '1' } })
    )
    const url = await serveApi(executor, { rateLimit: { max: 2, clock: fixedClock } })
    const { client, seen } = remoteClient(token, url)

    await client.widgets.get('w-1')
    await client.widgets.get('w-1')
    const error = await rejection(client.widgets.get('w-1'))

    expect(seen.map((response) => response.status)).toEqual([200, 200, 429])
    expect(seen[2]?.headers.get('Retry-After')).toBe('60')
    expect(error).toBeInstanceOf(RateLimitedError)
    expect(error).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSeconds: 60 } })
    expect(executor.requests).toHaveLength(2)
  })

  it('reports a refused connection as TransportError, without the token', async () => {
    const { token } = await createApiKey({ name: 'Nowhere', permissions: ['fixture:widgets:get'] })
    // A port that was just listening and is now closed refuses connections.
    const { server, url } = await listen(() => new Response(null, { status: 204 }))
    await close(server)
    const { client, seen } = remoteClient(token, url)

    const error = await rejection(client.widgets.get('w-1'))

    expect(seen).toEqual([])
    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({ details: { reason: 'unreachable' } })
    expect(inspect(error, { depth: Infinity })).not.toContain(token)
  })
})

/**
 * User-acceptance tests for the HTTP API over a real network listener.
 *
 * Every other server test calls `app.request(...)` in process, where no socket
 * exists. These tests start an actual `@hono/node-server` listener on an
 * ephemeral loopback port and drive it with `fetch`, so they cover what an
 * in-process call cannot: the real peer address reaching the per-address limit,
 * and a client disconnect reaching the executor as an abort. The executor is a
 * recording stub (no app runs) and credentials come from a fake verifier.
 *
 * Expected statuses, codes, and details are written by hand from the error
 * registry and the phases/13 D6 table:
 *
 * - 200 `{ result }` with wire values
 * - 401 `UNAUTHENTICATED` with `WWW-Authenticate: Bearer`, 403
 *   `PERMISSION_DENIED` (`required`), 404 `NOT_FOUND`
 * - 429 `RATE_LIMITED` with `Retry-After` and `retryAfterSeconds`
 *
 * Time is fixed by the rate limiters' injected clock, so `Retry-After` is exact:
 * a window that opens at the fixed instant lasts the full 60 seconds.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 * @see https://www.rfc-editor.org/rfc/rfc7235#section-4.1
 * @see https://www.rfc-editor.org/rfc/rfc6750#section-3
 * @see https://hono.dev/docs/getting-started/nodejs
 */

import { Hono } from 'hono'
import pino from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import { OperationCancelledError, type WireValue } from '@macts/contracts'
import { createRateLimiter, createRuntime, type RateLimiter } from '@macts/runtime'
import { createHttpAdapter } from './adapter.js'
import {
  CALENDAR_MANIFEST,
  READER_TOKEN,
  WRITER_TOKEN,
  createFakeVerifier,
  createListenerPool,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  type Listener,
  type RecordingExecutor,
} from './test-helpers.js'
import type { AppOptions } from './index.js'

/** A fixed clock: every window opens at this instant. */
const fixedClock = (): Date => new Date('2026-01-15T10:00:00.000Z')

/** The loopback spellings a socket peer can have, depending on the host's IPv6 setup. */
const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

const listeners = createListenerPool()

afterEach(() => listeners.closeAll())

/** Serve `app` on an ephemeral 127.0.0.1 port. */
function listen(app: Hono): Promise<Listener> {
  return listeners.listen(app)
}

/** The full macts server app on a real listener. */
async function listenServer(
  options: Omit<AppOptions, 'executor' | 'verifier'> & {
    executor?: RecordingExecutor
  } = {}
): Promise<Listener & { executor: RecordingExecutor }> {
  const { app, executor } = createTestServer(options)
  return { ...(await listen(app)), executor }
}

/** POST to an operation over the socket. */
function rpc(
  listener: Listener,
  id: string,
  token?: string,
  init: { body?: unknown; signal?: AbortSignal } = {}
): Promise<Response> {
  return fetch(`${listener.url}/api/v1/rpc/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(init.body ?? {}),
    ...(init.signal === undefined ? {} : { signal: init.signal }),
  })
}

describe('HTTP listener: responses over a real socket', () => {
  it('answers 200 { result } carrying wire values through the round trip', async () => {
    const result: WireValue = {
      events: [
        {
          summary: 'Standup',
          // phases/13 D2 wire controls: date, integer, double, record.
          start: { date: '2026-10-31T17:04:05.120Z' },
          attendees: { integer: '3' },
          score: { double: 0.5 },
          extra: { record: { nested: { date: '2026-11-01T00:00:00.000Z' } } },
        },
      ],
    }
    const executor = createRecordingExecutor(() => Promise.resolve(result))
    const listener = await listenServer({ executor })

    const res = await rpc(listener, 'calendar.events.list', READER_TOKEN)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ result })
    expect(executor.requests).toHaveLength(1)
  })

  it('answers 401 UNAUTHENTICATED in the error envelope for a missing bearer', async () => {
    const listener = await listenServer()

    const res = await rpc(listener, 'calendar.events.list')

    expect(res.status).toBe(401)
    // RFC 7235 §4.1: a 401 carries a challenge; RFC 6750 §3 names the scheme.
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
    expect(await res.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication failed: missing',
        details: { reason: 'missing' },
      },
    })
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('answers 401 UNAUTHENTICATED for an unrecognized bearer, without echoing it', async () => {
    const listener = await listenServer()

    const res = await rpc(listener, 'calendar.events.list', 'macts_sk_not-a-real-key')

    expect(res.status).toBe(401)
    const body = await errorBody(res)
    expect(body.error.code).toBe('UNAUTHENTICATED')
    expect(body.error.details).toEqual({ reason: 'invalid' })
    expect(JSON.stringify(body)).not.toContain('macts_sk_not-a-real-key')
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('answers 403 PERMISSION_DENIED naming the operation permission', async () => {
    const listener = await listenServer()

    // READER holds only calendar:events:list; create requires its own permission.
    const res = await rpc(listener, 'calendar.events.create', READER_TOKEN, {
      body: { summary: 'Standup' },
    })

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details).toMatchObject({ required: 'calendar:events:create' })
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('answers 404 NOT_FOUND for an unknown operation route, never reaching the executor', async () => {
    const listener = await listenServer()

    const res = await rpc(listener, 'calendar.events.nope', WRITER_TOKEN)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No such route.', details: {} },
    })
    expect(listener.executor.requests).toHaveLength(0)
  })
})

describe('HTTP listener: rate limits over a real socket', () => {
  it('answers 429 RATE_LIMITED with Retry-After for the per-key limit', async () => {
    const listener = await listenServer({ rateLimit: { max: 2, clock: fixedClock } })

    expect((await rpc(listener, 'calendar.events.list', READER_TOKEN)).status).toBe(200)
    expect((await rpc(listener, 'calendar.events.list', READER_TOKEN)).status).toBe(200)
    const limited = await rpc(listener, 'calendar.events.list', READER_TOKEN)

    expect(limited.status).toBe(429)
    // The window opened at the fixed instant and lasts 60 000 ms.
    expect(limited.headers.get('Retry-After')).toBe('60')
    expect(await limited.json()).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Try again in 60 seconds.',
        details: { retryAfterSeconds: 60 },
      },
    })
    expect(listener.executor.requests).toHaveLength(2)
  })

  it('answers 429 rather than 401 once the per-address limit is spent, before authentication', async () => {
    // The address limit applies before the credential is examined, so it can
    // only turn unauthenticated requests away if it knows the socket's address.
    // An undefined address would leave the limiter off and answer 401 forever.
    const listener = await listenServer({
      rateLimit: { max: 1_000, perAddress: { max: 2, clock: fixedClock } },
    })

    expect((await rpc(listener, 'calendar.events.list', 'macts_sk_guess')).status).toBe(401)
    expect((await rpc(listener, 'calendar.events.list', 'macts_sk_guess')).status).toBe(401)
    const limited = await rpc(listener, 'calendar.events.list', 'macts_sk_guess')

    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    const body = await errorBody(limited)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(body.error.details).toEqual({ retryAfterSeconds: 60 })
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('keys the per-address limiter on the socket peer address', async () => {
    const keys: string[] = []
    const inner = createRateLimiter({ max: 1_000, clock: fixedClock })
    const spy: RateLimiter = {
      admit(key) {
        keys.push(key)
        return inner.admit(key)
      },
    }
    const runtime = createRuntime({
      executor: createRecordingExecutor(),
      verifier: createFakeVerifier(),
      governance: { policy: { version: '1', defaultDisposition: 'allowed', apps: [], tags: [] } },
    })
    runtime.registerManifest(CALENDAR_MANIFEST)
    const listener = await listen(
      new Hono().route('/api/v1', createHttpAdapter(runtime, { addressRateLimiter: spy }))
    )

    const res = await rpc(listener, 'calendar.events.list', READER_TOKEN)

    expect(res.status).toBe(200)
    expect(keys).toHaveLength(1)
    expect(LOOPBACK_ADDRESSES).toContain(keys[0])
  })
})

describe('HTTP listener: client disconnect', () => {
  it('aborts the executor signal and classifies the call as cancelled, not a server error', async () => {
    let signalSeen: AbortSignal | undefined
    let entered!: () => void
    const executorEntered = new Promise<void>((resolve) => {
      entered = resolve
    })
    const executor = createRecordingExecutor((request) => {
      const { signal } = request
      signalSeen = signal
      entered()
      return new Promise<WireValue>((_resolve, reject) => {
        if (signal === undefined) {
          reject(new Error('The adapter passed no abort signal.'))
          return
        }
        signal.addEventListener(
          'abort',
          () => {
            reject(new OperationCancelledError('The operation was cancelled.', {}))
          },
          { once: true }
        )
      })
    })

    // The adapter logs `Request cancelled by the caller` only for a CANCELLED
    // structured error; that line is the observable proof of the classification.
    const entries: Record<string, unknown>[] = []
    let cancelledLogged!: () => void
    const cancelledLine = new Promise<void>((resolve) => {
      cancelledLogged = resolve
    })
    const logger = pino(
      { level: 'trace' },
      {
        write(line: string) {
          const entry = JSON.parse(line) as Record<string, unknown>
          entries.push(entry)
          if (entry['msg'] === 'Request cancelled by the caller') cancelledLogged()
        },
      }
    )
    const runtime = createRuntime({
      executor,
      verifier: createFakeVerifier(),
      governance: { policy: { version: '1', defaultDisposition: 'allowed', apps: [], tags: [] } },
      logger,
    })
    runtime.registerManifest(CALENDAR_MANIFEST)
    const listener = await listen(
      new Hono().route('/api/v1', createHttpAdapter(runtime, { logger, addressRateLimiter: false }))
    )

    const controller = new AbortController()
    const pending = rpc(listener, 'calendar.events.list', READER_TOKEN, {
      signal: controller.signal,
    })
    const outcome = pending.then(
      () => 'responded',
      () => 'aborted'
    )
    await executorEntered
    expect(signalSeen?.aborted).toBe(false)

    controller.abort()
    expect(await outcome).toBe('aborted')
    await cancelledLine

    expect(signalSeen?.aborted).toBe(true)
    expect(entries.filter((entry) => entry['level'] === 50)).toEqual([])
  })
})

describe('defaultClientAddress under a Bun-style server environment', () => {
  /** An environment whose `requestIP` answers per request, as `Bun.serve`'s server does. */
  function bunEnv(address: () => unknown): { requestIP: (request: Request) => unknown } {
    return { requestIP: () => address() }
  }

  /** POST to the full app in process, handing it `env` as the server environment. */
  function call(app: Hono, env: unknown): Promise<Response> {
    return Promise.resolve(
      app.fetch(
        new Request('http://localhost/api/v1/rpc/calendar.events.list', {
          method: 'POST',
          headers: { Authorization: `Bearer ${READER_TOKEN}`, 'Content-Type': 'application/json' },
          body: '{}',
        }),
        env
      )
    )
  }

  it('keys the per-address limit on the address requestIP reports, with independent budgets', async () => {
    const { app } = createTestServer({
      rateLimit: { max: 1_000, perAddress: { max: 1, clock: fixedClock } },
    })
    const first = bunEnv(() => ({ address: '203.0.113.7', family: 'IPv4', port: 1234 }))
    const second = bunEnv(() => ({ address: '198.51.100.2', family: 'IPv4', port: 4321 }))

    expect((await call(app, first)).status).toBe(200)
    const limited = await call(app, first)
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    // A different address has its own budget.
    expect((await call(app, second)).status).toBe(200)
    expect((await call(app, second)).status).toBe(429)
  })

  it.each([
    ['null', null],
    ['an empty address', { address: '' }],
    ['a missing address', {}],
    ['a non-string address', { address: 42 }],
  ])('treats requestIP returning %s as no peer, so the limit never counts', async (_name, peer) => {
    const { app } = createTestServer({
      rateLimit: { max: 1_000, perAddress: { max: 1, clock: fixedClock } },
    })
    const env = bunEnv(() => peer)

    expect((await call(app, env)).status).toBe(200)
    expect((await call(app, env)).status).toBe(200)
    expect((await call(app, env)).status).toBe(200)
  })
})

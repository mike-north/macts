/**
 * User-acceptance tests for remote reference resolution,
 * `POST /references/v1/resolve`, over a real network listener.
 *
 * The full macts server app is served by a real `@hono/node-server` listener on
 * an ephemeral loopback port and driven with `fetch`. The library app is
 * registered from a hand-built contract; the executor is a recording stub (no
 * app runs) and credentials come from a fake verifier.
 *
 * Expected statuses, codes, and details are written by hand from phases/13:
 *
 * - D7: the route is a top-level namespace beside `/api/v1`; the body is
 *   `{ "app", "reference": {"reference": …} }`; a single reference resolves as
 *   the resource's `get` operation and a collection as its `list` operation,
 *   possibly empty; an identity collection holds one record per entry, and a
 *   short result is `UNEXPECTED_VALUE`; a missing identity-collection entry is
 *   `TARGET_NOT_FOUND` with `entryIndex`; an index past the end is
 *   `INVALID_SELECTION`; an unknown app, a malformed reference, or one whose
 *   resource has no resolving operation is `VALIDATION_FAILED`; a body with any field but `app` and `reference` is
 *   `VALIDATION_FAILED`, one issue per unknown field.
 * - D5: the per-client-address limit applies before the credential is
 *   examined, and the runtime's pipeline governs every resolution.
 * - D6: success is `200 { result }`; failures are the
 *   `{ "error": { code, message, details } }` envelope with its default
 *   statuses; an unreadable body is 400 with one issue at the root; a route
 *   miss is 404 `NOT_FOUND`.
 * - RFC 7235 §4.1 and RFC 6750 §3: a 401 carries `WWW-Authenticate: Bearer`.
 *
 * Time is fixed by the rate limiters' injected clock, so `Retry-After` is exact.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6, D7)
 * @see https://www.rfc-editor.org/rfc/rfc7235#section-4.1
 * @see https://www.rfc-editor.org/rfc/rfc6750#section-3
 */

import { afterEach, describe, expect, it } from 'vitest'
import { InvalidSelectionError, TargetNotFoundError, type WireValue } from '@macts/contracts'
import type { ResolutionRequest } from '@macts/core'
import {
  BOOK_LISTER,
  BOOK_LISTER_TOKEN,
  DUNE,
  DUNE_WIRE,
  EVERY_BOOK,
  FIFTH_BOOK,
  FOUNDATION_WIRE,
  LIBRARIAN,
  LIBRARIAN_TOKEN,
  LIBRARY_MANIFEST,
  SCIENCE_FICTION_SHELF,
  TWO_BOOKS,
  libraryContract,
  wire,
} from './library-fixture.js'
import {
  CALENDAR_MANIFEST,
  FORBID_ALL,
  READER,
  READER_TOKEN,
  createFakeVerifier,
  createListenerPool,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  type FakeVerifier,
  type Listener,
  type RecordingExecutor,
  type TestServerOptions,
} from './test-helpers.js'

/** A fixed clock: every rate-limit window opens at this instant. */
const fixedClock = (): Date => new Date('2026-01-15T10:00:00.000Z')

const listeners = createListenerPool()

afterEach(() => listeners.closeAll())

/** A listening server with its injected fakes and captured log. */
interface ListeningServer extends Listener {
  readonly executor: RecordingExecutor
  readonly verifier: FakeVerifier
  readonly logLines: readonly string[]
}

/**
 * The full server app on a real listener: the library app from its contract
 * and the calendar app from its manifest, with the library keys and the
 * calendar reader known to the verifier.
 */
async function listenServer(
  options: Omit<TestServerOptions, 'manifests' | 'register' | 'verifier'> = {}
): Promise<ListeningServer> {
  const { app, executor, verifier, log } = createTestServer({
    manifests: [CALENDAR_MANIFEST],
    register: (registrar) => {
      registrar.registerContract(libraryContract(), LIBRARY_MANIFEST)
    },
    verifier: createFakeVerifier({
      [LIBRARIAN_TOKEN]: LIBRARIAN,
      [BOOK_LISTER_TOKEN]: BOOK_LISTER,
      [READER_TOKEN]: READER,
    }),
    ...options,
  })
  return { ...(await listeners.listen(app)), executor, verifier, logLines: log.lines }
}

/** A recording executor whose resolutions answer `respond`. */
function resolving(respond: (request: ResolutionRequest) => Promise<WireValue>): RecordingExecutor {
  return createRecordingExecutor(undefined, respond)
}

/** POST `body` to the resolution route over the socket, presenting `token` when given. */
function resolve(
  listener: Listener,
  body: unknown,
  token?: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return fetch(`${listener.url}/references/v1/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

/** The request body resolving `payload` in the library app. */
function libraryBody(payload: unknown): { readonly app: string; readonly reference: unknown } {
  return { app: 'library', reference: wire(payload) }
}

describe('POST /references/v1/resolve: granted resolutions', () => {
  it('answers a single reference with the record in the success envelope', async () => {
    const server = await listenServer({ executor: resolving(() => Promise.resolve(DUNE_WIRE)) })

    const res = await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ result: DUNE_WIRE })
    expect(server.executor.resolutions).toHaveLength(1)
    expect(server.executor.resolutions[0]?.reference).toEqual(DUNE)
    // Resolution never runs an operation.
    expect(server.executor.requests).toHaveLength(0)
  })

  it('answers a collection reference with an array of records', async () => {
    const server = await listenServer({
      executor: resolving(() => Promise.resolve([DUNE_WIRE, FOUNDATION_WIRE])),
    })

    const res = await resolve(server, libraryBody(EVERY_BOOK), LIBRARIAN_TOKEN)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: [DUNE_WIRE, FOUNDATION_WIRE] })
    expect(server.executor.resolutions[0]?.reference).toEqual(EVERY_BOOK)
  })

  it('answers an empty collection with []', async () => {
    const server = await listenServer({ executor: resolving(() => Promise.resolve([])) })

    const res = await resolve(server, libraryBody(EVERY_BOOK), BOOK_LISTER_TOKEN)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: [] })
  })

  it('answers an identity collection with one record per entry, in entry order', async () => {
    const server = await listenServer({
      executor: resolving(() => Promise.resolve([DUNE_WIRE, FOUNDATION_WIRE])),
    })

    const res = await resolve(server, libraryBody(TWO_BOOKS), LIBRARIAN_TOKEN)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: [DUNE_WIRE, FOUNDATION_WIRE] })
    expect(server.executor.resolutions[0]?.reference).toEqual(TWO_BOOKS)
  })

  it('answers 502 UNEXPECTED_VALUE when an identity collection resolves short: no entry is dropped', async () => {
    // Two entries, one record: the executor dropped an entry instead of
    // reporting it missing (D7).
    const server = await listenServer({
      executor: resolving(() => Promise.resolve([DUNE_WIRE])),
    })

    const res = await resolve(server, libraryBody(TWO_BOOKS), LIBRARIAN_TOKEN)

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({
      error: {
        code: 'UNEXPECTED_VALUE',
        message:
          'The result of resolving an identity collection as "library.books.list" must hold one record per entry: expected 2 records, received 1.',
        details: {
          issues: [{ path: [], message: 'Expected 2 records, one per entry, but received 1' }],
        },
      },
    })
  })
})

describe('POST /references/v1/resolve: authentication and authorization', () => {
  it('answers a missing bearer with 401 UNAUTHENTICATED and a Bearer challenge', async () => {
    const server = await listenServer()

    const res = await resolve(server, libraryBody(DUNE))

    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
    expect(await res.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication failed: missing',
        details: { reason: 'missing' },
      },
    })
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('answers a key without the get permission with 403 PERMISSION_DENIED', async () => {
    const server = await listenServer()

    // BOOK_LISTER may list books but not read one, which is what a single
    // reference resolves as.
    const res = await resolve(server, libraryBody(DUNE), BOOK_LISTER_TOKEN)

    expect(res.status).toBe(403)
    expect(res.headers.get('WWW-Authenticate')).toBeNull()
    const body = await errorBody(res)
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details).toMatchObject({ required: 'library:books:get' })
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('answers a policy denial with 403 POLICY_DENIED naming the get permission', async () => {
    const server = await listenServer({ governance: { policy: FORBID_ALL } })

    const res = await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('POLICY_DENIED')
    expect(body.error.details).toEqual({ permission: 'library:books:get', layer: 'host' })
    expect(server.executor.resolutions).toHaveLength(0)
  })
})

describe('POST /references/v1/resolve: resolution failures', () => {
  it('answers a missing identity-collection entry with 404 TARGET_NOT_FOUND, keeping entryIndex', async () => {
    const server = await listenServer({
      executor: resolving(() =>
        Promise.reject(
          new TargetNotFoundError('The second book no longer exists.', {
            resource: 'Book',
            entryIndex: 1,
          })
        )
      ),
    })

    const res = await resolve(server, libraryBody(TWO_BOOKS), LIBRARIAN_TOKEN)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: {
        code: 'TARGET_NOT_FOUND',
        message: 'The second book no longer exists.',
        details: { resource: 'Book', entryIndex: 1 },
      },
    })
  })

  it('answers an index past the end with 400 INVALID_SELECTION', async () => {
    const server = await listenServer({
      executor: resolving(() =>
        Promise.reject(new InvalidSelectionError('There is no fifth book.', { resource: 'Book' }))
      ),
    })

    const res = await resolve(server, libraryBody(FIFTH_BOOK), LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'INVALID_SELECTION',
        message: 'There is no fifth book.',
        details: { resource: 'Book' },
      },
    })
  })

  it('answers a reference to a resource without a get operation with 400 VALIDATION_FAILED at its resource', async () => {
    const server = await listenServer()

    const res = await resolve(server, libraryBody(SCIENCE_FICTION_SHELF), LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The library app cannot resolve a single reference to "Shelf".',
        details: {
          issues: [
            {
              path: ['reference', 'resource'],
              message: 'The library app has no get operation for "Shelf"',
            },
          ],
        },
      },
    })
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('answers a malformed reference with 400 VALIDATION_FAILED, never resolving it', async () => {
    const server = await listenServer()

    // An identity reference may not carry a selector (phases/13 D7, D8).
    const res = await resolve(
      server,
      libraryBody({ ...DUNE, selector: { by: 'name', name: 'Dune' } }),
      LIBRARIAN_TOKEN
    )

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('answers an unexpected executor failure with a sanitized 500 carrying the correlation id', async () => {
    const server = await listenServer({
      executor: resolving(() => Promise.reject(new Error('osascript said: secret detail'))),
    })

    const res = await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN, {
      'X-Request-Id': 'req-42',
    })

    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({
      error: {
        code: 'INTERNAL',
        // The runtime's sanitized text for a non-canonical executor failure (D5 step 5).
        message: 'The operation failed unexpectedly.',
        details: { correlationId: 'req-42' },
      },
    })
    expect(text).not.toContain('secret detail')
  })
})

describe('POST /references/v1/resolve: request framing', () => {
  it('answers a body that is not JSON with 400 and one issue at the root, before the runtime', async () => {
    const server = await listenServer()

    const res = await resolve(server, '{"app": "library",', LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body must be valid JSON',
        details: { issues: [{ path: [], message: 'Request body must be valid JSON' }] },
      },
    })
    // The runtime verifies the credential first, so an unverified credential
    // proves the runtime was never called.
    expect(server.verifier.calls()).toBe(0)
  })

  it.each([
    ['an array', [libraryBody(DUNE)]],
    ['a string', '"library"'],
    ['null', 'null'],
  ])('answers a body that is %s with 400 before the runtime', async (_name, body) => {
    const server = await listenServer()

    const res = await resolve(server, body, LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body must be a JSON object',
        details: {
          issues: [
            { path: [], message: 'Expected an object with a string "app" and a "reference"' },
          ],
        },
      },
    })
    expect(server.verifier.calls()).toBe(0)
  })

  it.each([
    [
      'an empty body',
      '',
      [
        { path: ['app'], message: "Required: the app's route segment, as a string" },
        {
          path: ['reference'],
          message: 'Required: the reference control record {"reference": {…}}',
        },
      ],
    ],
    [
      'no app',
      { reference: wire(DUNE) },
      [{ path: ['app'], message: "Required: the app's route segment, as a string" }],
    ],
    [
      'an app that is not a string',
      { app: 7, reference: wire(DUNE) },
      [{ path: ['app'], message: "Required: the app's route segment, as a string" }],
    ],
    [
      'no reference',
      { app: 'library' },
      [
        {
          path: ['reference'],
          message: 'Required: the reference control record {"reference": {…}}',
        },
      ],
    ],
  ])(
    'answers a body with %s with 400 naming each field, before the runtime',
    async (_n, body, issues) => {
      const server = await listenServer()

      const res = await resolve(server, body, LIBRARIAN_TOKEN)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request body is not a reference resolution request',
          details: { issues },
        },
      })
      expect(server.verifier.calls()).toBe(0)
    }
  )

  it('answers a body with unknown fields with 400, one issue per field, before the runtime', async () => {
    const server = await listenServer()

    // The body is exactly { app, reference }: a field from a later protocol
    // revision must never be silently ignored.
    const res = await resolve(
      server,
      { ...libraryBody(DUNE), hydrate: true, fields: ['title'] },
      LIBRARIAN_TOKEN
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body is not a reference resolution request',
        details: {
          issues: [
            {
              path: ['hydrate'],
              message: 'Unknown field: a resolution request has only "app" and "reference"',
            },
            {
              path: ['fields'],
              message: 'Unknown field: a resolution request has only "app" and "reference"',
            },
          ],
        },
      },
    })
    expect(server.verifier.calls()).toBe(0)
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('reports unknown fields together with missing ones', async () => {
    const server = await listenServer()

    const res = await resolve(server, { app: 'library', ref: wire(DUNE) }, LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect((await errorBody(res)).error.details).toEqual({
      issues: [
        {
          path: ['reference'],
          message: 'Required: the reference control record {"reference": {…}}',
        },
        {
          path: ['ref'],
          message: 'Unknown field: a resolution request has only "app" and "reference"',
        },
      ],
    })
    expect(server.verifier.calls()).toBe(0)
  })

  it('answers no bearer with 401, not 400, even for an unknown app: nothing is disclosed before authentication', async () => {
    const server = await listenServer()

    const res = await resolve(server, { app: 'nope', reference: wire(DUNE) })

    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication failed: missing',
        details: { reason: 'missing' },
      },
    })
    expect(text).not.toContain('Unknown app')
    expect(text).not.toContain('nope')
  })

  it('answers a resource from another app with 400 VALIDATION_FAILED at reference.resource', async () => {
    const server = await listenServer()

    // `Event` is a calendar resource; the library contract has no such
    // resource, so the reference cannot select an operation of the library.
    const res = await resolve(
      server,
      {
        app: 'library',
        reference: wire({ resource: 'Event', form: 'identity', cardinality: 'one', id: 'E-1' }),
      },
      LIBRARIAN_TOKEN
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The reference names no resource of the app.',
        details: {
          // The runtime reports issue paths relative to the reference control
          // record it receives (`{"reference": {…}}`), so `reference.resource`
          // is the body's `reference.reference.resource`.
          issues: [
            { path: ['reference', 'resource'], message: 'The library app has no resource "Event"' },
          ],
        },
      },
    })
    expect(server.executor.resolutions).toHaveLength(0)
  })

  it('answers an unknown app with 400 VALIDATION_FAILED', async () => {
    const server = await listenServer()

    const res = await resolve(server, { app: 'nope', reference: wire(DUNE) }, LIBRARIAN_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Unknown app "nope".',
        details: { issues: [{ path: [], message: 'No app contract is registered for "nope"' }] },
      },
    })
  })

  it('treats an app registered from its manifest alone as unknown: it has no resource table', async () => {
    const server = await listenServer()

    const res = await resolve(server, { app: 'calendar', reference: wire(DUNE) }, READER_TOKEN)

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.message).toBe('Unknown app "calendar".')
  })
})

describe('/references/v1 routing', () => {
  /** The route-miss envelope, written from D6. */
  const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'No such route.', details: {} } }

  it.each(['GET', 'PUT', 'DELETE'])(
    'answers %s on the resolve route as a route miss, like the RPC namespace',
    async (method) => {
      const server = await listenServer()

      const res = await fetch(`${server.url}/references/v1/resolve`, {
        method,
        headers: { Authorization: `Bearer ${LIBRARIAN_TOKEN}` },
      })

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual(NOT_FOUND)
      expect(server.verifier.calls()).toBe(0)
    }
  )

  it('answers a non-POST request to an RPC route the same way', async () => {
    const server = await listenServer()

    const res = await fetch(`${server.url}/api/v1/rpc/calendar.events.list`, {
      headers: { Authorization: `Bearer ${READER_TOKEN}` },
    })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual(NOT_FOUND)
  })

  it.each([
    '/references/v1',
    '/references/v1/other',
    '/references/v2/resolve',
    '/api/v1/references/v1/resolve',
  ])('answers POST %s as a route miss: the route is only /references/v1/resolve', async (path) => {
    const server = await listenServer()

    const res = await fetch(`${server.url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LIBRARIAN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(libraryBody(DUNE)),
    })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual(NOT_FOUND)
    expect(server.executor.resolutions).toHaveLength(0)
  })
})

describe('the RPC namespace beside /references/v1', () => {
  it('still serves operations', async () => {
    const server = await listenServer()

    const res = await fetch(`${server.url}/api/v1/rpc/calendar.events.list`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${READER_TOKEN}`, 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: { events: [] } })
  })

  it('serves /api/v1/introspect, which lists operations and not the resolution route', async () => {
    const server = await listenServer()

    const res = await fetch(`${server.url}/api/v1/introspect/all`)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).not.toContain('references')
    expect(text).not.toContain('resolve')
    const listing = JSON.parse(text) as { apps: { app: string }[] }
    expect(listing.apps.map((app) => app.app)).toEqual(['Calendar', 'Library'])

    const first = await fetch(`${server.url}/api/v1/introspect`)
    expect(first.status).toBe(200)
    expect(((await first.json()) as { app: string }).app).toBe('Calendar')
  })

  it('does not list the resolution route in /api/v1', async () => {
    const server = await listenServer()

    const res = await fetch(`${server.url}/api/v1`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      name: 'macts API',
      version: 'v1',
      documentation: 'https://github.com/macts/macts',
      apps: [
        { name: 'Calendar', bundleId: 'com.apple.iCal' },
        { name: 'Library', bundleId: 'com.example.library' },
      ],
    })
  })
})

describe('POST /references/v1/resolve: per-address rate limit', () => {
  it('turns an address away with 429 once its limit is spent, before authentication', async () => {
    const server = await listenServer({
      rateLimit: { max: 1_000, perAddress: { max: 2, clock: fixedClock } },
    })

    expect((await resolve(server, libraryBody(DUNE), 'macts_sk_guess')).status).toBe(401)
    expect((await resolve(server, libraryBody(DUNE), 'macts_sk_guess')).status).toBe(401)
    const limited = await resolve(server, libraryBody(DUNE), 'macts_sk_guess')

    expect(limited.status).toBe(429)
    // The window opened at the fixed instant and lasts 60 000 ms.
    expect(limited.headers.get('Retry-After')).toBe('60')
    expect(await limited.json()).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests from this client. Try again in 60 seconds.',
        details: { retryAfterSeconds: 60 },
      },
    })
    expect(server.verifier.calls()).toBe(2)
  })

  it('shares one budget per address with the RPC routes', async () => {
    const server = await listenServer({
      executor: resolving(() => Promise.resolve(DUNE_WIRE)),
      rateLimit: { max: 1_000, perAddress: { max: 2, clock: fixedClock } },
    })

    const rpc = await fetch(`${server.url}/api/v1/rpc/calendar.events.list`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${READER_TOKEN}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(rpc.status).toBe(200)
    expect((await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN)).status).toBe(200)

    const limited = await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN)
    expect(limited.status).toBe(429)
    const afterRpc = await fetch(`${server.url}/api/v1/rpc/calendar.events.list`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${READER_TOKEN}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(afterRpc.status).toBe(429)
  })
})

describe('POST /references/v1/resolve: credential confidentiality', () => {
  it('never puts a bearer token in a response body or a log line, on any outcome', async () => {
    const server = await listenServer({
      executor: resolving((request) =>
        request.reference.resource === 'Book' && request.reference.cardinality === 'many'
          ? Promise.reject(new Error(`executor echoed ${LIBRARIAN_TOKEN}`))
          : Promise.resolve(DUNE_WIRE)
      ),
    })
    const bodies: string[] = []
    const record = async (res: Response): Promise<void> => {
      bodies.push(await res.text())
    }

    await record(await resolve(server, libraryBody(DUNE), LIBRARIAN_TOKEN))
    await record(await resolve(server, libraryBody(EVERY_BOOK), LIBRARIAN_TOKEN))
    await record(await resolve(server, libraryBody(DUNE), BOOK_LISTER_TOKEN))
    await record(await resolve(server, libraryBody(SCIENCE_FICTION_SHELF), LIBRARIAN_TOKEN))
    await record(await resolve(server, '{', LIBRARIAN_TOKEN))
    await record(await resolve(server, { app: 'nope', reference: wire(DUNE) }, LIBRARIAN_TOKEN))
    await record(await resolve(server, libraryBody(DUNE), 'macts_sk_unknown-token-never-logged'))

    // Success, an unexpected failure whose text echoes the token, a
    // permission denial, an unresolvable resource, an unreadable body, an
    // unknown app, and an authentication failure.
    expect(bodies).toHaveLength(7)
    expect(server.logLines.length).toBeGreaterThan(0)
    for (const token of [
      LIBRARIAN_TOKEN,
      BOOK_LISTER_TOKEN,
      'macts_sk_unknown-token-never-logged',
    ]) {
      expect(bodies.join('\n')).not.toContain(token)
      expect(server.logLines.join('\n')).not.toContain(token)
    }
  })
})

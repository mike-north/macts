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
 * - 502 `UNEXPECTED_VALUE` for a result that violates the operation's output
 *   contract (D11), with issue paths but no values
 * - a list returns one page `{ items, nextCursor? }`; `nextCursor` is absent
 *   exactly on the last page, and a page size above 100 is 400
 *   `VALIDATION_FAILED` at `pageSize`
 * - 409 `COLLECTION_CHANGED` with empty details for a collection that changed
 *   while it was read
 * - 400 `VALIDATION_FAILED` for input that violates the operation contract,
 *   rejected before governance (D5): no approval request is made, and the
 *   audit log gains one `invalid-input` record carrying the issue count and
 *   no argument values
 * - 403 `PERMISSION_DENIED` for a key without the operation's permission
 *   (D5, D6): the audit log gains one `permission-denied` record carrying the
 *   operation, the key, and the time, and the response and the record are the
 *   same whether the request body was valid or not
 * - 400 `VALIDATION_FAILED` for a key that is not a declared parameter of a
 *   manifest-served operation, with its issue at the input itself (D5, D11),
 *   exactly as for a contract-registered operation
 *
 * Time is fixed by the rate limiters' injected clock, so `Retry-After` is exact:
 * a window that opens at the fixed instant lasts the full 60 seconds.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6, D11)
 * @see https://www.rfc-editor.org/rfc/rfc7235#section-4.1
 * @see https://www.rfc-editor.org/rfc/rfc6750#section-3
 * @see https://hono.dev/docs/getting-started/nodejs
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import pino from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CollectionChangedError,
  OperationCancelledError,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type WireValue,
} from '@macts/contracts'
import type { AppManifest, ApprovalRequest } from '@macts/core'
import { createFileAuditWriter } from '@macts/core'
import { createRateLimiter, createRuntime, type RateLimiter } from '@macts/runtime'
import { createHttpAdapter } from './adapter.js'
import {
  CALENDAR_MANIFEST,
  READER_TOKEN,
  WRITER_TOKEN,
  calendarPolicy,
  createFakeVerifier,
  createListenerPool,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  type Listener,
  type RecordingExecutor,
  type TestServerOptions,
} from './test-helpers.js'

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
  options: Omit<TestServerOptions, 'verifier'> = {}
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

/**
 * The test calendar manifest with its event identifier claimed unique and its
 * event range reads recorded as working, so its event list pages. A list pages
 * only on both (phases/13 D9); this fixture app makes those claims, unlike the
 * real Calendar.
 */
const PAGED_CALENDAR_MANIFEST: AppManifest = {
  ...CALENDAR_MANIFEST,
  resources: {
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'An event',
      properties: {},
      identifiers: [
        {
          property: 'uid',
          primary: true,
          targeting: 'byId',
          unique: true,
          evidence: {
            unique: { source: 'curated', note: 'Test fixture: no two events share a uid' },
          },
        },
      ],
      rangeRead: {
        supported: true,
        read: 'range',
        evidence: {
          source: 'probe',
          observedAt: '2026-01-15T10:30:00.000Z',
          bundleId: 'com.apple.iCal',
          appVersion: '1.0',
          osVersion: '27.2',
          cost: {
            observedAt: '2026-01-15T10:30:00.000Z',
            pageMs: 400,
            columnMs: 900,
            items: 120,
            runs: 5,
            pageSize: 25,
          },
        },
      },
    },
  },
}

/**
 * A calendar contract whose list operation returns typed event records, so
 * the runtime checks every result against it (D11). Ids, permission, and
 * target are hand-derived from the test calendar manifest.
 */
function typedCalendarContract(): AppContract<unknown> {
  const event = t.record({
    uid: t.string(),
    status: t.enumeration(['confirmed', 'cancelled']),
  })
  const list: AnyOperationDescriptor = {
    id: 'calendar.events.list',
    permission: 'calendar:events:list',
    target: { command: 'list', resource: 'Event' },
    description: 'List events',
    input: t.record({ ...t.pageInputs() }),
    output: t.page(event),
  }
  return {
    app: 'calendar',
    operations: { [list.id]: list },
    resources: { Event: { name: 'Event', record: event, id: t.string(), list: list.id } },
    loadManifest: () => Promise.resolve(PAGED_CALENDAR_MANIFEST),
    bind: () => ({}),
  }
}

describe('HTTP listener: invalid input to an approval-gated operation', () => {
  const auditDirs: string[] = []

  afterEach(async () => {
    for (const dir of auditDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('answers 400 VALIDATION_FAILED, asks no approver, and audits one invalid-input record', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'macts-invalid-input-uat-'))
    auditDirs.push(dir)
    const auditPath = join(dir, 'audit.jsonl')
    const asked: ApprovalRequest[] = []
    const listener = await listenServer({
      governance: {
        policy: calendarPolicy('confirm-first'),
        writer: createFileAuditWriter(auditPath),
        approvals: {
          provider: {
            name: 'recording-approver',
            capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting: false },
            requestApproval: (request) => {
              asked.push(request)
              return Promise.resolve({ state: 'approved' })
            },
          },
        },
      },
    })

    // `summary` is a required string; a number violates the request contract.
    const res = await rpc(listener, 'calendar.events.create', WRITER_TOKEN, {
      body: { summary: 4242, password: 'hunter2' },
    })

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(body.error.details).toMatchObject({ issues: [{ path: ['summary'] }] })
    expect(asked).toHaveLength(0)
    expect(listener.executor.requests).toHaveLength(0)

    const log = await readFile(auditPath, 'utf8')
    const records = log
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as unknown)
    expect(records).toEqual([
      {
        capability: 'calendar:events:create',
        app: 'calendar',
        apiKeyId: 'key_writer',
        decision: 'invalid-input',
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        ) as unknown,
        issueCount: 1,
      },
    ])
    expect(log).not.toContain('4242')
    expect(log).not.toContain('hunter2')
  })
})

describe('HTTP listener: a request without the operation permission', () => {
  const auditDirs: string[] = []

  afterEach(async () => {
    for (const dir of auditDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true })
    }
  })

  /** Every record in the JSON-lines audit log at `path`, parsed. */
  async function auditRecords(path: string): Promise<unknown[]> {
    const log = await readFile(path, 'utf8')
    return log
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as unknown)
  }

  /** The record a denied `calendar.events.create` by the reader key writes. */
  const DENIED_CREATE_RECORD = {
    capability: 'calendar:events:create',
    app: 'calendar',
    apiKeyId: 'key_reader',
    decision: 'permission-denied',
    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) as unknown,
  }

  it('answers 403 PERMISSION_DENIED and audits one permission-denied record', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'macts-permission-denied-uat-'))
    auditDirs.push(dir)
    const auditPath = join(dir, 'audit.jsonl')
    const listener = await listenServer({
      governance: {
        policy: calendarPolicy('allowed'),
        writer: createFileAuditWriter(auditPath),
      },
    })

    // READER holds only calendar:events:list.
    const res = await rpc(listener, 'calendar.events.create', READER_TOKEN, {
      body: { summary: 'Standup', password: 'hunter2' },
    })

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details).toMatchObject({ required: 'calendar:events:create' })
    expect(listener.executor.requests).toHaveLength(0)
    expect(await auditRecords(auditPath)).toEqual([DENIED_CREATE_RECORD])
    const log = await readFile(auditPath, 'utf8')
    expect(log).not.toContain('Standup')
    expect(log).not.toContain('hunter2')
  })

  it('answers and audits a valid and an invalid body identically', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'macts-permission-denied-uat-'))
    auditDirs.push(dir)
    const auditPath = join(dir, 'audit.jsonl')
    const listener = await listenServer({
      governance: {
        policy: calendarPolicy('allowed'),
        writer: createFileAuditWriter(auditPath),
      },
    })

    const forValid = await rpc(listener, 'calendar.events.create', READER_TOKEN, {
      body: { summary: 'Standup' },
    })
    // `summary` is a required string; a number violates the request contract.
    const forInvalid = await rpc(listener, 'calendar.events.create', READER_TOKEN, {
      body: { summary: 4242 },
    })

    expect(forValid.status).toBe(403)
    expect(forInvalid.status).toBe(403)
    expect(await forInvalid.json()).toEqual(await forValid.json())
    const records = await auditRecords(auditPath)
    expect(records).toEqual([DENIED_CREATE_RECORD, DENIED_CREATE_RECORD])
    // Field for field equal apart from the timestamp.
    const withoutTime = records.map((record) => ({
      ...(record as Record<string, unknown>),
      timestamp: undefined,
    }))
    expect(withoutTime[1]).toEqual(withoutTime[0])
  })
})

describe('HTTP listener: undeclared keys to a manifest-served operation', () => {
  it('answers 400 VALIDATION_FAILED at the input itself, never reaching the executor', async () => {
    const listener = await listenServer()

    // `organizer` is not a parameter of the manifest's `create` command.
    const res = await rpc(listener, 'calendar.events.create', WRITER_TOKEN, {
      body: { summary: 'Standup', organizer: 'ada' },
    })

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(body.error.details).toMatchObject({ issues: [{ path: [] }] })
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('still answers 200 for the declared parameters alone', async () => {
    const executor = createRecordingExecutor(() => Promise.resolve({ created: true }))
    const listener = await listenServer({ executor })

    const res = await rpc(listener, 'calendar.events.create', WRITER_TOKEN, {
      body: { summary: 'Standup', password: 'hunter2' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: { created: true } })
    expect(executor.requests).toHaveLength(1)
  })
})

describe('HTTP listener: results that violate the output contract', () => {
  it('answers 502 UNEXPECTED_VALUE, says the operation ran, and echoes no value', async () => {
    // Distinctive strings stand in for user content in the app's result: an
    // undeclared key, an undeclared enum member, and a wrongly typed value.
    const SECRET_KEY = 'secret-key-7f3a'
    const SECRET_STATUS = 'secret-status-7f3a'
    const executor = createRecordingExecutor(() =>
      Promise.resolve({
        items: [{ uid: 'evt-1', status: SECRET_STATUS, [SECRET_KEY]: 'secret-value-7f3a' }],
        length: 1,
      })
    )
    const listener = await listenServer({
      manifests: [],
      register: (registrar) => {
        registrar.registerContract(typedCalendarContract(), PAGED_CALENDAR_MANIFEST)
      },
      executor,
    })

    const res = await rpc(listener, 'calendar.events.list', READER_TOKEN)

    // D6: UNEXPECTED_VALUE is an upstream result the service could not use.
    expect(res.status).toBe(502)
    const text = await res.text()
    const body = JSON.parse(text) as { error: { code: string; message: string; details: unknown } }
    expect(body.error.code).toBe('UNEXPECTED_VALUE')
    expect(body.error.message).toBe(
      'The "calendar.events.list" operation ran in the app, but its result does not match its contract; do not assume it had no effect.'
    )
    expect(body.error.details).toEqual({
      issues: [
        {
          path: ['items', 0, 'status'],
          message: 'Expected one of "confirmed" | "cancelled".',
          code: 'invalid_value',
        },
        {
          path: ['items', 0],
          message: 'The record has 1 key its contract does not declare.',
          code: 'unrecognized_keys',
        },
      ],
    })
    expect(text).not.toContain('secret')
    expect(executor.requests).toHaveLength(1)
  })
})

/** Five confirmed events in wire form, identified by `uid` `evt-1` … `evt-5`. */
const FIVE_EVENTS = Array.from({ length: 5 }, (_, i) => ({
  uid: `evt-${String(i + 1)}`,
  status: 'confirmed',
}))

/**
 * An executor that serves page windows of {@link FIVE_EVENTS} the way a native
 * executor does: it answers with the window's items, the collection length,
 * and the last item's identifier.
 */
function eventWindows(): RecordingExecutor {
  return createRecordingExecutor((request) => {
    const window = request.page
    if (window === undefined) return Promise.reject(new Error('expected a page window'))
    const items = FIVE_EVENTS.slice(window.offset, window.offset + window.size)
    const last = items.at(-1)
    return Promise.resolve({
      items,
      length: FIVE_EVENTS.length,
      ...(last === undefined ? {} : { last: last.uid }),
    })
  })
}

/** The `result` of a successful call, narrowed to a page. */
async function pageBody(res: Response): Promise<{ items: unknown[]; nextCursor?: string }> {
  const body = (await res.json()) as { result: { items: unknown[]; nextCursor?: string } }
  return body.result
}

describe('HTTP listener: paged lists', () => {
  it('pages through a list with pageSize and cursor, every item once and no cursor at the end', async () => {
    const listener = await listenServer({
      manifests: [],
      register: (registrar) => {
        registrar.registerContract(typedCalendarContract(), PAGED_CALENDAR_MANIFEST)
      },
      executor: eventWindows(),
    })

    const pages: { items: unknown[]; nextCursor?: string }[] = []
    let cursor: string | undefined
    do {
      const res = await rpc(listener, 'calendar.events.list', READER_TOKEN, {
        body: { pageSize: { integer: '2' }, ...(cursor === undefined ? {} : { cursor }) },
      })
      expect(res.status).toBe(200)
      const page = await pageBody(res)
      pages.push(page)
      cursor = page.nextCursor
    } while (cursor !== undefined && pages.length < 10)

    // Five items at two per page: 2, 2, 1; only the last page has no cursor.
    expect(pages.map((page) => page.items.length)).toEqual([2, 2, 1])
    expect(pages.map((page) => typeof page.nextCursor)).toEqual(['string', 'string', 'undefined'])
    expect(pages.flatMap((page) => page.items)).toEqual(FIVE_EVENTS)
    expect(listener.executor.requests.map((request) => request.page)).toEqual([
      { offset: 0, size: 2 },
      { offset: 2, size: 2, anchor: 'evt-2' },
      { offset: 4, size: 2, anchor: 'evt-4' },
    ])
  })

  it('answers 400 VALIDATION_FAILED at pageSize for a page size above the maximum', async () => {
    const listener = await listenServer({
      manifests: [],
      register: (registrar) => {
        registrar.registerContract(typedCalendarContract(), PAGED_CALENDAR_MANIFEST)
      },
      executor: eventWindows(),
    })

    const res = await rpc(listener, 'calendar.events.list', READER_TOKEN, {
      body: { pageSize: { integer: '101' } },
    })

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(body.error.details).toMatchObject({ issues: [{ path: ['pageSize'] }] })
    expect(listener.executor.requests).toHaveLength(0)
  })

  it('answers 409 COLLECTION_CHANGED with no details when the collection changed', async () => {
    const executor = createRecordingExecutor(() =>
      Promise.reject(
        new CollectionChangedError(
          'The Event collection in Calendar changed while it was being read, so no consistent result exists. The same request can be retried, from the first page if it was paged.',
          {}
        )
      )
    )
    const listener = await listenServer({
      manifests: [],
      register: (registrar) => {
        registrar.registerContract(typedCalendarContract(), PAGED_CALENDAR_MANIFEST)
      },
      executor,
    })

    const res = await rpc(listener, 'calendar.events.list', READER_TOKEN)

    // D6: COLLECTION_CHANGED is 409 and carries no details.
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: {
        code: 'COLLECTION_CHANGED',
        message:
          'The Event collection in Calendar changed while it was being read, so no consistent result exists. The same request can be retried, from the first page if it was paged.',
        details: {},
      },
    })
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

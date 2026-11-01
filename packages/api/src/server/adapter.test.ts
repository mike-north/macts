/**
 * HTTP-level tests for the adapter over the runtime.
 *
 * Every request goes through the assembled server app with `app.request(...)`,
 * a recording executor, and a fake verifier, so no Mac app runs. Expected
 * statuses, codes, and details are written by hand from the decision record:
 *
 * - D5: the pipeline (verify → admission → permission → governance → input
 *   validation → execute) and which canonical error each step raises;
 * - D6: the error table, its default HTTP statuses, and the
 *   `{ "error": { code, message, details } }` envelope.
 *
 * "Denied" is always also asserted as "the executor was never called".
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 */

import { readFileSync } from 'node:fs'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  ApprovalPendingError,
  ApprovalRejectedError,
  AuthenticationError,
  FileNotFoundError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  PermissionDeniedError,
  PolicyDeniedError,
  RateLimitedError,
  TargetNotFoundError,
  TransferError,
  TransportError,
  UnexpectedValueError,
  ValidationError,
  fromWireErrorEnvelope,
  type AnyMactsError,
  type ErrorCode,
  type MactsError,
  type WireErrorCode,
} from '@macts/contracts'
import { loadManifest, type ExecutionRequest } from '@macts/core'
import { ALLOW_ALL_POLICY, createRuntime, type RateLimiter } from '@macts/runtime'
import { createHttpAdapter, httpStatusForError } from './adapter.js'
import {
  CALENDAR_MANIFEST,
  ERROR,
  INFO,
  LEGACY_TOKEN,
  MALFORMED_TOKEN,
  READER_TOKEN,
  REVOKED_TOKEN,
  EXPIRED_TOKEN,
  WRITER_TOKEN,
  createCapturedLogger,
  createFakeVerifier,
  createRecordingExecutor,
  createTestServer,
  errorBody,
  post,
} from './test-helpers.js'

/** A fixed clock, so retry delays are exact. */
const fixedClock = (): Date => new Date('2026-03-04T05:06:07.000Z')

/** The paths of the issues in a VALIDATION_FAILED envelope. */
function issuePaths(details: unknown): unknown[] {
  return (details as { issues: { path: unknown }[] }).issues.map((issue) => issue.path)
}

/** An executor that fails every call with `error`. */
function failingWith(error: Error): ReturnType<typeof createRecordingExecutor> {
  return createRecordingExecutor(() => Promise.reject(error))
}

describe('success', () => {
  it('returns 200 { result } with the executor result', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: { events: [] } })
    expect(executor.requests).toHaveLength(1)
  })

  it('hands the runtime the operation target, the body, and the request abort signal', async () => {
    const { app, executor } = createTestServer()

    await post(app, 'calendar.events.create', { summary: 'Standup' }, WRITER_TOKEN)

    const request = executor.requests[0]
    expect(request?.target).toEqual({ command: 'create', resource: 'Event' })
    expect(request?.input).toEqual({ summary: 'Standup' })
    expect(request?.signal).toBeInstanceOf(AbortSignal)
  })

  it('serves application commands at app.app.command', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.app.quit', {}, WRITER_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests[0]?.target).toEqual({ command: 'quit' })
  })

  it.each([
    ['a missing body', undefined],
    ['an empty body', ''],
    ['a blank body', '  \n'],
  ])('treats %s as {}', async (_name, body) => {
    const { app, executor } = createTestServer()

    const res = await app.request('/api/v1/rpc/calendar.events.list', {
      method: 'POST',
      headers: { Authorization: `Bearer ${READER_TOKEN}` },
      ...(body === undefined ? {} : { body }),
    })

    expect(res.status).toBe(200)
    expect(executor.requests[0]?.input).toEqual({})
  })
})

describe('authentication (D5 step 1 → 401 UNAUTHENTICATED)', () => {
  it.each([
    ['no Authorization header', undefined, 'missing'],
    ['a non-bearer scheme', 'Basic dXNlcjpwYXNz', 'missing'],
    ['an empty bearer token', 'Bearer ', 'missing'],
    ['a malformed token', `Bearer ${MALFORMED_TOKEN}`, 'malformed'],
    ['an unrecognized token', 'Bearer macts_sk_unknown', 'invalid'],
    ['a revoked token', `Bearer ${REVOKED_TOKEN}`, 'revoked'],
    ['an expired token', `Bearer ${EXPIRED_TOKEN}`, 'expired'],
  ])('%s → 401 with reason %s, never executing', async (_name, authorization, reason) => {
    const { app, executor } = createTestServer()

    const res = await app.request('/api/v1/rpc/calendar.events.list', {
      method: 'POST',
      headers: authorization === undefined ? {} : { Authorization: authorization },
      body: '{}',
    })

    expect(res.status).toBe(401)
    const body = await errorBody(res)
    expect(body.error.code).toBe('UNAUTHENTICATED')
    expect(body.error.details).toEqual({ reason })
    expect(executor.requests).toHaveLength(0)
  })

  it('accepts the bearer scheme case-insensitively', async () => {
    const { app } = createTestServer()

    const res = await app.request('/api/v1/rpc/calendar.events.list', {
      method: 'POST',
      headers: { Authorization: `bearer ${READER_TOKEN}` },
    })

    expect(res.status).toBe(200)
  })
})

describe('permission (D5 step 2 → 403 PERMISSION_DENIED)', () => {
  it('names the required permission, never executing', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.create', { summary: 'x' }, READER_TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('PERMISSION_DENIED')
    expect(body.error.details).toMatchObject({ required: 'calendar:events:create' })
    expect(executor.requests).toHaveLength(0)
  })

  it('explains a renamed permission with its changelog', async () => {
    const { app } = createTestServer()

    const res = await post(app, 'calendar.events.delete', {}, LEGACY_TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.details).toEqual({
      required: 'calendar:events:delete',
      hint: 'Permission changed in v0.2.0 (was: calendar:events:remove). Regenerate your API key.',
      changelog: {
        version: '0.2.0',
        previousPermission: 'calendar:events:remove',
        reason: 'Aligned with the delete verb',
      },
    })
  })
})

describe('input (D5 step 4 → 400 VALIDATION_FAILED)', () => {
  it('rejects input that violates the operation contract with its issues', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.create', { summary: 42 }, WRITER_TOKEN)

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(issuePaths(body.error.details)).toEqual([['summary']])
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a missing required parameter', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.create', {}, WRITER_TOKEN)

    expect(res.status).toBe(400)
    const body = await errorBody(res)
    expect(body.error.code).toBe('VALIDATION_FAILED')
    expect(issuePaths(body.error.details)).toEqual([['summary']])
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a body that is not valid JSON with one issue at the root', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.list', 'not valid json {{{', READER_TOKEN)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body must be valid JSON',
        details: { issues: [{ path: [], message: 'Request body must be valid JSON' }] },
      },
    })
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a JSON body that is not a record', async () => {
    const { app, executor } = createTestServer()

    const res = await post(app, 'calendar.events.list', [1, 2], READER_TOKEN)

    expect(res.status).toBe(400)
    expect((await errorBody(res)).error.code).toBe('VALIDATION_FAILED')
    expect(executor.requests).toHaveLength(0)
  })
})

describe('request contracts of a shipped manifest (Calendar)', () => {
  // manifests/calendar/app.yaml: getEvent takes `calendarId` and `id`; the
  // Event identifier PROPERTY is `uid`, and the Calendar identifier property is
  // `calendarIdentifier`. Request bodies use the parameter names.
  const CALENDAR_PATH = new URL('../../../../manifests/calendar/app.yaml', import.meta.url)
  const WILDCARD = createFakeVerifier({
    [WRITER_TOKEN]: { subject: 'key_calendar', permissions: ['calendar:*:*'] },
  })

  async function calendarServer(): Promise<ReturnType<typeof createTestServer>> {
    const manifest = await loadManifest(CALENDAR_PATH.pathname)
    return createTestServer({ manifests: [manifest], verifier: WILDCARD })
  }

  it('accepts getEvent with { calendarId, id } and dispatches exactly that input', async () => {
    const { app, executor } = await calendarServer()

    const res = await post(
      app,
      'calendar.events.get',
      { calendarId: 'Work', id: 'EVENT-123' },
      WRITER_TOKEN
    )

    expect(res.status).toBe(200)
    expect(executor.requests[0]?.target).toEqual({ command: 'getEvent', resource: 'Event' })
    expect(executor.requests[0]?.input).toEqual({ calendarId: 'Work', id: 'EVENT-123' })
  })

  it('rejects getEvent keyed by the property name `uid`', async () => {
    const { app, executor } = await calendarServer()

    const res = await post(app, 'calendar.events.get', { uid: 'EVENT-123' }, WRITER_TOKEN)

    expect(res.status).toBe(400)
    expect((await errorBody(res)).error.code).toBe('VALIDATION_FAILED')
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects calendars.get keyed by the property name `calendarIdentifier`', async () => {
    const { app, executor } = await calendarServer()

    const res = await post(
      app,
      'calendar.calendars.get',
      { calendarIdentifier: 'CAL-456' },
      WRITER_TOKEN
    )

    expect(res.status).toBe(400)
    expect((await errorBody(res)).error.code).toBe('VALIDATION_FAILED')
    expect(executor.requests).toHaveLength(0)
  })
})

describe('executor failures (D5 step 5)', () => {
  it.each([
    [new TargetNotFoundError('No such event', { resource: 'events' }), 404, 'TARGET_NOT_FOUND'],
    [
      new AppUnavailableError('Calendar is not running', {
        app: 'Calendar',
        reason: 'not-responding',
      }),
      503,
      'APP_UNAVAILABLE',
    ],
    [new OperationTimeoutError('Too slow', { timeoutMs: 30_000 }), 504, 'TIMEOUT'],
  ] as const)('%s → %i %s', async (error, status, code) => {
    const { app } = createTestServer({ executor: failingWith(error) })

    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({
      error: { code, message: error.message, details: error.details },
    })
  })

  it('reports a non-canonical failure as a generic 500 INTERNAL that never echoes its text', async () => {
    const { app, log } = createTestServer({ executor: failingWith(new Error('secret text')) })

    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN, {
      'X-Request-Id': 'req-123',
    })

    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('secret text')
    const body = JSON.parse(text) as unknown
    expect(body).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'The operation failed unexpectedly.',
        details: { correlationId: 'req-123' },
      },
    })
    // The operator still learns what happened.
    expect(log.entriesAt(ERROR)).toHaveLength(1)
  })

  it('reports a canonical error whose details violate their schema as a generic 500, not a crash', async () => {
    // A producer defect: details that do not match the code's contract.
    const details = { reason: 'gone fishing' } as unknown as { reason: 'expired' }
    const { app, log } = createTestServer({
      executor: failingWith(new TransferError('broken', details)),
    })

    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error', details: {} },
    })
    expect(log.entriesAt(ERROR)).toHaveLength(1)
    expect(log.lines.join('\n')).not.toContain('gone fishing')
  })

  it('answers a cancelled call with 499 and does not log it as a server error', async () => {
    const { app, log } = createTestServer({
      executor: failingWith(new OperationCancelledError('The caller went away.', {})),
    })

    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect(res.status).toBe(499)
    expect((await errorBody(res)).error.code).toBe('CANCELLED')
    expect(log.entriesAt(ERROR)).toHaveLength(0)
    expect(log.entriesAt(INFO).some((e) => e['msg'] === 'Request cancelled by the caller')).toBe(
      true
    )
  })
})

/**
 * One instance of every canonical wire error, with the status the D6 table
 * assigns it, written out by hand.
 */
const CANONICAL: readonly (readonly [MactsError<WireErrorCode>, number])[] = [
  [new ValidationError('bad', { issues: [{ path: ['a'], message: 'no' }] }), 400],
  [new UnexpectedValueError('odd', { issues: [{ path: ['b'], message: 'no' }] }), 502],
  [new AuthenticationError('who', { reason: 'revoked' }), 401],
  [new RateLimitedError('slow', { retryAfterSeconds: 9 }), 429],
  [new PermissionDeniedError('no', { required: 'calendar:events:list' }), 403],
  [new PolicyDeniedError('no', { permission: 'calendar:events:list', layer: 'host' }), 403],
  [new ApprovalPendingError('wait', { permission: 'calendar:events:list', layer: 'key' }), 409],
  [
    new ApprovalRejectedError('no', {
      permission: 'calendar:events:list',
      layer: 'host',
      state: 'timeout',
    }),
    403,
  ],
  [new TargetNotFoundError('gone', { resource: 'events' }), 404],
  [new FileNotFoundError('gone', { path: '/tmp/a.pdf' }), 404],
  [new InvalidSelectionError('range', { resource: 'events' }), 400],
  [new AppUnavailableError('down', { app: 'Calendar', reason: 'not-installed' }), 503],
  [new AppAuthorizationRequiredError('tcc', { app: 'Calendar' }), 503],
  [new AppOperationError('app said no', { app: 'Calendar', appErrorCode: -10000 }), 502],
  [new OperationTimeoutError('slow', { timeoutMs: 5000 }), 504],
  [new OperationCancelledError('left', {}), 499],
  [new TransferError('old', { reason: 'expired' }), 410],
  [new TransferError('big', { reason: 'too-large' }), 413],
  [new TransferError('partial', { reason: 'incomplete' }), 400],
  [new TransferError('who', { reason: 'unknown-transfer' }), 400],
  [new InternalError('oops', { correlationId: 'c-1' }), 500],
]

describe('httpStatusForError (D6 default statuses)', () => {
  it.each(CANONICAL.map(([error, status]) => [error.code, status, error] as const))(
    '%s → %i',
    (_code, status, error) => {
      expect(httpStatusForError(error as AnyMactsError)).toBe(status)
    }
  )

  it('maps the client-only transport failure to 500', () => {
    expect(httpStatusForError(new TransportError('x', { reason: 'unreachable' }))).toBe(500)
  })

  it('covers every error code', () => {
    const covered = new Set<ErrorCode>([...CANONICAL.map(([e]) => e.code), 'TRANSPORT_FAILED'])
    // Every code in the D6 table, written out by hand.
    expect([...covered].sort()).toEqual(
      [
        'VALIDATION_FAILED',
        'UNEXPECTED_VALUE',
        'UNAUTHENTICATED',
        'RATE_LIMITED',
        'PERMISSION_DENIED',
        'POLICY_DENIED',
        'APPROVAL_PENDING',
        'APPROVAL_REJECTED',
        'TARGET_NOT_FOUND',
        'FILE_NOT_FOUND',
        'INVALID_SELECTION',
        'APP_UNAVAILABLE',
        'APP_AUTHORIZATION_REQUIRED',
        'APP_OPERATION_FAILED',
        'TIMEOUT',
        'CANCELLED',
        'TRANSFER_FAILED',
        'INTERNAL',
        'TRANSPORT_FAILED',
      ].sort()
    )
  })
})

describe('round trip through HTTP', () => {
  it.each(CANONICAL.map(([error, status]) => [error.code, error, status] as const))(
    '%s reconstructs as the same class with the same details',
    async (_code, error, status) => {
      const { app } = createTestServer({ executor: failingWith(error) })

      const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)
      const decoded = fromWireErrorEnvelope(await res.json(), { status: res.status })

      expect(res.status).toBe(status)
      expect(decoded).toBeInstanceOf(error.constructor)
      expect(decoded.code).toBe(error.code)
      expect(decoded.message).toBe(error.message)
      expect(decoded.details).toEqual(error.details)
    }
  )
})

describe('subject rate limit (D5 step 1b → 429 RATE_LIMITED)', () => {
  it('turns away request 101 within a minute with Retry-After, never executing it', async () => {
    const { app, executor } = createTestServer({ rateLimit: { clock: fixedClock } })

    for (let i = 0; i < 100; i++) {
      expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
    }
    const res = await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    const body = await errorBody(res)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(body.error.details).toEqual({ retryAfterSeconds: 60 })
    expect(executor.requests).toHaveLength(100)
  })

  it('limits each subject independently', async () => {
    const { app } = createTestServer({ rateLimit: { max: 1, clock: fixedClock } })

    await post(app, 'calendar.events.list', {}, READER_TOKEN)

    expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(429)
    expect((await post(app, 'calendar.events.list', {}, WRITER_TOKEN)).status).toBe(200)
  })

  it('applies no limit when rate limiting is disabled', async () => {
    const { app } = createTestServer({ rateLimit: false })

    for (let i = 0; i < 120; i++) {
      expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
    }
  })
})

describe('per-address transport limit', () => {
  it('turns away request 301 from one address before verifying, leaving other addresses unaffected', async () => {
    let address = '203.0.113.7'
    const { app, verifier, executor } = createTestServer({
      clientAddress: () => address,
      rateLimit: { perAddress: { clock: fixedClock } },
    })

    for (let i = 0; i < 300; i++) {
      expect((await post(app, 'calendar.events.list', {}, 'macts_sk_guess')).status).toBe(401)
    }
    const limited = await post(app, 'calendar.events.list', {}, 'macts_sk_guess')

    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    expect((await errorBody(limited)).error).toMatchObject({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: 60 },
    })
    // Turned away before the credential was examined.
    expect(verifier.calls()).toBe(300)

    address = '198.51.100.2'
    expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
    expect(verifier.calls()).toBe(301)
    expect(executor.requests).toHaveLength(1)
  })

  it('does not count requests whose address cannot be determined', async () => {
    const { app } = createTestServer({
      clientAddress: () => undefined,
      rateLimit: { max: 1_000, perAddress: { max: 1, clock: fixedClock } },
    })

    expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
    expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
  })

  it('is disabled together with the subject limit by rateLimit: false', async () => {
    const { app } = createTestServer({ clientAddress: () => '203.0.113.7', rateLimit: false })

    for (let i = 0; i < 320; i++) {
      expect((await post(app, 'calendar.events.list', {}, READER_TOKEN)).status).toBe(200)
    }
  })

  it('fails closed with a generic 500 when the address limiter throws', async () => {
    const executor = createRecordingExecutor()
    const verifier = createFakeVerifier()
    const runtime = createRuntime({
      executor,
      verifier,
      governance: { policy: ALLOW_ALL_POLICY },
      logger: createCapturedLogger().logger,
    })
    runtime.registerManifest(CALENDAR_MANIFEST)
    const broken: RateLimiter = {
      admit: () => {
        throw new Error('limiter store unavailable')
      },
    }
    const app = createHttpAdapter(runtime, {
      logger: createCapturedLogger().logger,
      clientAddress: () => '203.0.113.7',
      addressRateLimiter: broken,
    })

    const res = await post(new Hono().route('/api/v1', app), 'calendar.events.list', {})

    expect(res.status).toBe(500)
    expect((await errorBody(res)).error.code).toBe('INTERNAL')
    expect(verifier.calls()).toBe(0)
  })
})

describe('routing', () => {
  it('answers an unknown route with 404 NOT_FOUND, outside the error registry', async () => {
    const { app } = createTestServer()

    const res = await app.request('/unknown/path')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No such route.', details: {} },
    })
  })

  it('never lets POST /rpc/<unknown id> reach the runtime', async () => {
    const { app, verifier, executor } = createTestServer()

    const res = await post(app, 'calendar.events.nope', {}, READER_TOKEN)

    expect(res.status).toBe(404)
    expect((await errorBody(res)).error.code).toBe('NOT_FOUND')
    expect(verifier.calls()).toBe(0)
    expect(executor.requests).toHaveLength(0)
  })

  it('treats a non-POST request to an operation path as a route miss', async () => {
    const { app, verifier } = createTestServer()

    const res = await app.request('/api/v1/rpc/calendar.events.list')

    expect(res.status).toBe(404)
    expect(verifier.calls()).toBe(0)
  })

  it('decodes a route miss as a protocol mismatch on the client', async () => {
    const { app } = createTestServer()

    const res = await app.request('/api/v2/rpc/calendar.events.list', { method: 'POST' })
    const decoded = fromWireErrorEnvelope(await res.json(), { status: res.status })

    expect(decoded).toBeInstanceOf(TransportError)
    expect(decoded.details).toEqual({
      reason: 'protocol-mismatch',
      status: 404,
      receivedCode: 'NOT_FOUND',
    })
  })

  it('answers 404 from the adapter alone for an unknown route', async () => {
    const runtime = createRuntime({
      executor: createRecordingExecutor(),
      verifier: createFakeVerifier(),
      governance: { policy: ALLOW_ALL_POLICY },
    })
    runtime.registerManifest(CALENDAR_MANIFEST)
    const adapter = createHttpAdapter(runtime, { addressRateLimiter: false })

    const res = await adapter.request('/rpc/calendar.events.nope', { method: 'POST' })

    expect(res.status).toBe(404)
    expect((await errorBody(res)).error.code).toBe('NOT_FOUND')
  })
})

describe('introspection', () => {
  it('lists the first app with descriptions, parameters, and return types', async () => {
    const { app } = createTestServer()

    const res = await app.request('/api/v1/introspect')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      app: 'Calendar',
      bundleId: 'com.apple.iCal',
      endpoints: [
        {
          path: '/rpc/calendar.events.list',
          permission: 'calendar:events:list',
          method: 'POST',
          description: 'List events',
          parameters: [],
          returns: 'Event[]',
        },
        {
          path: '/rpc/calendar.events.create',
          permission: 'calendar:events:create',
          method: 'POST',
          description: 'Create an event',
          parameters: [
            { name: 'summary', type: 'string', description: 'Title', required: true },
            { name: 'password', type: 'string', description: 'A secret', required: false },
          ],
        },
        {
          path: '/rpc/calendar.events.delete',
          permission: 'calendar:events:delete',
          method: 'POST',
          description: 'Delete an event',
          parameters: [],
        },
        {
          path: '/rpc/calendar.app.quit',
          permission: 'calendar:app:quit',
          method: 'POST',
          description: 'Quit the app',
          parameters: [],
        },
      ],
    })
  })

  it('lists every app in /introspect/all', async () => {
    const { app } = createTestServer()

    const res = await app.request('/api/v1/introspect/all')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      apps: [
        {
          app: 'Calendar',
          bundleId: 'com.apple.iCal',
          endpoints: [
            {
              path: '/rpc/calendar.events.list',
              permission: 'calendar:events:list',
              method: 'POST',
            },
            {
              path: '/rpc/calendar.events.create',
              permission: 'calendar:events:create',
              method: 'POST',
            },
            {
              path: '/rpc/calendar.events.delete',
              permission: 'calendar:events:delete',
              method: 'POST',
            },
            { path: '/rpc/calendar.app.quit', permission: 'calendar:app:quit', method: 'POST' },
          ],
        },
        {
          app: 'Notes',
          bundleId: 'com.apple.Notes',
          endpoints: [
            { path: '/rpc/notes.notes.create', permission: 'notes:notes:create', method: 'POST' },
          ],
        },
      ],
    })
  })
})

describe('credential confidentiality', () => {
  it('never puts the token in a response body or a log line, on any outcome', async () => {
    const throwingExecutor = createRecordingExecutor((request: ExecutionRequest) =>
      request.target.command === 'quit'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ ok: true })
    )
    const { app, log } = createTestServer({
      executor: throwingExecutor,
      rateLimit: { max: 3, clock: fixedClock },
    })
    const bodies: string[] = []
    const record = async (res: Response): Promise<void> => {
      bodies.push(await res.text())
    }

    await record(await post(app, 'calendar.events.list', {}, WRITER_TOKEN))
    await record(await post(app, 'calendar.events.create', { summary: 1 }, WRITER_TOKEN))
    await record(await post(app, 'calendar.app.quit', {}, WRITER_TOKEN))
    await record(await post(app, 'calendar.events.list', {}, WRITER_TOKEN))
    await record(await post(app, 'calendar.events.list', 'nope{', WRITER_TOKEN))
    await record(await post(app, 'calendar.events.create', { summary: 'x' }, READER_TOKEN))
    await record(await post(app, 'calendar.events.list', {}, REVOKED_TOKEN))

    // Every outcome was exercised: success, invalid input, an unexpected
    // failure, a rate-limit denial, invalid JSON, a permission denial, and an
    // authentication failure.
    expect(bodies).toHaveLength(7)
    expect(log.lines.length).toBeGreaterThan(0)
    for (const token of [WRITER_TOKEN, READER_TOKEN, REVOKED_TOKEN]) {
      expect(bodies.join('\n')).not.toContain(token)
      expect(log.lines.join('\n')).not.toContain(token)
    }
    // The unexpected failure's own text stays out of the response.
    expect(bodies.some((b) => b.includes('boom'))).toBe(false)
  })
})

describe('package version', () => {
  it('reports @macts/api package.json version on /health', async () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    ) as { version: string }
    const { app } = createTestServer()

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: 'ok',
      version: pkg.version,
      apps: ['Calendar', 'Notes'],
    })
  })
})

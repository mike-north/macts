/**
 * Tests for the runtime's invocation pipeline.
 *
 * Expected outcomes are hand-written from phases/13: the D5 pipeline table
 * (verify → admission → permission → input validation → governance →
 * execute, in that order, failing closed) and the D6 error table (which canonical class and
 * details each failure carries). Every branch that must not execute is
 * asserted against the recording executor, so "denied" always means "the
 * executor was never called".
 *
 * The executor is a recording stub wired at construction, and the verifier is
 * a fake; the key-store verifier is covered in `invocation/verifier.test.ts`
 * and the assembled path in `executor-seam.test.ts`.
 */

import { describe, expect, it, vi } from 'vitest'
import type { ApprovalDecision } from '@macts/core'
import { createStaticApprovalProvider } from '@macts/core'
import {
  ApprovalPendingError,
  ApprovalRejectedError,
  AuthenticationError,
  InternalError,
  OperationCancelledError,
  PASSTHROUGH_PLAN,
  PermissionDeniedError,
  PolicyDeniedError,
  RateLimitedError,
  TargetNotFoundError,
  ValidationError,
  type Authority,
  type InvocationContext,
  type OperationId,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import type { GovernanceContext } from './governance/context.js'
import { createBearerCredential } from './invocation/credential.js'
import type { RateLimitAdmission, RateLimiter } from './invocation/rate-limiter.js'
import { createRuntime, type RuntimeLogger } from './runtime.js'
import {
  CALENDAR_MANIFEST,
  CONFIRM_FIRST_CALENDAR,
  FIXED_NOW,
  FORBID_ALL,
  createFakeVerifier,
  createMemoryAuditWriter,
  createRecordingApprovalProvider,
  createRecordingExecutor,
  fixedClock,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

const LIST: OperationId = 'calendar.events.list'
const CREATE: OperationId = 'calendar.events.create'
const DELETE: OperationId = 'calendar.events.delete'

const WRITER_SECRET = 'macts_sk_writer-secret-never-logged'
const READER_SECRET = 'macts_sk_reader-secret-never-logged'
const LEGACY_SECRET = 'macts_sk_legacy-secret-never-logged'

const WRITER: Authority = {
  subject: 'key_writer',
  displayName: 'Calendar assistant',
  permissions: ['calendar:events:list', 'calendar:events:create', 'calendar:events:delete'],
}
const READER: Authority = { subject: 'key_reader', permissions: ['calendar:events:list'] }
/** Holds only the permission `delete` had before it was renamed. */
const LEGACY: Authority = { subject: 'key_legacy', permissions: ['calendar:events:remove'] }

const VALID_CREATE_INPUT = { summary: 'Standup', allDay: true }

/** A logger whose calls can be inspected. */
function createSpyLogger(): RuntimeLogger & {
  error: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
} {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}

interface Harness {
  readonly runtime: ReturnType<typeof createRuntime>
  readonly executor: RecordingExecutor
  readonly verifier: ReturnType<typeof createFakeVerifier>
  readonly logger: ReturnType<typeof createSpyLogger>
}

/** What a test varies about the runtime under test. */
interface HarnessOptions {
  readonly executor?: RecordingExecutor
  readonly governance?: GovernanceContext | (() => Promise<GovernanceContext>)
  readonly rateLimiter?: RateLimiter
}

/** A runtime over {@link CALENDAR_MANIFEST} with a recording executor and fake verifier. */
function harness(options: HarnessOptions = {}): Harness {
  const executor = options.executor ?? createRecordingExecutor()
  const verifier = createFakeVerifier({
    [WRITER_SECRET]: WRITER,
    [READER_SECRET]: READER,
    [LEGACY_SECRET]: LEGACY,
  })
  const logger = createSpyLogger()
  const runtime = createRuntime({
    executor,
    verifier,
    clock: fixedClock,
    logger,
    governance: options.governance ?? { policy: ALLOW_ALL_POLICY },
    ...(options.rateLimiter === undefined ? {} : { rateLimiter: options.rateLimiter }),
  })
  runtime.registerManifest(CALENDAR_MANIFEST)
  return { runtime, executor, verifier, logger }
}

/** An invocation context presenting `secret`. */
function as(secret: string, extra: Omit<InvocationContext, 'credential'> = {}): InvocationContext {
  return { credential: createBearerCredential(secret), ...extra }
}

/** Await `promise`, expecting it to reject, and return what it rejected with. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the invocation to fail')
    },
    (error: unknown) => error
  )
}

describe('createRuntime: allowed calls', () => {
  it('executes an authorized, valid call and returns the executor result', async () => {
    const { runtime, executor } = harness()

    const result = await runtime.invoke(LIST, {}, as(READER_SECRET))

    expect(result).toEqual({ events: [] })
    expect(executor.requests).toHaveLength(1)
  })

  it('hands the executor exactly the manifest, target, validated input, plans, and signal', async () => {
    const { runtime, executor } = harness()
    const controller = new AbortController()

    await runtime.invoke(
      CREATE,
      { summary: 'Standup', allDay: true },
      as(WRITER_SECRET, { signal: controller.signal })
    )

    const request = executor.requests[0]
    // D9: an ExecutionRequest carries no credential or authority.
    expect(Object.keys(request ?? {}).sort()).toEqual(
      ['input', 'inputPlan', 'manifest', 'outputPlan', 'resourcePlans', 'signal', 'target'].sort()
    )
    expect(request?.manifest).toBe(CALENDAR_MANIFEST)
    expect(request?.target).toEqual({ command: 'create', resource: 'Event' })
    expect(request?.input).toEqual({ summary: 'Standup', allDay: true })
    expect(request?.inputPlan).toBe(PASSTHROUGH_PLAN)
    expect(request?.outputPlan).toBe(PASSTHROUGH_PLAN)
    // A manifest-only registration has no contract, so an empty table.
    expect(request?.resourcePlans).toEqual({})
    expect(request?.signal).toBe(controller.signal)
    expect(JSON.stringify(request?.input)).not.toContain(WRITER_SECRET)
  })

  it('omits the signal key when the caller supplied none', async () => {
    const { runtime, executor } = harness()
    await runtime.invoke(LIST, {}, as(READER_SECRET))
    expect(executor.requests[0]).not.toHaveProperty('signal')
  })

  it('exposes registered operations by id', () => {
    const { runtime } = harness()
    expect(runtime.operations().map((op) => op.descriptor.id)).toEqual([LIST, CREATE, DELETE])
    expect(runtime.operation(DELETE)?.risk).toBe('delete')
    expect(runtime.operation('calendar.events.missing')).toBeUndefined()
  })
})

describe('step 0: operation lookup and cancellation', () => {
  it('rejects an unknown operation as a validation failure naming the id, after verifying', async () => {
    const { runtime, executor, verifier } = harness()

    const error = await rejection(runtime.invoke('calendar.events.purge', {}, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.message).toContain('calendar.events.purge')
    expect(error.details.issues).toHaveLength(1)
    expect(error.details.issues[0]?.path).toEqual([])
    expect(error.details.issues[0]?.message).toContain('calendar.events.purge')
    expect(verifier.calls()).toBe(1)
    expect(executor.requests).toHaveLength(0)
  })

  it('reports an unauthenticated caller as unauthenticated even for an unknown operation', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(runtime.invoke('calendar.events.purge', {}, as('')))

    expect(error).toBeInstanceOf(AuthenticationError)
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects an already-aborted call as cancelled without verifying', async () => {
    const { runtime, executor, verifier } = harness()
    const controller = new AbortController()
    controller.abort()

    const error = await rejection(
      runtime.invoke(LIST, {}, as(READER_SECRET, { signal: controller.signal }))
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(verifier.calls()).toBe(0)
    expect(executor.requests).toHaveLength(0)
  })

  // An abort during a human hold used to be ignored by the approval wait: the
  // call waited out the full approval timeout, and an approval that arrived in
  // the meantime was audited as 'approved' for a call that never ran.
  it('records a call aborted while awaiting approval as cancelled, never as a decision', async () => {
    const controller = new AbortController()
    const writer = createMemoryAuditWriter()
    const provider = createRecordingApprovalProvider(() => {
      controller.abort()
      return Promise.resolve({ state: 'approved' })
    })
    const { runtime, executor } = harness({
      governance: { policy: CONFIRM_FIRST_CALENDAR, writer, approvals: { provider } },
    })

    const error = await rejection(
      runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET, { signal: controller.signal }))
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(executor.requests).toHaveLength(0)
    expect(writer.records.map((r) => r.decision)).toEqual(['pending', 'cancelled'])
    expect(writer.records[0]?.approvalId).toBe(writer.records[1]?.approvalId)
  })

  it('ends the approval wait as soon as the caller aborts, without waiting out the timeout', async () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const writer = createMemoryAuditWriter()
      let providerSignal: AbortSignal | undefined
      const provider = createRecordingApprovalProvider((_request, context) => {
        providerSignal = context.signal
        return new Promise<ApprovalDecision>(() => undefined)
      })
      const { runtime, executor } = harness({
        governance: {
          policy: CONFIRM_FIRST_CALENDAR,
          writer,
          approvals: { provider, timeoutMs: 600_000 },
        },
      })

      let settled = false
      const pending = rejection(
        runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET, { signal: controller.signal }))
      ).finally(() => {
        settled = true
      })
      await vi.advanceTimersByTimeAsync(1_000)
      expect(settled).toBe(false)

      controller.abort()
      const error = await pending

      expect(error).toBeInstanceOf(OperationCancelledError)
      // The approval timer was cleared rather than left to run out.
      expect(vi.getTimerCount()).toBe(0)
      expect(providerSignal?.aborted).toBe(true)
      expect(executor.requests).toHaveLength(0)
      expect(writer.records.map((r) => r.decision)).toEqual(['pending', 'cancelled'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('still reports the cancellation when the cancellation record cannot be written', async () => {
    const controller = new AbortController()
    // The first append is the 'pending' record; the second, the cancellation, fails.
    const writer = createMemoryAuditWriter([2])
    const provider = createRecordingApprovalProvider(() => {
      controller.abort()
      return new Promise<ApprovalDecision>(() => undefined)
    })
    const { runtime, executor } = harness({
      governance: { policy: CONFIRM_FIRST_CALENDAR, writer, approvals: { provider } },
    })

    const error = await rejection(
      runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET, { signal: controller.signal }))
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(executor.requests).toHaveLength(0)
  })
})

describe('step 1: credential verification', () => {
  it.each([
    ['missing', ''],
    ['invalid', 'macts_sk_unknown'],
  ] as const)('a %s credential fails authentication and never executes', async (reason, secret) => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    const error = await rejection(runtime.invoke(LIST, {}, as(secret)))

    expect(error).toBeInstanceOf(AuthenticationError)
    if (!(error instanceof AuthenticationError)) return
    expect(error.details).toEqual({ reason })
    expect(executor.requests).toHaveLength(0)
    expect(writer.records).toHaveLength(0)
  })

  it('denies with an internal error when the verifier fails unexpectedly', async () => {
    const executor = createRecordingExecutor()
    const runtime = createRuntime({
      executor,
      governance: { policy: ALLOW_ALL_POLICY },
      logger: createSpyLogger(),
      verifier: { verify: () => Promise.reject(new Error('key database is locked')) },
    })
    runtime.registerManifest(CALENDAR_MANIFEST)

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).not.toContain('key database is locked')
    expect(executor.requests).toHaveLength(0)
  })

  it('scrubs the credential from an unexpected verifier failure before logging it', async () => {
    const logger = createSpyLogger()
    const runtime = createRuntime({
      executor: createRecordingExecutor(),
      governance: { policy: ALLOW_ALL_POLICY },
      logger,
      verifier: {
        verify: (credential) =>
          Promise.reject(
            Object.assign(new Error(`upstream rejected token ${credential.reveal()}`), {
              code: 'E_UPSTREAM',
              headers: { authorization: `Bearer ${credential.reveal()}` },
            })
          ),
      },
    })
    runtime.registerManifest(CALENDAR_MANIFEST)

    await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    const logged = JSON.stringify(logger.error.mock.calls)
    expect(logged).not.toContain(READER_SECRET)
    expect(logged).toContain('upstream rejected token [redacted credential]')
    expect(logged).toContain('E_UPSTREAM')
    // Fields beyond name, message, code, and stack are never logged.
    expect(logged).not.toContain('authorization')
  })
})

/** A limiter that records the keys it is asked about and answers with `decide`. */
function recordingLimiter(decide: (key: string) => RateLimitAdmission): RateLimiter & {
  readonly keys: string[]
} {
  const keys: string[] = []
  return {
    keys,
    admit(key) {
      keys.push(key)
      return decide(key)
    },
  }
}

describe('step 1b: admission', () => {
  it('admits a call by the verified subject and leaves the authority untouched', async () => {
    const limiter = recordingLimiter(() => ({ allowed: true }))
    const { runtime, executor } = harness({ rateLimiter: limiter })

    await runtime.invoke(LIST, {}, as(READER_SECRET))

    // Keyed by Authority.subject, never by the secret.
    expect(limiter.keys).toEqual(['key_reader'])
    expect(executor.requests).toHaveLength(1)
  })

  it('turns a denied call away with RateLimitedError carrying the retry delay, never executing', async () => {
    const writer = createMemoryAuditWriter()
    const limiter = recordingLimiter(() => ({ allowed: false, retryAfterSeconds: 37 }))
    const { runtime, executor } = harness({
      rateLimiter: limiter,
      governance: { policy: ALLOW_ALL_POLICY, writer },
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(RateLimitedError)
    if (!(error instanceof RateLimitedError)) return
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.details).toEqual({ retryAfterSeconds: 37 })
    expect(executor.requests).toHaveLength(0)
    // Turned away before governance, so nothing was audited.
    expect(writer.records).toHaveLength(0)
  })

  it('runs before the permission check: a denied caller without the permission sees the limit', async () => {
    const writer = createMemoryAuditWriter()
    const limiter = recordingLimiter(() => ({ allowed: false, retryAfterSeconds: 1 }))
    const { runtime } = harness({
      rateLimiter: limiter,
      governance: { policy: ALLOW_ALL_POLICY, writer },
    })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(READER_SECRET)))

    expect(error).toBeInstanceOf(RateLimitedError)
    // Turned away before the permission check, so no permission-denied record.
    expect(writer.records).toHaveLength(0)
  })

  it('never grants: an admitted caller without the permission is still denied', async () => {
    const limiter = recordingLimiter(() => ({ allowed: true }))
    const { runtime, executor } = harness({ rateLimiter: limiter })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(executor.requests).toHaveLength(0)
  })

  it('runs after verification: an unauthenticated call is never counted', async () => {
    const limiter = recordingLimiter(() => ({ allowed: false, retryAfterSeconds: 1 }))
    const { runtime } = harness({ rateLimiter: limiter })

    const error = await rejection(runtime.invoke(LIST, {}, as('macts_sk_unknown')))

    expect(error).toBeInstanceOf(AuthenticationError)
    expect(limiter.keys).toEqual([])
  })

  it('fails closed with InternalError, not RateLimitedError, when the limiter throws', async () => {
    const limiter: RateLimiter = {
      admit: () => {
        throw new Error('limiter state corrupted at /var/macts/limits')
      },
    }
    const { runtime, executor, logger } = harness({ rateLimiter: limiter })

    const error = await rejection(
      runtime.invoke(LIST, {}, as(READER_SECRET, { correlationId: 'req-9' }))
    )

    expect(error).toBeInstanceOf(InternalError)
    expect(error).not.toBeInstanceOf(RateLimitedError)
    if (!(error instanceof InternalError)) return
    expect(error.message).not.toContain('/var/macts/limits')
    expect(error.details).toEqual({ correlationId: 'req-9' })
    expect(executor.requests).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(READER_SECRET)
  })

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['non-finite', Number.POSITIVE_INFINITY],
  ])(
    'fails closed with InternalError when a denial carries a %s retry delay',
    async (_kind, retryAfterSeconds) => {
      const limiter = recordingLimiter(() => ({ allowed: false, retryAfterSeconds }))
      const { runtime, executor } = harness({ rateLimiter: limiter })

      const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

      expect(error).toBeInstanceOf(InternalError)
      expect(executor.requests).toHaveLength(0)
    }
  )

  it('applies no limit when no limiter is configured', async () => {
    const { runtime, executor } = harness()

    for (let i = 0; i < 150; i++) {
      await runtime.invoke(LIST, {}, as(READER_SECRET))
    }

    expect(executor.requests).toHaveLength(150)
  })
})

describe('step 2: permission check', () => {
  it('denies a caller without the permission, naming it, auditing the denial and executing nothing', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    if (!(error instanceof PermissionDeniedError)) return
    expect(error.details.required).toBe('calendar:events:create')
    // D5: message is the matcher's hint when it has one.
    expect(error.details.hint).toBeDefined()
    expect(error.message).toBe(error.details.hint)
    expect(error.message).toContain('calendar:events:create')
    expect(executor.requests).toHaveLength(0)
    expect(writer.records).toEqual([
      {
        capability: 'calendar:events:create',
        app: 'calendar',
        apiKeyId: 'key_reader',
        decision: 'permission-denied',
        timestamp: FIXED_NOW,
      },
    ])
  })

  it('explains a denial caused by a renamed permission with its changelog', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(runtime.invoke(DELETE, {}, as(LEGACY_SECRET)))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    if (!(error instanceof PermissionDeniedError)) return
    expect(error.details).toEqual({
      required: 'calendar:events:delete',
      hint: 'Permission changed in v0.2.0 (was: calendar:events:remove). Regenerate your API key.',
      changelog: {
        version: '0.2.0',
        previousPermission: 'calendar:events:remove',
        reason: 'Aligned with the delete verb',
      },
    })
    expect(executor.requests).toHaveLength(0)
  })

  it('checks permission before input validation (a caller without permission learns nothing about input)', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(runtime.invoke(CREATE, { summary: 42 }, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(executor.requests).toHaveLength(0)
  })
})

describe('step 4: governance', () => {
  it('denies a call the host policy forbids, auditing it against the subject', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: FORBID_ALL, writer } })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PolicyDeniedError)
    if (!(error instanceof PolicyDeniedError)) return
    expect(error.details).toEqual({ permission: 'calendar:events:list', layer: 'host' })
    expect(executor.requests).toHaveLength(0)
    expect(writer.records).toHaveLength(1)
    expect(writer.records[0]).toMatchObject({
      capability: 'calendar:events:list',
      apiKeyId: 'key_reader',
      decision: 'denied',
      timestamp: FIXED_NOW,
    })
  })

  it('reports a denial from the caller key policy as the key layer', async () => {
    const { runtime, executor } = harness({
      governance: {
        policy: ALLOW_ALL_POLICY,
        keyPolicies: {
          resolve: (apiKeyId) =>
            Promise.resolve(apiKeyId === 'key_reader' ? FORBID_ALL : undefined),
          invalidate: () => undefined,
        },
      },
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PolicyDeniedError)
    if (!(error instanceof PolicyDeniedError)) return
    expect(error.details).toEqual({ permission: 'calendar:events:list', layer: 'key' })
    expect(executor.requests).toHaveLength(0)
  })

  it('withholds a confirm-first call as pending when no approval gate is configured', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({
      governance: { policy: CONFIRM_FIRST_CALENDAR, writer },
    })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ApprovalPendingError)
    if (!(error instanceof ApprovalPendingError)) return
    expect(error.details).toEqual({ permission: 'calendar:events:create', layer: 'host' })
    expect(executor.requests).toHaveLength(0)
    expect(writer.records.map((r) => r.decision)).toEqual(['pending'])
  })

  it('executes a held call a human approves, auditing the hold and the approval with one correlation id', async () => {
    const writer = createMemoryAuditWriter()
    const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
    const { runtime, executor } = harness({
      governance: { policy: CONFIRM_FIRST_CALENDAR, writer, approvals: { provider } },
    })

    await runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET))

    expect(executor.requests).toHaveLength(1)
    expect(writer.records.map((r) => r.decision)).toEqual(['pending', 'approved'])
    const request = provider.requests[0]
    expect(request).toMatchObject({
      permission: 'calendar:events:create',
      risk: 'write',
      identity: { apiKeyId: 'key_writer', apiKeyName: 'Calendar assistant' },
      argsSummary: 'summary: Standup; allDay: true',
      requestedAt: FIXED_NOW,
      layer: 'host',
    })
    expect(writer.records[0]?.approvalId).toBe(request?.id)
    expect(writer.records[1]?.approvalId).toBe(request?.id)
    expect(writer.records.map((r) => r.timestamp)).toEqual([FIXED_NOW, FIXED_NOW])
  })

  it('omits apiKeyName from the approval request when the authority has no display name', async () => {
    const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
    const { runtime } = harness({
      governance: {
        policy: CONFIRM_FIRST_CALENDAR,
        writer: createMemoryAuditWriter(),
        approvals: { provider },
      },
    })

    await runtime.invoke(LIST, {}, as(READER_SECRET))

    expect(provider.requests[0]?.identity).toEqual({ apiKeyId: 'key_reader' })
  })

  it('never executes a held call a human rejects', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({
      governance: {
        policy: CONFIRM_FIRST_CALENDAR,
        writer,
        approvals: {
          provider: createStaticApprovalProvider({ state: 'rejected', reason: 'Not this one' }),
        },
      },
    })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ApprovalRejectedError)
    if (!(error instanceof ApprovalRejectedError)) return
    expect(error.message).toBe('Not this one')
    expect(error.details).toEqual({
      permission: 'calendar:events:create',
      layer: 'host',
      state: 'rejected',
    })
    expect(executor.requests).toHaveLength(0)
    expect(writer.records.map((r) => r.decision)).toEqual(['pending', 'rejected'])
  })

  it('never executes a held call nobody answers in time', async () => {
    vi.useFakeTimers()
    try {
      const { runtime, executor } = harness({
        governance: {
          policy: CONFIRM_FIRST_CALENDAR,
          writer: createMemoryAuditWriter(),
          approvals: {
            provider: createRecordingApprovalProvider(
              () => new Promise<ApprovalDecision>(() => undefined)
            ),
            timeoutMs: 5_000,
          },
        },
      })

      const pending = rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET)))
      await vi.advanceTimersByTimeAsync(5_000)
      const error = await pending

      expect(error).toBeInstanceOf(ApprovalRejectedError)
      if (!(error instanceof ApprovalRejectedError)) return
      expect(error.details.state).toBe('timeout')
      expect(executor.requests).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('denies an approved call whose approval cannot be recorded', async () => {
    // The first append (the hold) succeeds; the second (the approval) fails.
    const writer = createMemoryAuditWriter([2])
    const { runtime, executor, logger } = harness({
      governance: {
        policy: CONFIRM_FIRST_CALENDAR,
        writer,
        approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
      },
    })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ApprovalRejectedError)
    if (!(error instanceof ApprovalRejectedError)) return
    expect(error.details).toEqual({
      permission: 'calendar:events:create',
      layer: 'host',
      state: 'rejected',
    })
    expect(executor.requests).toHaveLength(0)
    expect(logger.error).toHaveBeenCalled()
  })

  it('denies with an internal error when the decision cannot be audited', async () => {
    const writer = createMemoryAuditWriter([1])
    const { runtime, executor, logger } = harness({
      governance: { policy: ALLOW_ALL_POLICY, writer },
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).not.toContain('audit disk full')
    expect(executor.requests).toHaveLength(0)
    // Operator log carries the failure but never the credential.
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(READER_SECRET)
  })

  it('denies with an internal error when the key policy cannot be resolved', async () => {
    const governance: GovernanceContext = {
      policy: ALLOW_ALL_POLICY,
      keyPolicies: {
        resolve: () => Promise.reject(new Error('policy row is corrupt')),
        invalidate: () => undefined,
      },
    }
    const { runtime, executor } = harness({ governance })

    const error = await rejection(
      runtime.invoke(LIST, {}, as(READER_SECRET, { correlationId: 'req-123' }))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.details).toEqual({ correlationId: 'req-123' })
    expect(error.message).not.toContain('policy row is corrupt')
    expect(executor.requests).toHaveLength(0)
  })

  it('records a redacted argument summary that never contains the credential', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    await runtime.invoke(CREATE, VALID_CREATE_INPUT, as(WRITER_SECRET))

    expect(writer.records).toHaveLength(1)
    expect(writer.records[0]).toMatchObject({ argsSummary: 'summary: Standup; allDay: true' })
    expect(JSON.stringify(writer.records)).not.toContain(WRITER_SECRET)
  })

  it('records a non-record input as invalid input, without a summary', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    await rejection(runtime.invoke(LIST, ['not', 'a', 'record'], as(READER_SECRET)))

    expect(writer.records).toEqual([
      {
        capability: 'calendar:events:list',
        app: 'calendar',
        apiKeyId: 'key_reader',
        decision: 'invalid-input',
        timestamp: FIXED_NOW,
        issueCount: 1,
      },
    ])
  })

  it('summarizes a call with no arguments as no arguments', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    await runtime.invoke(LIST, {}, as(READER_SECRET))

    expect(writer.records[0]).toMatchObject({ argsSummary: '(no arguments)' })
  })
})

describe('step 4: governance from a loader', () => {
  it('loads governance once, on the first call that reaches the governance step', async () => {
    const writer = createMemoryAuditWriter()
    const load = vi.fn(() =>
      Promise.resolve<GovernanceContext>({ policy: ALLOW_ALL_POLICY, writer })
    )
    const { runtime, executor } = harness({ governance: load })

    // An unauthenticated call never reaches governance, so nothing is loaded.
    await rejection(runtime.invoke(LIST, {}, as('macts_sk_unknown')))
    expect(load).not.toHaveBeenCalled()

    await runtime.invoke(LIST, {}, as(READER_SECRET))
    await runtime.invoke(LIST, {}, as(READER_SECRET))

    expect(load).toHaveBeenCalledTimes(1)
    expect(writer.records).toHaveLength(2)
    expect(executor.requests).toHaveLength(2)
  })

  it('enforces the loaded policy', async () => {
    const { runtime, executor } = harness({
      governance: () => Promise.resolve({ policy: FORBID_ALL }),
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(executor.requests).toHaveLength(0)
  })

  it('denies every call with an internal error when the loader rejects, logging the cause once per call', async () => {
    const cause = new Error(
      'Invalid governance policy at "/secret/path/policy.json": not valid JSON'
    )
    const load = vi.fn(() => Promise.reject(cause))
    const { runtime, executor, logger } = harness({ governance: load })

    const first = await rejection(
      runtime.invoke(LIST, {}, as(READER_SECRET, { correlationId: 'req-1' }))
    )
    const second = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    for (const error of [first, second]) {
      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).not.toContain('/secret/path')
      expect(error.cause).toBe(cause)
    }
    expect(first).toMatchObject({ details: { correlationId: 'req-1' } })
    // The failed load is kept, not retried: the same broken file would fail again.
    expect(load).toHaveBeenCalledTimes(1)
    expect(executor.requests).toHaveLength(0)
    expect(logger.error).toHaveBeenCalledTimes(2)
    expect(logger.error.mock.calls[0]?.[0]).toMatchObject({ err: cause, operation: LIST })
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(READER_SECRET)
  })

  it('treats a loader that throws synchronously like one that rejects', async () => {
    const { runtime, executor } = harness({
      governance: () => {
        throw new Error('loader exploded')
      },
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBeInstanceOf(InternalError)
    expect(executor.requests).toHaveLength(0)
  })

  it('answers a denied caller with PermissionDeniedError even when governance cannot be loaded', async () => {
    const load = vi.fn(() => Promise.reject(new Error('unreadable')))
    const { runtime, logger } = harness({ governance: load })

    const error = await rejection(runtime.invoke(CREATE, VALID_CREATE_INPUT, as(READER_SECRET)))

    // The loader is consulted only for the audit writer that records the
    // denial; its failure is logged and never changes the caller's answer.
    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(load).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

describe('step 3: input validation', () => {
  it('rejects input that violates the operation contract before governance, never executing', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    const error = await rejection(runtime.invoke(CREATE, { allDay: 'yes' }, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['summary'], ['allDay']])
    expect(executor.requests).toHaveLength(0)
    // Governance never ran: the call is audited only as invalid input.
    expect(writer.records).toEqual([
      {
        capability: 'calendar:events:create',
        app: 'calendar',
        apiKeyId: 'key_writer',
        decision: 'invalid-input',
        timestamp: FIXED_NOW,
        issueCount: 2,
      },
    ])
  })

  it.each([
    ['an array', ['Standup']],
    ['a string', 'Standup'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s as input at the root path', async (_label, input) => {
    const { runtime, executor } = harness()

    const error = await rejection(runtime.invoke(LIST, input, as(READER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues[0]?.path).toEqual([])
    expect(executor.requests).toHaveLength(0)
  })
})

describe('step 5: execution', () => {
  it('turns a non-canonical executor failure into a sanitized internal error, keeping the cause locally', async () => {
    const failure = new Error('osascript: execution error: secret native detail (-1728)')
    const { runtime, logger } = harness({
      executor: createRecordingExecutor(() => Promise.reject(failure)),
    })

    const error = await rejection(
      runtime.invoke(LIST, {}, as(READER_SECRET, { correlationId: 'req-9' }))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).not.toContain('secret native detail')
    expect(JSON.stringify(error)).not.toContain('secret native detail')
    expect(error.details).toEqual({ correlationId: 'req-9' })
    expect(error.cause).toBe(failure)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('passes a canonical executor failure through as the same instance', async () => {
    const notFound = new TargetNotFoundError('No event with that id.', { resource: 'Event' })
    const { runtime } = harness({
      executor: createRecordingExecutor(() => Promise.reject(notFound)),
    })

    const error = await rejection(runtime.invoke(LIST, {}, as(READER_SECRET)))

    expect(error).toBe(notFound)
  })
})

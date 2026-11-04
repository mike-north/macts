/**
 * Tests for what audit and approval records say about a call's arguments, and
 * for where input validation sits in the invocation pipeline.
 *
 * Expected outcomes are hand-written from phases/13 D5:
 *
 * - the pipeline order is verify → admission → permission → input validation
 *   → governance and approval → execute, so a caller without the permission is
 *   denied before its input is judged, and only well-formed calls reach policy,
 *   audit summaries, or an approver;
 * - the argument summary in audit records and approval requests is built from
 *   the operation's declared input parameters, with each value taken from the
 *   validated input and passed through `redactArgs` (sensitive keys redacted,
 *   long text cut at 80 characters); a cursor is recorded only as present;
 *   keys that are not declared parameters are recorded only as a count,
 *   `unknownKeys: N`;
 * - a call rejected by input validation, after it passed the permission check,
 *   writes exactly one `invalid-input` audit record carrying the operation's
 *   permission, the key, the time, and the number of validation issues, and no
 *   argument values, summary, or issue messages; governance is not evaluated
 *   and nobody is asked to approve it.
 *
 * Two registrations of one fixture app are exercised: from its manifest alone,
 * whose request schema lets keys that are not parameters through to the
 * executor, and from a contract, whose input schema rejects them.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md
 */

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { AppManifest, AuditRecord, GovernancePolicy } from '@macts/core'
import {
  ApprovalPendingError,
  ApprovalRejectedError,
  InternalError,
  OperationCancelledError,
  PermissionDeniedError,
  PolicyDeniedError,
  ValidationError,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type Authority,
  type InvocationContext,
  type OperationId,
  type ValueType,
  type WireValue,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import type { GovernanceContext } from './governance/context.js'
import { createBearerCredential } from './invocation/credential.js'
import { createRuntime, type MactsRuntime, type RuntimeLogger } from './runtime.js'
import {
  FIXED_NOW,
  FORBID_ALL,
  LIBRARY_MANIFEST,
  createFakeVerifier,
  createMemoryAuditWriter,
  createRecordingApprovalProvider,
  createRecordingExecutor,
  fixedClock,
  libraryContract,
  type MemoryAuditWriter,
  type RecordingApprovalProvider,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

/**
 * A notes app with one command, `create`, taking a required `title` and an
 * optional `password`.
 *
 * Operation id and permission (hand-derived from the manifest route rules,
 * `app.resource.commandKey` and `app:resource:commandKey`): `vault.notes.create`,
 * `vault:notes:create`.
 */
const VAULT_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Vault', bundleId: 'com.example.vault', tccEntitlements: [] },
  resources: {
    Note: { name: 'Note', plural: 'Notes', description: 'A note', properties: {} },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    create: {
      name: 'create',
      description: 'Create a note',
      scope: 'resource',
      resourceType: 'Note',
      parameters: [
        { name: 'title', type: 'string', description: 'Title', required: true },
        { name: 'password', type: 'string', description: 'A passphrase', required: false },
      ],
    },
  },
}

const CREATE: OperationId = 'vault.notes.create'
const PERMISSION = 'vault:notes:create'

/** The most characters the contract's `title` admits. */
const TITLE_LIMIT = 40

/**
 * The contract input of `vault.notes.create`: the declared `title` and
 * optional `password`, rejecting any other key.
 *
 * @remarks
 * The value library has no length-bounded string, so the wire schema is
 * replaced by hand with one whose `title` admits at most {@link TITLE_LIMIT}
 * characters. That stands for a declared parameter whose contract bounds its
 * length; the plan, which names the declared parameters, is the library's own.
 */
function boundedCreateInput(): ValueType<unknown> {
  const declared = t.record({ title: t.string(), password: t.optional(t.string()) })
  return {
    ...declared,
    wire: z.strictObject({
      title: z.string().max(TITLE_LIMIT),
      password: z.string().exactOptional(),
    }),
  }
}

/** A hand-built contract for {@link VAULT_MANIFEST}, standing in for a generated one. */
function vaultContract(): AppContract<unknown> {
  const create: AnyOperationDescriptor = {
    id: CREATE,
    permission: PERMISSION,
    target: { command: 'create', resource: 'Note' },
    description: 'Create a note',
    input: boundedCreateInput(),
    output: t.record({}),
  }
  return {
    app: 'vault',
    operations: { [CREATE]: create },
    resources: {},
    loadManifest: () => Promise.resolve(VAULT_MANIFEST),
    bind: () => ({}),
  }
}

const WRITER_SECRET = 'macts_sk_vault-writer-secret-never-logged'
const READER_SECRET = 'macts_sk_vault-reader-secret-never-logged'

/** May create notes, and list books in the library fixture. */
const WRITER: Authority = {
  subject: 'key_vault_writer',
  displayName: 'Vault assistant',
  permissions: [PERMISSION, 'library:books:list'],
}
/** Holds no permission of the vault app. */
const READER: Authority = { subject: 'key_vault_reader', permissions: ['library:books:list'] }

/** Every vault operation is held for confirmation. */
const CONFIRM_FIRST_VAULT: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'vault',
      disposition: 'confirm-first',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** A key name that is not one of the operation's parameters, and its value. */
const UNDECLARED_KEY = 'smuggledField'
const UNDECLARED_VALUE = 'undeclared-value-7f3a'

/** How the fixture app is registered: from its manifest alone, or from its contract. */
type Registration = 'manifest' | 'contract'

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly writer: MemoryAuditWriter
  readonly logger: RuntimeLogger & { readonly error: ReturnType<typeof vi.fn> }
}

/** The governance a test runs under, given the harness's audit writer. */
type GovernanceFor = (writer: MemoryAuditWriter) => GovernanceContext

interface HarnessOptions {
  readonly registration?: Registration
  readonly governance?: GovernanceFor
  readonly writer?: MemoryAuditWriter
  readonly executor?: RecordingExecutor
}

/**
 * A runtime with the vault app registered as `registration` says, and the
 * library contract, over a recording executor that answers `{}`, auditing
 * every call to an in-memory writer.
 */
function harness(options: HarnessOptions = {}): Harness {
  const writer = options.writer ?? createMemoryAuditWriter()
  const executor = options.executor ?? createRecordingExecutor(() => Promise.resolve<WireValue>({}))
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier({ [WRITER_SECRET]: WRITER, [READER_SECRET]: READER }),
    clock: fixedClock,
    logger,
    governance: options.governance?.(writer) ?? { policy: ALLOW_ALL_POLICY, writer },
  })
  if ((options.registration ?? 'manifest') === 'manifest') {
    runtime.registerManifest(VAULT_MANIFEST)
  } else {
    runtime.registerContract(vaultContract(), VAULT_MANIFEST)
  }
  runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
  return { runtime, executor, writer, logger }
}

/** An invocation context presenting `secret`. */
function as(secret: string, extra: Omit<InvocationContext, 'credential'> = {}): InvocationContext {
  return { credential: createBearerCredential(secret), ...extra }
}

/** Await `promise`, expecting it to reject, and return what it rejected with. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    (value: unknown) => {
      throw new Error(`expected a rejection, got ${JSON.stringify(value)}`)
    },
    (error: unknown) => error
  )
}

/** The one record an invalid call of `vault.notes.create` by the writer key produces. */
function invalidInputRecord(issueCount: number): AuditRecord {
  return {
    capability: PERMISSION,
    app: 'vault',
    apiKeyId: 'key_vault_writer',
    decision: 'invalid-input',
    timestamp: FIXED_NOW,
    issueCount,
  }
}

/** The argument summaries of every governed record, in order. */
function summaries(writer: MemoryAuditWriter): (string | undefined)[] {
  return writer.records.map((record) =>
    record.decision === 'invalid-input' ? undefined : record.argsSummary
  )
}

/** An approval gate whose provider answers with `decide` and records what it was asked. */
function gated(decide: Parameters<typeof createRecordingApprovalProvider>[0]): {
  provider: RecordingApprovalProvider
  governance: GovernanceFor
} {
  const provider = createRecordingApprovalProvider(decide)
  return {
    provider,
    governance: (writer) => ({ policy: CONFIRM_FIRST_VAULT, writer, approvals: { provider } }),
  }
}

describe('undeclared keys in audit and approval records', () => {
  const INPUT = { title: 'Groceries', [UNDECLARED_KEY]: UNDECLARED_VALUE }
  // The manifest's request schema lets the undeclared key through, so the
  // call is governed; only the count of such keys is recorded.
  const SUMMARY = 'title: Groceries; unknownKeys: 1'

  it.each<[string, GovernanceFor, unknown, readonly string[]]>([
    ['allowed', (writer) => ({ policy: ALLOW_ALL_POLICY, writer }), undefined, ['allowed']],
    ['denied', (writer) => ({ policy: FORBID_ALL, writer }), PolicyDeniedError, ['denied']],
    [
      'pending',
      (writer) => ({ policy: CONFIRM_FIRST_VAULT, writer }),
      ApprovalPendingError,
      ['pending'],
    ],
  ])(
    'records only the count of undeclared keys on a call that is %s',
    async (_decision, governance, errorClass, decisions) => {
      const h = harness({ governance })

      const outcome = h.runtime.invoke(CREATE, INPUT, as(WRITER_SECRET))
      if (errorClass === undefined) await outcome
      else expect(await rejection(outcome)).toBeInstanceOf(errorClass)

      expect(h.writer.records.map((record) => record.decision)).toEqual(decisions)
      expect(summaries(h.writer)).toEqual(decisions.map(() => SUMMARY))
      expect(JSON.stringify(h.writer.records)).not.toContain(UNDECLARED_KEY)
      expect(JSON.stringify(h.writer.records)).not.toContain(UNDECLARED_VALUE)
    }
  )

  it.each<[string, Parameters<typeof createRecordingApprovalProvider>[0], unknown]>([
    ['approved', () => Promise.resolve({ state: 'approved' }), undefined],
    ['rejected', () => Promise.resolve({ state: 'rejected', reason: 'No' }), ApprovalRejectedError],
  ])(
    'keeps undeclared keys out of the approval request and a hold that is %s',
    async (decision, decide, errorClass) => {
      const { provider, governance } = gated(decide)
      const h = harness({ governance })

      const outcome = h.runtime.invoke(CREATE, INPUT, as(WRITER_SECRET))
      if (errorClass === undefined) await outcome
      else expect(await rejection(outcome)).toBeInstanceOf(errorClass)

      expect(h.writer.records.map((record) => record.decision)).toEqual(['pending', decision])
      expect(summaries(h.writer)).toEqual([SUMMARY, SUMMARY])
      expect(provider.requests).toHaveLength(1)
      expect(provider.requests[0]?.argsSummary).toBe(SUMMARY)
      const recorded = JSON.stringify({ audit: h.writer.records, asked: provider.requests })
      expect(recorded).not.toContain(UNDECLARED_KEY)
      expect(recorded).not.toContain(UNDECLARED_VALUE)
    }
  )

  it('keeps undeclared keys out of a hold the caller cancels', async () => {
    const controller = new AbortController()
    const { provider, governance } = gated(() => {
      controller.abort()
      return Promise.resolve({ state: 'approved' })
    })
    const h = harness({ governance })

    const error = await rejection(
      h.runtime.invoke(CREATE, INPUT, as(WRITER_SECRET, { signal: controller.signal }))
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(h.writer.records.map((record) => record.decision)).toEqual(['pending', 'cancelled'])
    expect(summaries(h.writer)).toEqual([SUMMARY, SUMMARY])
    expect(provider.requests[0]?.argsSummary).toBe(SUMMARY)
    const recorded = JSON.stringify({ audit: h.writer.records, asked: provider.requests })
    expect(recorded).not.toContain(UNDECLARED_KEY)
    expect(recorded).not.toContain(UNDECLARED_VALUE)
  })

  it('counts every undeclared key, naming none', async () => {
    const h = harness()

    await h.runtime.invoke(
      CREATE,
      { title: 'Groceries', [UNDECLARED_KEY]: UNDECLARED_VALUE, other: 1, third: [1, 2] },
      as(WRITER_SECRET)
    )

    expect(summaries(h.writer)).toEqual(['title: Groceries; unknownKeys: 3'])
  })

  it('rejects an undeclared key where the contract input does not admit it, as invalid input', async () => {
    const { provider, governance } = gated(() => Promise.resolve({ state: 'approved' }))
    const h = harness({ registration: 'contract', governance })

    const error = await rejection(h.runtime.invoke(CREATE, INPUT, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    expect(provider.requests).toHaveLength(0)
    expect(h.executor.requests).toHaveLength(0)
    expect(h.writer.records).toEqual([invalidInputRecord(1)])
    expect(JSON.stringify(h.writer.records)).not.toContain(UNDECLARED_KEY)
    expect(JSON.stringify(h.writer.records)).not.toContain(UNDECLARED_VALUE)
  })
})

describe('input validation before governance', () => {
  // An over-long title, distinctive so that any trace of it is detectable.
  const LONG_TITLE = `over-long-${'q'.repeat(TITLE_LIMIT)}`

  it.each<[string, Registration, unknown, number]>([
    ['a wrong-typed value', 'manifest', { title: 42 }, 1],
    ['a wrong-typed value', 'contract', { title: 42 }, 1],
    ['a missing required value and a wrong-typed one', 'manifest', { password: 7 }, 2],
    ['an over-long declared string', 'contract', { title: LONG_TITLE }, 1],
    ['a non-record input', 'manifest', ['Groceries'], 1],
  ])(
    'rejects %s (%s registration) with one invalid-input record and no approval request',
    async (_label, registration, input, issueCount) => {
      const { provider, governance } = gated(() => Promise.resolve({ state: 'approved' }))
      const h = harness({ registration, governance })

      const error = await rejection(h.runtime.invoke(CREATE, input, as(WRITER_SECRET)))

      expect(error).toBeInstanceOf(ValidationError)
      if (!(error instanceof ValidationError)) return
      expect(error.details.issues).toHaveLength(issueCount)
      expect(provider.requests).toHaveLength(0)
      expect(h.executor.requests).toHaveLength(0)
      // Exactly one record, with no summary, reason, or issue message.
      expect(h.writer.records).toEqual([invalidInputRecord(issueCount)])
      const recorded = JSON.stringify(h.writer.records)
      expect(recorded).not.toContain('over-long')
      for (const issue of error.details.issues) {
        expect(recorded).not.toContain(issue.message)
      }
    }
  )

  it('never evaluates policy for invalid input: a forbidding policy still yields invalid-input', async () => {
    const h = harness({ governance: (writer) => ({ policy: FORBID_ALL, writer }) })

    const error = await rejection(h.runtime.invoke(CREATE, { title: 42 }, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    expect(h.writer.records).toEqual([invalidInputRecord(1)])
  })

  it('consults no key policy for invalid input', async () => {
    const resolve = vi.fn(() => Promise.resolve(undefined))
    const h = harness({
      governance: (writer) => ({
        policy: ALLOW_ALL_POLICY,
        writer,
        keyPolicies: { resolve, invalidate: () => undefined },
      }),
    })

    await rejection(h.runtime.invoke(CREATE, { title: 42 }, as(WRITER_SECRET)))

    expect(resolve).not.toHaveBeenCalled()
  })

  it('rejects invalid input without a record when no audit writer is configured', async () => {
    const h = harness({ governance: () => ({ policy: ALLOW_ALL_POLICY }) })

    const error = await rejection(h.runtime.invoke(CREATE, { title: 42 }, as(WRITER_SECRET)))

    expect(error).toBeInstanceOf(ValidationError)
    expect(h.writer.records).toEqual([])
  })

  it('fails closed with an internal error when the invalid-input record cannot be written', async () => {
    const h = harness({ writer: createMemoryAuditWriter([1]) })

    const error = await rejection(
      h.runtime.invoke(CREATE, { title: 42 }, as(WRITER_SECRET, { correlationId: 'req-5' }))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.details).toEqual({ correlationId: 'req-5' })
    expect(error.message).not.toContain('audit disk full')
    expect(h.executor.requests).toHaveLength(0)
    expect(h.logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(h.logger.error.mock.calls)).not.toContain(WRITER_SECRET)
  })
})

describe('permission before validation (no schema oracle)', () => {
  it.each<[Registration, unknown]>([
    ['manifest', { title: 42 }],
    ['contract', { title: 42, [UNDECLARED_KEY]: UNDECLARED_VALUE }],
    ['manifest', 'not a record'],
  ])(
    'denies a caller without the permission (%s registration) before judging its input, writing no record',
    async (registration, input) => {
      const { provider, governance } = gated(() => Promise.resolve({ state: 'approved' }))
      const h = harness({ registration, governance })

      const error = await rejection(h.runtime.invoke(CREATE, input, as(READER_SECRET)))

      expect(error).toBeInstanceOf(PermissionDeniedError)
      // A permission denial writes no audit record, so neither does this one.
      expect(h.writer.records).toEqual([])
      expect(provider.requests).toHaveLength(0)
      expect(h.executor.requests).toHaveLength(0)
    }
  )
})

describe('declared parameters in the summary', () => {
  it.each<Registration>(['manifest', 'contract'])(
    'summarizes declared values in declaration order, redacting sensitive keys (%s registration)',
    async (registration) => {
      const { provider, governance } = gated(() => Promise.resolve({ state: 'approved' }))
      const h = harness({ registration, governance })

      // Sent in the other order: the summary follows the declaration.
      await h.runtime.invoke(CREATE, { password: 'hunter2', title: 'Groceries' }, as(WRITER_SECRET))

      const expected = 'title: Groceries; password: [redacted]'
      expect(summaries(h.writer)).toEqual([expected, expected])
      expect(provider.requests[0]?.argsSummary).toBe(expected)
      expect(JSON.stringify(h.writer.records)).not.toContain('hunter2')
    }
  )

  it('leaves an absent optional parameter out of the summary', async () => {
    const h = harness()

    await h.runtime.invoke(CREATE, { title: 'Groceries' }, as(WRITER_SECRET))

    expect(summaries(h.writer)).toEqual(['title: Groceries'])
  })

  it('cuts a long declared value at 80 characters', async () => {
    const h = harness()
    const title = 'a'.repeat(80) + 'TAIL'

    await h.runtime.invoke(CREATE, { title }, as(WRITER_SECRET))

    expect(summaries(h.writer)).toEqual([`title: ${'a'.repeat(80)}…`])
  })

  it('records a presented cursor only as present', async () => {
    const book = { isbn: 'isbn-1', title: 'One', pages: { integer: '1' } }
    // Answers every page window with one book of three, so a next cursor is issued.
    const executor = createRecordingExecutor(() =>
      Promise.resolve<WireValue>({ items: [book], length: 3, last: 'isbn-1' })
    )
    const h = harness({ executor })
    const first = await h.runtime.invoke(
      'library.books.list',
      { pageSize: { integer: '1' } },
      as(WRITER_SECRET)
    )
    const cursor = (first as { readonly nextCursor?: unknown }).nextCursor
    expect(typeof cursor).toBe('string')

    await h.runtime.invoke(
      'library.books.list',
      { pageSize: { integer: '1' }, cursor },
      as(WRITER_SECRET)
    )

    expect(summaries(h.writer)).toEqual([
      'pageSize: [object(1 keys)]',
      'pageSize: [object(1 keys)]; cursor: true',
    ])
    expect(JSON.stringify(h.writer.records)).not.toContain(String(cursor))
  })
})

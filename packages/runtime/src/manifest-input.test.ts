/**
 * Tests for the input contract of operations registered from a manifest
 * alone: exactly the command's declared parameters, as for an operation
 * registered from a contract.
 *
 * Expected outcomes are hand-written from phases/13 D5 and D11:
 *
 * - input is validated against the operation's input contract after the
 *   permission check and before governance; a manifest-registered operation's
 *   contract is its command's parameters, each checked for presence and
 *   primitive type, and no other key;
 * - a key that is not a declared parameter is a `ValidationError` with one
 *   issue at the input itself (`[]`), the call is audited once as
 *   `invalid-input`, nobody is asked to approve it, and the executor is never
 *   called;
 * - only an operation registered from a contract pages (D2, D9): its input
 *   record declares `pageSize` and `cursor`. A manifest-registered list reads
 *   its whole result, so the paging inputs are not part of its contract.
 * - a resource-scoped get, update or delete selects its item by its
 *   identifier parameter, the first required parameter other than its
 *   parent's; a manifest whose get, update or delete declares none is refused
 *   at registration with `OperationRegistrationError`, and nothing from it is
 *   registered, so a call naming one of its operations is an unknown
 *   operation.
 *
 * Operation ids and permissions are derived by hand from the manifest route
 * rules (`app.<resource plural>.<command key>`,
 * `app:<resource plural>:<command key>`).
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D2, D5, D9, D11)
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '@macts/core'
import {
  ValidationError,
  type Authority,
  type InvocationContext,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { createBearerCredential } from './invocation/credential.js'
import { OperationRegistrationError } from './operations/registry.js'
import { createRuntime, type MactsRuntime } from './runtime.js'
import {
  CALENDAR_MANIFEST,
  CONFIRM_FIRST_CALENDAR,
  FIXED_NOW,
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
 * A gadget app whose `get` addresses a gadget by its required `serial`
 * parameter and takes an optional `verbose` flag.
 *
 * Operation ids and permissions: `workshop.gadgets.get`
 * (`workshop:gadgets:get`) and `workshop.app.reset` (`workshop:app:reset`,
 * an application command with no parameters at all).
 */
const WORKSHOP_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Workshop', bundleId: 'com.example.workshop', tccEntitlements: [] },
  resources: {
    Gadget: {
      name: 'Gadget',
      plural: 'Gadgets',
      description: 'A gadget',
      properties: {},
      identifiers: [{ property: 'serial', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one gadget',
      scope: 'resource',
      resourceType: 'Gadget',
      parameters: [
        { name: 'serial', type: 'string', description: 'The gadget', required: true },
        { name: 'verbose', type: 'boolean', description: 'Read every property', required: false },
      ],
    },
    reset: {
      name: 'reset',
      description: 'Reset the workshop',
      scope: 'application',
      parameters: [],
    },
  },
}

const GET_GADGET: OperationId = 'workshop.gadgets.get'
const RESET: OperationId = 'workshop.app.reset'
const LIST_EVENTS: OperationId = 'calendar.events.list'
const CREATE_EVENT: OperationId = 'calendar.events.create'
const LIST_BOOKS: OperationId = 'library.books.list'

const SECRET = 'macts_sk_manifest-input-secret-never-logged'

/** Holds every permission the tests' operations require. */
const OPERATOR: Authority = {
  subject: 'key_operator',
  permissions: [
    'workshop:gadgets:get',
    'workshop:app:reset',
    'calendar:events:list',
    'calendar:events:create',
    'library:books:list',
  ],
}

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly writer: MemoryAuditWriter
  readonly provider: RecordingApprovalProvider
}

/**
 * A runtime with the workshop, calendar, and library apps registered from
 * their manifests alone, over a recording executor that answers `respond`.
 * Calendar operations are held for approval, which an approver grants.
 */
function harness(respond: () => Promise<WireValue> = () => Promise.resolve({})): Harness {
  const writer = createMemoryAuditWriter()
  const executor = createRecordingExecutor(respond)
  const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier({ [SECRET]: OPERATOR }),
    clock: fixedClock,
    governance: { policy: ALLOW_ALL_POLICY, writer, approvals: { provider } },
  })
  runtime.registerManifest(WORKSHOP_MANIFEST)
  runtime.registerManifest(CALENDAR_MANIFEST)
  runtime.registerManifest(LIBRARY_MANIFEST)
  return { runtime, executor, writer, provider }
}

/** The invocation context presenting the operator's key. */
function asOperator(): InvocationContext {
  return { credential: createBearerCredential(SECRET) }
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

/** The one record a rejected call of an operation needing `permission` produces. */
function invalidInputRecord(permission: string, app: string) {
  return {
    capability: permission,
    app,
    apiKeyId: 'key_operator',
    decision: 'invalid-input',
    timestamp: FIXED_NOW,
    issueCount: 1,
  }
}

/**
 * Expect `error` to be the rejection of undeclared keys: a `ValidationError`
 * with one issue, at the input record itself.
 */
function expectUndeclaredKeyRejection(error: unknown): void {
  expect(error).toBeInstanceOf(ValidationError)
  if (!(error instanceof ValidationError)) return
  expect(error.details.issues).toEqual([
    expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
  ])
}

describe('undeclared keys in a manifest-registered operation', () => {
  it('rejects an undeclared key with one invalid-input record and no approval request', async () => {
    const h = harness()

    const error = await rejection(
      h.runtime.invoke(CREATE_EVENT, { summary: 'Standup', organizer: 'ada' }, asOperator())
    )

    expectUndeclaredKeyRejection(error)
    expect(h.executor.requests).toHaveLength(0)
    expect(h.provider.requests).toHaveLength(0)
    expect(h.writer.records).toEqual([invalidInputRecord('calendar:events:create', 'calendar')])
  })

  it('reports several undeclared keys as one issue, so the record counts one', async () => {
    const h = harness()

    const error = await rejection(
      h.runtime.invoke(CREATE_EVENT, { summary: 'Standup', a: 1, b: [2], c: null }, asOperator())
    )

    expectUndeclaredKeyRejection(error)
    expect(h.writer.records).toEqual([invalidInputRecord('calendar:events:create', 'calendar')])
  })

  it('reports a wrongly typed declared value alongside an undeclared key', async () => {
    const h = harness()

    const error = await rejection(
      h.runtime.invoke(CREATE_EVENT, { summary: 7, organizer: 'ada' }, asOperator())
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([['summary'], []])
    )
    expect(h.executor.requests).toHaveLength(0)
  })
})

describe('an undeclared id', () => {
  it('is rejected beside the declared identifier before execution, so nothing is looked up', async () => {
    const h = harness()

    const error = await rejection(
      h.runtime.invoke(GET_GADGET, { serial: 'g-1', id: 'gadget-7' }, asOperator())
    )

    expectUndeclaredKeyRejection(error)
    expect(h.executor.requests).toHaveLength(0)
    expect(h.executor.resolutions).toHaveLength(0)
    expect(h.writer.records).toEqual([invalidInputRecord('workshop:gadgets:get', 'workshop')])
  })

  it('cannot stand in for the declared identifier', async () => {
    const h = harness()

    const error = await rejection(h.runtime.invoke(GET_GADGET, { id: 'gadget-7' }, asOperator()))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([['serial'], []])
    )
    expect(h.executor.requests).toHaveLength(0)
  })
})

describe('a get with no identifier parameter', () => {
  /**
   * The workshop app with a `get` that declares only the optional `verbose`
   * flag: no required parameter, so its native body would have no declared
   * identifier to select a gadget by and would fall back to reading an `id`
   * argument the input contract does not declare.
   */
  const UNADDRESSABLE: AppManifest = {
    ...WORKSHOP_MANIFEST,
    commands: {
      ...WORKSHOP_MANIFEST.commands,
      get: {
        name: 'get',
        description: 'Get one gadget',
        scope: 'resource',
        resourceType: 'Gadget',
        parameters: [
          { name: 'verbose', type: 'boolean', description: 'Read every property', required: false },
        ],
      },
    },
  }

  /** A runtime over a recording executor, with nothing registered yet. */
  function unregisteredHarness(): { runtime: MactsRuntime; executor: RecordingExecutor } {
    const executor = createRecordingExecutor()
    const runtime = createRuntime({
      executor,
      verifier: createFakeVerifier({ [SECRET]: OPERATOR }),
      clock: fixedClock,
      governance: { policy: ALLOW_ALL_POLICY },
    })
    return { runtime, executor }
  }

  it('is refused at registration, which registers nothing from the app', () => {
    const { runtime } = unregisteredHarness()

    const register = (): void => {
      runtime.registerManifest(UNADDRESSABLE)
    }
    expect(register).toThrow(OperationRegistrationError)
    expect(register).toThrow(/App "Workshop".*"get".*identifier parameter/s)
    expect(runtime.operation(GET_GADGET)).toBeUndefined()
    expect(runtime.operation(RESET)).toBeUndefined()
  })

  it('answers a call carrying an id as an unknown operation, so nothing is looked up', async () => {
    const { runtime, executor } = unregisteredHarness()
    expect(() => {
      runtime.registerManifest(UNADDRESSABLE)
    }).toThrow(OperationRegistrationError)

    const error = await rejection(runtime.invoke(GET_GADGET, { id: 'gadget-7' }, asOperator()))

    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toMatchObject({ message: `Unknown operation "${GET_GADGET}".` })
    expect(executor.requests).toHaveLength(0)
    expect(executor.resolutions).toHaveLength(0)
  })
})

describe('declared keys of a manifest-registered operation', () => {
  it('accepts every declared parameter and passes exactly those to the executor', async () => {
    const h = harness()

    await h.runtime.invoke(CREATE_EVENT, { summary: 'Standup', allDay: true }, asOperator())

    expect(h.executor.requests).toHaveLength(1)
    expect(h.executor.requests[0]?.input).toEqual({ summary: 'Standup', allDay: true })
    expect(h.provider.requests).toHaveLength(0)
    expect(h.writer.records.map((record) => record.decision)).toEqual(['allowed'])
  })

  it('accepts a declared optional parameter left out', async () => {
    const h = harness()

    await h.runtime.invoke(GET_GADGET, { serial: 'g-1' }, asOperator())

    expect(h.executor.requests[0]?.input).toEqual({ serial: 'g-1' })
  })

  it('reads a manifest-registered list whole, with no page window', async () => {
    const books = [{ isbn: 'isbn-1' }, { isbn: 'isbn-2' }]
    const h = harness(() => Promise.resolve(books))

    const result = await h.runtime.invoke(LIST_BOOKS, {}, asOperator())

    expect(result).toEqual(books)
    expect(h.executor.requests).toHaveLength(1)
    expect(h.executor.requests[0]?.input).toEqual({})
    expect(h.executor.requests[0]?.page).toBeUndefined()
  })

  it.each<[string, Record<string, WireValue>]>([
    ['pageSize', { pageSize: { integer: '1' } }],
    ['cursor', { cursor: 'v1.anything' }],
  ])(
    'rejects %s for a manifest-registered list, whose contract does not page',
    async (_key, input) => {
      const h = harness()

      const error = await rejection(h.runtime.invoke(LIST_BOOKS, input, asOperator()))

      expectUndeclaredKeyRejection(error)
      expect(h.executor.requests).toHaveLength(0)
      expect(h.writer.records).toEqual([invalidInputRecord('library:books:list', 'library')])
    }
  )
})

describe('a manifest-registered operation with no parameters', () => {
  it.each<[string, OperationId]>([
    ['a resource list', LIST_EVENTS],
    ['an application command', RESET],
  ])('accepts an empty input for %s', async (_label, id) => {
    const h = harness()

    await h.runtime.invoke(id, {}, asOperator())

    expect(h.executor.requests).toHaveLength(1)
    expect(h.executor.requests[0]?.input).toEqual({})
  })

  it.each<[string, OperationId]>([
    ['a resource list', LIST_EVENTS],
    ['an application command', RESET],
  ])('rejects any key for %s', async (_label, id) => {
    const h = harness()

    const error = await rejection(h.runtime.invoke(id, { anything: 'at all' }, asOperator()))

    expectUndeclaredKeyRejection(error)
    expect(h.executor.requests).toHaveLength(0)
  })
})

describe('parity with contract registration', () => {
  /** A runtime with the library app registered from its contract. */
  function contractHarness(respond: () => Promise<WireValue>): Harness {
    const writer = createMemoryAuditWriter()
    const executor = createRecordingExecutor(respond)
    const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
    const runtime = createRuntime({
      executor,
      verifier: createFakeVerifier({ [SECRET]: OPERATOR }),
      clock: fixedClock,
      governance: { policy: ALLOW_ALL_POLICY, writer, approvals: { provider } },
    })
    runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
    return { runtime, executor, writer, provider }
  }

  it('rejects an undeclared key for the same list registered from its contract', async () => {
    const h = contractHarness(() => Promise.resolve({ items: [], length: 0 }))

    const error = await rejection(h.runtime.invoke(LIST_BOOKS, { shelf: 'A' }, asOperator()))

    expectUndeclaredKeyRejection(error)
    expect(h.executor.requests).toHaveLength(0)
    expect(h.writer.records).toEqual([invalidInputRecord('library:books:list', 'library')])
  })

  it('still pages the same list registered from its contract', async () => {
    const book = { isbn: 'isbn-1', title: 'One', pages: { integer: '1' } }
    const h = contractHarness(() => Promise.resolve({ items: [book], length: 2, last: 'isbn-1' }))

    const first = await h.runtime.invoke(LIST_BOOKS, { pageSize: { integer: '1' } }, asOperator())
    const cursor = (first as { readonly nextCursor?: unknown }).nextCursor
    expect(typeof cursor).toBe('string')
    await h.runtime.invoke(LIST_BOOKS, { pageSize: { integer: '1' }, cursor }, asOperator())

    expect(h.executor.requests.map((request) => request.page)).toEqual([
      { offset: 0, size: 1 },
      { offset: 1, size: 1, anchor: 'isbn-1' },
    ])
  })
})

describe('approval of a manifest-registered operation', () => {
  it('never asks an approver about a call with an undeclared key', async () => {
    const writer = createMemoryAuditWriter()
    const executor = createRecordingExecutor()
    const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
    const runtime = createRuntime({
      executor,
      verifier: createFakeVerifier({ [SECRET]: OPERATOR }),
      clock: fixedClock,
      governance: { policy: CONFIRM_FIRST_CALENDAR, writer, approvals: { provider } },
    })
    runtime.registerManifest(CALENDAR_MANIFEST)

    const error = await rejection(
      runtime.invoke(CREATE_EVENT, { summary: 'Standup', password: 'hunter2' }, asOperator())
    )

    expectUndeclaredKeyRejection(error)
    expect(provider.requests).toHaveLength(0)
    expect(executor.requests).toHaveLength(0)
    expect(writer.records).toEqual([invalidInputRecord('calendar:events:create', 'calendar')])
    expect(JSON.stringify(writer.records)).not.toContain('hunter2')
  })
})

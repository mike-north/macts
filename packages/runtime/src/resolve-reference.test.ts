/**
 * Tests for reference resolution through the runtime.
 *
 * Expected outcomes are hand-written from phases/13:
 *
 * - D7: a single reference resolves as its resource's `get` operation and a
 *   collection reference as its `list` operation, needing that operation's
 *   permission (and no container's); a resource without the operation fails
 *   with `InvalidSelectionError`; the wire rules `t.reference` enforces.
 * - D5: the pipeline order (verify → admission → permission → governance and
 *   approval → validation → executor), failing closed.
 * - D6: which canonical class and details each failure carries.
 * - D11: the runtime validates what it receives, in the same place for
 *   resolution as for `invoke`.
 *
 * Operation ids and permissions of the fixture app are derived by hand in
 * `LIBRARY_MANIFEST`. Every branch that must not resolve is asserted against
 * the recording executor, so "denied" always means "the executor was never
 * called".
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md
 */

import { describe, expect, it, vi } from 'vitest'
import type { GovernancePolicy } from '@macts/core'
import {
  ApprovalPendingError,
  AuthenticationError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  PermissionDeniedError,
  PolicyDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
  ValueTypes as t,
  type Authority,
  type AppContract,
  type InvocationContext,
  type ResourceDescriptor,
  type ValuePlan,
  type WireValue,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import type { GovernanceContext } from './governance/context.js'
import { createBearerCredential } from './invocation/credential.js'
import { OperationRegistrationError } from './operations/registry.js'
import { createRuntime, type MactsRuntime, type RuntimeLogger } from './runtime.js'
import {
  CALENDAR_MANIFEST,
  FIXED_NOW,
  BOOK_RECORD,
  LIBRARY_MANIFEST,
  createFakeVerifier,
  createMemoryAuditWriter,
  createRecordingApprovalProvider,
  createRecordingExecutor,
  fixedClock,
  libraryContract,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

const BOOK_READER_SECRET = 'macts_sk_book-reader-secret-never-logged'
const SHELF_READER_SECRET = 'macts_sk_shelf-reader-secret-never-logged'
const LIBRARIAN_SECRET = 'macts_sk_librarian-secret-never-logged'
const PAGE_LISTER_SECRET = 'macts_sk_page-lister-secret-never-logged'

/** May read one book (the Book get operation) and nothing else. */
const BOOK_READER: Authority = {
  subject: 'key_book_reader',
  permissions: ['library:books:lookupBook'],
}
/** May read and list shelves, but not books. */
const SHELF_READER: Authority = {
  subject: 'key_shelf_reader',
  permissions: ['library:shelves:get', 'library:shelves:list'],
}
/** May list pages, and nothing else: no book or shelf permission. */
const PAGE_LISTER: Authority = { subject: 'key_page_lister', permissions: ['library:pages:list'] }
/** Holds every permission the library app's operations require. */
const LIBRARIAN: Authority = {
  subject: 'key_librarian',
  displayName: 'Librarian',
  permissions: [
    'library:shelves:get',
    'library:shelves:list',
    'library:books:lookupBook',
    'library:books:describeBook',
    'library:books:list',
    'library:pages:list',
    'library:stamps:get',
  ],
}

/** Every library operation is held for confirmation. */
const CONFIRM_FIRST_LIBRARY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'library',
      disposition: 'confirm-first',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** The library app is allowed, except reading one book (its get operation). */
const FORBID_BOOK_GET: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'library',
      disposition: 'allowed',
      operations: [{ operation: 'lookupBook', disposition: 'forbidden', tags: [] }],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** The plan of a book record, written from the record's fields (D2). */
const BOOK_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    isbn: { value: { kind: 'string' }, presence: 'required' },
    title: { value: { kind: 'string' }, presence: 'required' },
    pages: { value: { kind: 'integer' }, presence: 'required' },
  },
}

/** A book in wire form; `pages` is an integer control record (D3). */
const DUNE_WIRE = { isbn: '978-0441013593', title: 'Dune', pages: { integer: '412' } }

/** The book named "Dune", wherever books are kept. */
const DUNE_BY_NAME = {
  resource: 'Book',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'name', name: 'Dune' },
} as const

/** A book identified within an identified shelf. */
const DUNE_ON_SHELF = {
  resource: 'Book',
  form: 'identity',
  cardinality: 'one',
  id: '978-0441013593',
  container: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
} as const

/** Every book. */
const EVERY_BOOK = {
  resource: 'Book',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const

/** Two explicitly identified books. */
const TWO_BOOKS = {
  resource: 'Book',
  form: 'identity',
  cardinality: 'many',
  entries: [
    { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0441013593' },
    { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0553293357' },
  ],
} as const

/** Wrap a reference payload in its wire control record, as encoding produces it (D7). */
function wire(payload: unknown): { readonly reference: unknown } {
  return { reference: payload }
}

/** A logger whose calls can be inspected. */
function createSpyLogger(): RuntimeLogger & {
  error: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
} {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly verifier: ReturnType<typeof createFakeVerifier>
  readonly logger: ReturnType<typeof createSpyLogger>
}

/** What a test varies about the runtime under test. */
interface HarnessOptions {
  readonly executor?: RecordingExecutor
  readonly governance?: GovernanceContext | (() => Promise<GovernanceContext>)
}

/**
 * A runtime with the library contract registered, plus the calendar app from
 * its manifest alone, over a recording executor and a fake verifier.
 */
function harness(options: HarnessOptions = {}): Harness {
  const executor = options.executor ?? createRecordingExecutor()
  const verifier = createFakeVerifier({
    [BOOK_READER_SECRET]: BOOK_READER,
    [SHELF_READER_SECRET]: SHELF_READER,
    [LIBRARIAN_SECRET]: LIBRARIAN,
    [PAGE_LISTER_SECRET]: PAGE_LISTER,
  })
  const logger = createSpyLogger()
  const runtime = createRuntime({
    executor,
    verifier,
    clock: fixedClock,
    logger,
    governance: options.governance ?? { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
  runtime.registerManifest(CALENDAR_MANIFEST)
  return { runtime, executor, verifier, logger }
}

/** A runtime with nothing registered, over `executor`, for registration tests. */
function bareRuntime(executor: RecordingExecutor = createRecordingExecutor()): MactsRuntime {
  return createRuntime({
    executor,
    verifier: createFakeVerifier({ [LIBRARIAN_SECRET]: LIBRARIAN }),
    clock: fixedClock,
    logger: createSpyLogger(),
    governance: { policy: ALLOW_ALL_POLICY },
  })
}

/** The library contract with one resource's descriptor replaced by `change(descriptor)`. */
function libraryContractWithResource(
  resource: string,
  change: (descriptor: ResourceDescriptor<unknown>) => ResourceDescriptor<unknown>
): AppContract<unknown> {
  const base = libraryContract()
  const descriptor = base.resources[resource]
  if (descriptor === undefined) throw new Error(`the fixture has no ${resource} resource`)
  return { ...base, resources: { ...base.resources, [resource]: change(descriptor) } }
}

/**
 * The library contract cut down to some of its resources: their descriptors,
 * and only the operations that target them.
 */
function libraryContractOf(resources: readonly string[]): AppContract<unknown> {
  const base = libraryContract()
  return {
    ...base,
    operations: Object.fromEntries(
      Object.entries(base.operations).filter(([, op]) =>
        resources.includes(op.target.resource ?? '')
      )
    ),
    resources: Object.fromEntries(
      Object.entries(base.resources).filter(([key]) => resources.includes(key))
    ),
  }
}

/** A recording executor whose resolutions all answer `result`. */
function resolvingTo(result: WireValue): RecordingExecutor {
  return createRecordingExecutor(undefined, () => Promise.resolve(result))
}

/** A recording executor whose resolutions all fail with `error`. */
function failingWith(error: Error): RecordingExecutor {
  return createRecordingExecutor(undefined, () => Promise.reject(error))
}

/** An invocation context presenting `secret`. */
function as(secret: string, extra: Omit<InvocationContext, 'credential'> = {}): InvocationContext {
  return { credential: createBearerCredential(secret), ...extra }
}

/** Await `promise`, expecting it to reject, and return what it rejected with. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the resolution to fail')
    },
    (error: unknown) => error
  )
}

describe('resolveReference: allowed resolutions', () => {
  it('resolves a single reference through the executor and returns its record', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo(DUNE_WIRE) })

    const result = await runtime.resolveReference(
      'library',
      wire(DUNE_BY_NAME),
      as(BOOK_READER_SECRET)
    )

    expect(result).toEqual({ isbn: '978-0441013593', title: 'Dune', pages: { integer: '412' } })
    expect(executor.resolutions).toHaveLength(1)
    expect(executor.requests).toHaveLength(0)
  })

  it('hands the executor the manifest, the validated reference payload, and the get output plan', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo(DUNE_WIRE) })

    await runtime.resolveReference('library', wire(DUNE_ON_SHELF), as(BOOK_READER_SECRET))

    expect(executor.resolutions).toEqual([
      {
        manifest: LIBRARY_MANIFEST,
        reference: {
          resource: 'Book',
          form: 'identity',
          cardinality: 'one',
          id: '978-0441013593',
          container: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
        },
        outputPlan: BOOK_PLAN,
      },
    ])
    expect(executor.resolutions[0]?.manifest).toBe(LIBRARY_MANIFEST)
    expect(Object.hasOwn(executor.resolutions[0] ?? {}, 'signal')).toBe(false)
  })

  it('resolves a collection reference to the full array of records, never a page', async () => {
    const three = [DUNE_WIRE, { ...DUNE_WIRE, isbn: 'b' }, { ...DUNE_WIRE, isbn: 'c' }]
    const { runtime, executor } = harness({ executor: resolvingTo(three) })

    const result = await runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))

    // Resolution is not paged (D7 step 8): no page window, no `items` wrapper.
    expect(result).toEqual(three)
    expect(executor.requests).toHaveLength(0)
    expect(Object.hasOwn(executor.resolutions[0] ?? {}, 'page')).toBe(false)
  })

  it('hands a collection reference an array of the list item plan, not the page plan', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo([DUNE_WIRE]) })

    await runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))

    expect(executor.resolutions[0]?.outputPlan).toEqual({ kind: 'array', items: BOOK_PLAN })
    expect(executor.resolutions[0]?.reference).toEqual({
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    })
  })

  it('passes a wire-encoded identifier through unchanged', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo({ serial: { integer: '7' } }) })

    const result = await runtime.resolveReference(
      'library',
      wire({ resource: 'Stamp', form: 'identity', cardinality: 'one', id: { integer: '7' } }),
      as(LIBRARIAN_SECRET)
    )

    expect(result).toEqual({ serial: { integer: '7' } })
    expect(executor.resolutions[0]?.reference).toEqual({
      resource: 'Stamp',
      form: 'identity',
      cardinality: 'one',
      id: { integer: '7' },
    })
    expect(executor.resolutions[0]?.outputPlan).toEqual({
      kind: 'record',
      fields: { serial: { value: { kind: 'integer' }, presence: 'required' } },
    })
  })

  it("passes the caller's signal to the executor", async () => {
    const { runtime, executor } = harness({ executor: resolvingTo(DUNE_WIRE) })
    const signal = new AbortController().signal

    await runtime.resolveReference(
      'library',
      wire(DUNE_BY_NAME),
      as(BOOK_READER_SECRET, { signal })
    )

    expect(executor.resolutions[0]?.signal).toBe(signal)
  })

  it('resolves a single reference by index selector', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo(DUNE_WIRE) })
    const firstBook = {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
    }

    const result = await runtime.resolveReference(
      'library',
      wire(firstBook),
      as(BOOK_READER_SECRET)
    )

    expect(result).toEqual(DUNE_WIRE)
    expect(executor.resolutions[0]?.reference).toEqual({
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
    })
  })

  it('resolves through a two-level container chain with a selector container, needing no container permission', async () => {
    // Every page of the book named "Dune" on shelf SF-1. PAGE_LISTER holds
    // only the Page list permission: neither container's is required.
    const pagesOfDune = {
      resource: 'Page',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      container: {
        resource: 'Book',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Dune' },
        container: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
      },
    }
    const { runtime, executor } = harness({ executor: resolvingTo([{ text: 'Chapter 1' }]) })

    const result = await runtime.resolveReference(
      'library',
      wire(pagesOfDune),
      as(PAGE_LISTER_SECRET)
    )

    expect(result).toEqual([{ text: 'Chapter 1' }])
    expect(executor.resolutions[0]?.reference).toEqual({
      resource: 'Page',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      container: {
        resource: 'Book',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Dune' },
        container: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
      },
    })
  })

  it('resolves an identity collection to one record per entry, in order', async () => {
    const foundation = { isbn: '978-0553293357', title: 'Foundation', pages: { integer: '255' } }
    const { runtime } = harness({ executor: resolvingTo([DUNE_WIRE, foundation]) })

    await expect(
      runtime.resolveReference('library', wire(TWO_BOOKS), as(LIBRARIAN_SECRET))
    ).resolves.toEqual([DUNE_WIRE, foundation])
  })

  it('resolves an identity collection with no entries to [] (D7)', async () => {
    const { runtime } = harness({ executor: resolvingTo([]) })

    await expect(
      runtime.resolveReference(
        'library',
        wire({ resource: 'Book', form: 'identity', cardinality: 'many', entries: [] }),
        as(LIBRARIAN_SECRET)
      )
    ).resolves.toEqual([])
  })

  it('treats an empty collection as a successful result (D7: possibly empty)', async () => {
    const { runtime } = harness({ executor: resolvingTo([]) })

    await expect(
      runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))
    ).resolves.toEqual([])
  })

  it('accepts a range whose start equals its end, a valid empty range (D7)', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo([]) })
    const emptyRange = {
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: { integer: '2' }, end: { integer: '2' } },
    }

    const result = await runtime.resolveReference('library', wire(emptyRange), as(LIBRARIAN_SECRET))

    expect(result).toEqual([])
    expect(executor.resolutions[0]?.reference).toEqual(emptyRange)
  })
})

describe('resolveReference: lookup, authentication, and cancellation', () => {
  it('rejects an unknown app as a validation failure naming it, after verifying', async () => {
    const { runtime, executor, verifier } = harness()

    const error = await rejection(
      runtime.resolveReference('magazines', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.message).toBe('Unknown app "magazines".')
    expect(error.details).toEqual({
      issues: [{ path: [], message: 'No app contract is registered for "magazines"' }],
    })
    expect(verifier.calls()).toBe(1)
    expect(executor.resolutions).toHaveLength(0)
  })

  it('treats an app registered from its manifest alone as unknown: it has no resource table', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('calendar', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(ValidationError)
    expect(executor.resolutions).toHaveLength(0)
  })

  it('reports an unauthenticated caller as unauthenticated, even for an unknown app', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('magazines', wire(DUNE_BY_NAME), as('macts_sk_unknown'))
    )

    expect(error).toBeInstanceOf(AuthenticationError)
    expect(executor.resolutions).toHaveLength(0)
  })

  it('rejects an already-aborted resolution as cancelled without verifying', async () => {
    const { runtime, executor, verifier } = harness()
    const controller = new AbortController()
    controller.abort()

    const error = await rejection(
      runtime.resolveReference(
        'library',
        wire(DUNE_BY_NAME),
        as(BOOK_READER_SECRET, { signal: controller.signal })
      )
    )

    expect(error).toBeInstanceOf(OperationCancelledError)
    expect(verifier.calls()).toBe(0)
    expect(executor.resolutions).toHaveLength(0)
  })
})

describe('resolveReference: permission (D7)', () => {
  it("denies a single reference to a key without the resource's get permission, as invoke does", async () => {
    const { runtime, executor } = harness()

    const resolveError = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(SHELF_READER_SECRET))
    )
    const invokeError = await rejection(
      runtime.invoke('library.books.lookupBook', {}, as(SHELF_READER_SECRET))
    )

    expect(resolveError).toBeInstanceOf(PermissionDeniedError)
    if (!(resolveError instanceof PermissionDeniedError)) return
    expect(resolveError.details.required).toBe('library:books:lookupBook')
    expect(invokeError).toBeInstanceOf(PermissionDeniedError)
    if (!(invokeError instanceof PermissionDeniedError)) return
    expect(resolveError.details).toEqual(invokeError.details)
    expect(resolveError.message).toBe(invokeError.message)
    expect(executor.resolutions).toHaveLength(0)
  })

  it('denies a collection reference to a key that holds get but not list', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('library', wire(EVERY_BOOK), as(BOOK_READER_SECRET))
    )

    expect(error).toBeInstanceOf(PermissionDeniedError)
    if (!(error instanceof PermissionDeniedError)) return
    expect(error.details.required).toBe('library:books:list')
    expect(executor.resolutions).toHaveLength(0)
  })

  it('requires the list permission for an identity collection too', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('library', wire(TWO_BOOKS), as(BOOK_READER_SECRET))
    )

    expect(error).toBeInstanceOf(PermissionDeniedError)
    if (!(error instanceof PermissionDeniedError)) return
    expect(error.details.required).toBe('library:books:list')
    expect(executor.resolutions).toHaveLength(0)
  })

  it("does not require a container's permission: the book reader resolves a book on a shelf", async () => {
    const { runtime, executor } = harness({ executor: resolvingTo(DUNE_WIRE) })

    // BOOK_READER holds no Shelf permission at all.
    await expect(
      runtime.resolveReference('library', wire(DUNE_ON_SHELF), as(BOOK_READER_SECRET))
    ).resolves.toEqual(DUNE_WIRE)
    expect(executor.resolutions).toHaveLength(1)
  })

  it("is not satisfied by a container's permission: the shelf reader cannot resolve a book on a shelf", async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_ON_SHELF), as(SHELF_READER_SECRET))
    )

    expect(error).toBeInstanceOf(PermissionDeniedError)
    if (!(error instanceof PermissionDeniedError)) return
    expect(error.details.required).toBe('library:books:lookupBook')
    expect(executor.resolutions).toHaveLength(0)
  })

  it('denies before validating: a caller without the permission learns nothing about the reference contract', async () => {
    const { runtime, executor } = harness()
    const negativeIndex = {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '-1' } },
    }

    const error = await rejection(
      runtime.resolveReference('library', wire(negativeIndex), as(SHELF_READER_SECRET))
    )

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(executor.resolutions).toHaveLength(0)
  })
})

describe('resolveReference: governance, approval, and audit (D5)', () => {
  it('denies a resolution the policy forbids for the get operation, auditing it as that operation', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: FORBID_BOOK_GET, writer } })

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(PolicyDeniedError)
    if (!(error instanceof PolicyDeniedError)) return
    expect(error.details).toEqual({ permission: 'library:books:lookupBook', layer: 'host' })
    expect(executor.resolutions).toHaveLength(0)
    expect(writer.records).toHaveLength(1)
    expect(writer.records[0]).toMatchObject({
      capability: 'library:books:lookupBook',
      app: 'library',
      apiKeyId: 'key_librarian',
      decision: 'denied',
      timestamp: FIXED_NOW,
    })
  })

  it('governs a collection reference as the list operation, which that policy allows', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({
      executor: resolvingTo([]),
      governance: { policy: FORBID_BOOK_GET, writer },
    })

    await runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))

    expect(executor.resolutions).toHaveLength(1)
    expect(writer.records).toHaveLength(1)
    expect(writer.records[0]).toMatchObject({
      capability: 'library:books:list',
      app: 'library',
      apiKeyId: 'key_librarian',
      decision: 'allowed',
    })
  })

  it('audits an allowed resolution with the reference summarized as its arguments', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime } = harness({
      executor: resolvingTo(DUNE_WIRE),
      governance: { policy: ALLOW_ALL_POLICY, writer },
    })

    await runtime.resolveReference('library', wire(DUNE_BY_NAME), as(BOOK_READER_SECRET))

    expect(writer.records).toEqual([
      expect.objectContaining({
        capability: 'library:books:lookupBook',
        app: 'library',
        apiKeyId: 'key_book_reader',
        decision: 'allowed',
        // Scalars inline and objects as a key count (redactArgs).
        argsSummary: 'resource: Book; form: selector; cardinality: one; selector: [object(2 keys)]',
        timestamp: FIXED_NOW,
      }),
    ])
  })

  it('withholds a confirm-first resolution as pending when no approval gate is configured', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({
      governance: { policy: CONFIRM_FIRST_LIBRARY, writer },
    })

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(ApprovalPendingError)
    if (!(error instanceof ApprovalPendingError)) return
    expect(error.details).toEqual({ permission: 'library:books:lookupBook', layer: 'host' })
    expect(executor.resolutions).toHaveLength(0)
    expect(writer.records.map((r) => r.decision)).toEqual(['pending'])
  })

  it('resolves a held reference a human approves, asking about the get operation', async () => {
    const writer = createMemoryAuditWriter()
    const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
    const { runtime, executor } = harness({
      executor: resolvingTo(DUNE_WIRE),
      governance: { policy: CONFIRM_FIRST_LIBRARY, writer, approvals: { provider } },
    })

    await runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))

    expect(executor.resolutions).toHaveLength(1)
    expect(writer.records.map((r) => [r.capability, r.decision])).toEqual([
      ['library:books:lookupBook', 'pending'],
      ['library:books:lookupBook', 'approved'],
    ])
    expect(provider.requests[0]).toMatchObject({
      permission: 'library:books:lookupBook',
      risk: 'read',
      identity: { apiKeyId: 'key_librarian', apiKeyName: 'Librarian' },
      requestedAt: FIXED_NOW,
      layer: 'host',
    })
  })

  it('fails closed with an internal error when the policy cannot be loaded, never resolving', async () => {
    const cause = new Error('Invalid governance policy at "/secret/policy.json": not valid JSON')
    const { runtime, executor } = harness({ governance: () => Promise.reject(cause) })

    const error = await rejection(
      runtime.resolveReference(
        'library',
        wire(DUNE_BY_NAME),
        as(LIBRARIAN_SECRET, { correlationId: 'req-7' })
      )
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.details).toEqual({ correlationId: 'req-7' })
    expect(error.message).not.toContain('/secret')
    expect(executor.resolutions).toHaveLength(0)
  })

  it('governs and audits a malformed reference from an authorized caller before rejecting it', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: FORBID_BOOK_GET, writer } })
    const negativeIndex = {
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '-1' } },
    }

    const error = await rejection(
      runtime.resolveReference('library', wire(negativeIndex), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(writer.records.map((r) => [r.capability, r.decision])).toEqual([
      ['library:books:lookupBook', 'denied'],
    ])
    expect(executor.resolutions).toHaveLength(0)
  })
})

describe('resolveReference: reference validation (D7)', () => {
  it.each<[string, unknown]>([
    ['a payload without its control record', DUNE_BY_NAME],
    ['a control record whose payload is not a record', { reference: 'Dune' }],
    ['a non-record reference', 'Dune'],
  ])('rejects %s before any authorization', async (_name, reference) => {
    const { runtime, executor } = harness()

    // A key with no library permissions: shape is checked before permission.
    const error = await rejection(
      runtime.resolveReference('library', reference, as(SHELF_READER_SECRET))
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([[]])
    expect(executor.resolutions).toHaveLength(0)
  })

  it.each<[string, unknown, readonly (string | number)[]]>([
    [
      'an unknown resource key',
      { ...DUNE_BY_NAME, resource: 'Magazine' },
      ['reference', 'resource'],
    ],
    [
      'a resource that is not a string',
      { ...DUNE_BY_NAME, resource: 7 },
      ['reference', 'resource'],
    ],
    ['a missing resource', { form: 'selector', cardinality: 'one' }, ['reference', 'resource']],
    [
      'an unknown cardinality',
      { ...DUNE_BY_NAME, cardinality: 'some' },
      ['reference', 'cardinality'],
    ],
    ['a missing cardinality', { resource: 'Book', form: 'selector' }, ['reference', 'cardinality']],
  ])('rejects %s, which selects no operation, at its path', async (_name, payload, path) => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference('library', wire(payload), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([path])
    expect(executor.resolutions).toHaveLength(0)
  })

  it.each<[string, unknown]>([
    [
      'an identity form on a resource without an identifier',
      {
        resource: 'Page',
        form: 'identity',
        cardinality: 'many',
        entries: [{ resource: 'Page', form: 'identity', cardinality: 'one', id: 'p-1' }],
      },
    ],
    [
      'a negative index',
      {
        resource: 'Book',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '-1' } },
      },
    ],
    [
      'an index that is a plain number, not an integer control record',
      {
        resource: 'Book',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: 0 },
      },
    ],
    [
      'a range whose start exceeds its end',
      {
        resource: 'Book',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '3' }, end: { integer: '1' } },
      },
    ],
    [
      'a container that is not a single reference',
      {
        ...DUNE_BY_NAME,
        container: {
          resource: 'Shelf',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'every' },
        },
      },
    ],
    [
      'a container naming an unknown resource',
      {
        ...DUNE_BY_NAME,
        container: {
          resource: 'Magazine',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: { integer: '0' } },
        },
      },
    ],
    [
      'a field from the other form (a selector on an identity reference)',
      {
        resource: 'Book',
        form: 'identity',
        cardinality: 'one',
        id: '978-0441013593',
        selector: { by: 'name', name: 'Dune' },
      },
    ],
    ['an undeclared field', { ...DUNE_BY_NAME, note: 'extra' }],
    [
      'an identity-collection entry for another resource',
      {
        resource: 'Book',
        form: 'identity',
        cardinality: 'many',
        entries: [{ resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' }],
      },
    ],
    [
      'an identity-collection entry that is a selector',
      {
        resource: 'Book',
        form: 'identity',
        cardinality: 'many',
        entries: [DUNE_BY_NAME],
      },
    ],
    [
      'an identifier of the wrong wire type',
      { resource: 'Stamp', form: 'identity', cardinality: 'one', id: 'seven' },
    ],
  ])('rejects %s after governance, never resolving', async (_name, payload) => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    const error = await rejection(
      runtime.resolveReference('library', wire(payload), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.details.issues.length).toBeGreaterThan(0)
    expect(executor.resolutions).toHaveLength(0)
    // Validation follows governance, as in invoke: the attempt was audited.
    expect(writer.records).toHaveLength(1)
  })
})

describe('resolveReference: resources without a resolving operation (D7)', () => {
  it('fails a single reference to a resource with no get operation with InvalidSelectionError', async () => {
    const writer = createMemoryAuditWriter()
    const { runtime, executor } = harness({ governance: { policy: ALLOW_ALL_POLICY, writer } })

    const error = await rejection(
      runtime.resolveReference(
        'library',
        wire({
          resource: 'Page',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: { integer: '0' } },
        }),
        as(LIBRARIAN_SECRET)
      )
    )

    expect(error).toBeInstanceOf(InvalidSelectionError)
    if (!(error instanceof InvalidSelectionError)) return
    expect(error.details).toEqual({ resource: 'Page' })
    expect(executor.resolutions).toHaveLength(0)
    expect(writer.records).toHaveLength(0)
  })

  it('fails a collection reference to a resource with no list operation with InvalidSelectionError', async () => {
    const { runtime, executor } = harness()

    const error = await rejection(
      runtime.resolveReference(
        'library',
        wire({
          resource: 'Stamp',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'every' },
        }),
        as(LIBRARIAN_SECRET)
      )
    )

    expect(error).toBeInstanceOf(InvalidSelectionError)
    if (!(error instanceof InvalidSelectionError)) return
    expect(error.details).toEqual({ resource: 'Stamp' })
    expect(executor.resolutions).toHaveLength(0)
  })

  it('resolves as the operation the contract records, not one re-derived from the manifest', async () => {
    // The contract records Book's get as `library.books.describeBook` here,
    // although the manifest's CRUD-shaped get command is `lookupBook`: the
    // recorded operation is authoritative.
    const contract = libraryContractWithResource('Book', (book) => ({
      ...book,
      get: 'library.books.describeBook',
    }))
    const executor = resolvingTo('A novel about a desert planet')
    const runtime = bareRuntime(executor)
    runtime.registerContract(contract, LIBRARY_MANIFEST)

    const result = await runtime.resolveReference(
      'library',
      wire({ resource: 'Book', form: 'identity', cardinality: 'one', id: 'b1' }),
      as(LIBRARIAN_SECRET)
    )

    expect(result).toBe('A novel about a desert planet')
    // describeBook's output is a string (LIBRARY_OPERATIONS), not a book record.
    expect(executor.resolutions[0]?.outputPlan).toEqual({ kind: 'string' })
  })

  it('still resolves the operation a resource does have', async () => {
    const { runtime, executor } = harness({ executor: resolvingTo([{ text: 'Chapter 1' }]) })

    const result = await runtime.resolveReference(
      'library',
      wire({ resource: 'Page', form: 'selector', cardinality: 'many', selector: { by: 'every' } }),
      as(LIBRARIAN_SECRET)
    )

    expect(result).toEqual([{ text: 'Chapter 1' }])
    expect(executor.resolutions).toHaveLength(1)
  })
})

describe('resolveReference: result validation (D11)', () => {
  it('rejects a record that violates the get output contract with UnexpectedValueError', async () => {
    // `pages` arrives as a plain number instead of an integer control record.
    const { runtime } = harness({
      executor: resolvingTo({ isbn: '978-0441013593', title: 'Dune', pages: 412 }),
    })

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(BOOK_READER_SECRET))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.code).toBe('UNEXPECTED_VALUE')
    // D11: an output mismatch means the operation ran, so the message says so.
    expect(error.message).toBe(
      'The "library.books.lookupBook" operation ran in the app to resolve a reference, but its result does not match its contract; do not assume it had no effect.'
    )
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['pages']])
  })

  it('rejects an identity collection result that drops an entry (D7: never dropped)', async () => {
    // Two entries, one record: the executor omitted an entry instead of
    // reporting it as TargetNotFoundError with its entryIndex.
    const { runtime } = harness({ executor: resolvingTo([DUNE_WIRE]) })

    const error = await rejection(
      runtime.resolveReference('library', wire(TWO_BOOKS), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.message).toBe(
      'The result of resolving an identity collection as "library.books.list" must hold one record per entry: expected 2 records, received 1.'
    )
    expect(error.details.issues).toEqual([
      { path: [], message: 'Expected 2 records, one per entry, but received 1' },
    ])
  })

  it('rejects an identity collection result with more records than entries', async () => {
    const { runtime } = harness({ executor: resolvingTo([DUNE_WIRE, DUNE_WIRE, DUNE_WIRE]) })

    const error = await rejection(
      runtime.resolveReference('library', wire(TWO_BOOKS), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('rejects a single record where the list output contract requires an array', async () => {
    const { runtime } = harness({ executor: resolvingTo(DUNE_WIRE) })

    const error = await rejection(
      runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
  })
})

describe('resolveReference: executor failures (D6)', () => {
  it('passes TargetNotFoundError through as the same instance', async () => {
    const missing = new TargetNotFoundError('No book is named "Dune".', { resource: 'Book' })
    const { runtime } = harness({ executor: failingWith(missing) })

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(BOOK_READER_SECRET))
    )

    expect(error).toBe(missing)
  })

  it('passes InvalidSelectionError through as the same instance, distinguishable from a missing target', async () => {
    const pastEnd = new InvalidSelectionError('The range extends past the last book.', {
      resource: 'Book',
    })
    const { runtime } = harness({ executor: failingWith(pastEnd) })

    const error = await rejection(
      runtime.resolveReference(
        'library',
        wire({
          resource: 'Book',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'range', start: { integer: '0' }, end: { integer: '99' } },
        }),
        as(LIBRARIAN_SECRET)
      )
    )

    expect(error).toBe(pastEnd)
    expect(error).not.toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof InvalidSelectionError)) return
    expect(error.code).toBe('INVALID_SELECTION')
  })

  it('passes through a missing identity-collection entry, naming its position', async () => {
    const missingEntry = new TargetNotFoundError('The second book no longer exists.', {
      resource: 'Book',
      entryIndex: 1,
    })
    const { runtime } = harness({ executor: failingWith(missingEntry) })

    const error = await rejection(
      runtime.resolveReference('library', wire(TWO_BOOKS), as(LIBRARIAN_SECRET))
    )

    expect(error).toBe(missingEntry)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Book', entryIndex: 1 })
  })

  it('turns a non-canonical executor failure into a sanitized internal error', async () => {
    const cause = new Error(`automation failed for ${LIBRARIAN_SECRET}`)
    const { runtime, logger } = harness({ executor: failingWith(cause) })

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe('The operation failed unexpectedly.')
    expect(error.cause).toBe(cause)
    expect(logger.error.mock.calls[0]?.[0]).toMatchObject({
      app: 'library',
      call: 'resolveReference',
      operation: 'library.books.lookupBook',
      provider: 'recording-stub',
    })
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(LIBRARIAN_SECRET)
  })
})

describe('registerContract: one contract per app', () => {
  it('refuses a second contract for an app, adding nothing from it', () => {
    const { runtime } = harness()
    const before = runtime.operations()

    expect(() => {
      runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
    }).toThrow(OperationRegistrationError)
    expect(() => {
      runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
    }).toThrow('A contract for app "library" is already registered')
    expect(runtime.operations()).toEqual(before)
  })

  it('refuses a second contract for an app even when its operation ids are all new', async () => {
    // The two contracts share no operation id, so only the one-contract-per-app
    // rule can refuse the second.
    const runtime = bareRuntime(resolvingTo([]))
    runtime.registerContract(libraryContractOf(['Shelf']), LIBRARY_MANIFEST)
    const before = runtime.operations()

    expect(() => {
      runtime.registerContract(libraryContractOf(['Book']), LIBRARY_MANIFEST)
    }).toThrow('A contract for app "library" is already registered')
    expect(runtime.operations()).toEqual(before)
    // Book references stay unknown: the refused contract's resource table never registered.
    const error = await rejection(
      runtime.resolveReference('library', wire(EVERY_BOOK), as(LIBRARIAN_SECRET))
    )
    expect(error).toBeInstanceOf(ValidationError)
  })

  it('registers no app when the operation registry refuses the contract', async () => {
    const runtime = bareRuntime()
    runtime.registerManifest(LIBRARY_MANIFEST)
    const before = runtime.operations()

    // Every contract operation id is already registered from the manifest.
    expect(() => {
      runtime.registerContract(libraryContract(), LIBRARY_MANIFEST)
    }).toThrow(OperationRegistrationError)
    expect(runtime.operations()).toEqual(before)

    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )
    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.message).toBe('Unknown app "library".')
  })
})

describe('registerContract: recorded resolving operations', () => {
  it('refuses a contract whose recorded get is not one of its operations, registering nothing', async () => {
    const contract = libraryContractWithResource('Shelf', (shelf) => ({
      ...shelf,
      get: 'library.shelves.vanished',
    }))
    const runtime = bareRuntime()

    expect(() => {
      runtime.registerContract(contract, LIBRARY_MANIFEST)
    }).toThrow(OperationRegistrationError)
    expect(() => {
      runtime.registerContract(contract, LIBRARY_MANIFEST)
    }).toThrow(
      'The library contract is inconsistent: resource "Shelf" records "library.shelves.vanished" as its get operation, which is not one of its operations. Regenerate the contract.'
    )
    expect(runtime.operations()).toEqual([])
    const error = await rejection(
      runtime.resolveReference('library', wire(DUNE_BY_NAME), as(LIBRARIAN_SECRET))
    )
    expect(error).toBeInstanceOf(ValidationError)
  })

  it('refuses a contract whose recorded list does not return a page, registering nothing', () => {
    const base = libraryContract()
    const list = base.operations['library.books.list']
    if (list === undefined) throw new Error('fixture lost its book list')
    const contract: AppContract<unknown> = {
      ...base,
      operations: {
        ...base.operations,
        'library.books.list': { ...list, output: t.array(BOOK_RECORD) },
      },
    }
    const runtime = bareRuntime()

    expect(() => {
      runtime.registerContract(contract, LIBRARY_MANIFEST)
    }).toThrow(
      'The library contract is inconsistent: resource "Book" records "library.books.list" as its list operation, whose output is not a page. Regenerate the contract.'
    )
    expect(runtime.operations()).toEqual([])
  })

  it('refuses a contract whose recorded list targets a different resource', () => {
    const contract = libraryContractWithResource('Book', (book) => ({
      ...book,
      list: 'library.shelves.list',
    }))
    const runtime = bareRuntime()

    expect(() => {
      runtime.registerContract(contract, LIBRARY_MANIFEST)
    }).toThrow(
      'The library contract is inconsistent: resource "Book" records "library.shelves.list" as its list operation, which targets resource "Shelf". Regenerate the contract.'
    )
    expect(runtime.operations()).toEqual([])
  })
})

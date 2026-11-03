/**
 * Tests for calls the runtime must refuse because they can never run.
 *
 * Expected outcomes are hand-written from phases/13 D7 ("Resolvable targets")
 * and D5/D11:
 *
 * - A reference in a raw operation input must name an object the app can
 *   resolve: the reference's own resource, and every container's, needs its
 *   `get`. The runtime's check of the input against `input.wire` (D11) applies
 *   the rule, so `invoke` fails with `ValidationError` and the executor is
 *   never called. The raw wire check names no deeper path than the reference
 *   itself: a reference that matches none of the wire forms is one issue at
 *   the reference.
 * - An operation marked `unavailable` is answered exactly as an unknown
 *   operation: the same `ValidationError` after verification and admission,
 *   and before permission, governance or approval, so no human is asked to
 *   approve it. Reference resolution finds its operation through the same
 *   lookup, so a resource whose resolving operation is unavailable is not
 *   resolvable.
 *
 * Operation ids and permissions are derived by hand from the manifest route
 * rules (`app.<resource plural>.<command key>`,
 * `app:<resource plural>:<command key>`), as in `LIBRARY_MANIFEST`.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest, GovernancePolicy } from '@macts/core'
import {
  InvalidSelectionError,
  ValidationError,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type Authority,
  type InvocationContext,
  type OperationId,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import type { GovernanceContext } from './governance/context.js'
import { createBearerCredential } from './invocation/credential.js'
import { createRuntime, type MactsRuntime } from './runtime.js'
import {
  LIBRARY_MANIFEST,
  createFakeVerifier,
  createMemoryAuditWriter,
  createRecordingApprovalProvider,
  createRecordingExecutor,
  fixedClock,
  libraryContract,
  type RecordingApprovalProvider,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

const LIBRARIAN_SECRET = 'macts_sk_librarian-secret-never-logged'

/** The id, permission and command of the operation whose input takes references. */
const SHELVE_BOOK: OperationId = 'library.books.shelveBook'

/** Holds every permission the fixture's operations require. */
const LIBRARIAN: Authority = {
  subject: 'key_librarian',
  permissions: [
    'library:shelves:get',
    'library:shelves:list',
    'library:books:lookupBook',
    'library:books:describeBook',
    'library:books:list',
    'library:books:shelveBook',
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

/** {@link LIBRARY_MANIFEST} with a `shelveBook` command on books. */
const MANIFEST: AppManifest = {
  ...LIBRARY_MANIFEST,
  commands: {
    ...LIBRARY_MANIFEST.commands,
    shelveBook: {
      name: 'shelve',
      description: 'Shelve a book',
      scope: 'resource',
      resourceType: 'Book',
      parameters: [],
    },
  },
}

/**
 * The library contract plus `shelveBook`, whose input takes a shelf (a
 * resource with a `get`) and a page (a resource with no `get`), with the
 * descriptors named in `unavailable` marked unavailable.
 */
function contract(unavailable: readonly OperationId[] = []): AppContract<unknown> {
  const base = libraryContract()
  const scope = (): AppContract<unknown> => built
  const shelveBook: AnyOperationDescriptor = {
    id: SHELVE_BOOK,
    permission: 'library:books:shelveBook',
    target: { command: 'shelveBook', resource: 'Book' },
    description: 'Shelve a book',
    input: t.record({
      shelf: t.optional(t.reference(scope, 'Shelf', 'one')),
      page: t.optional(t.reference(scope, 'Page', 'one')),
    }),
    output: t.none(),
  }
  const operations = Object.fromEntries(
    [...Object.values(base.operations), shelveBook].map((operation) => [
      operation.id,
      unavailable.includes(operation.id)
        ? {
            ...operation,
            unavailable: {
              positions: ['id'],
              reason: 'Not available: `id` admits no value, so the operation cannot be called.',
            },
          }
        : operation,
    ])
  )
  const built: AppContract<unknown> = { ...base, operations }
  return built
}

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly provider: RecordingApprovalProvider
}

/** A runtime with the contract registered, over a recording executor and approver. */
function harness(
  options: {
    readonly unavailable?: readonly OperationId[]
    readonly policy?: GovernancePolicy
  } = {}
): Harness {
  // Every execution answers no value, the wire form of `shelveBook`'s result.
  const executor = createRecordingExecutor(() => Promise.resolve(null))
  const provider = createRecordingApprovalProvider(() => Promise.resolve({ state: 'approved' }))
  const governance: GovernanceContext = {
    policy: options.policy ?? ALLOW_ALL_POLICY,
    writer: createMemoryAuditWriter(),
    approvals: { provider },
  }
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier({ [LIBRARIAN_SECRET]: LIBRARIAN }),
    clock: fixedClock,
    logger: { error: () => undefined, warn: () => undefined, info: () => undefined },
    governance,
  })
  runtime.registerContract(contract(options.unavailable), MANIFEST)
  return { runtime, executor, provider }
}

/** An invocation context presenting the librarian's key. */
const librarian = (): InvocationContext => ({
  credential: createBearerCredential(LIBRARIAN_SECRET),
})

/** Await `promise`, expecting it to reject, and return what it rejected with. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the call to fail')
    },
    (error: unknown) => error
  )
}

/** The error and details `invoke` answers an unknown operation id with. */
function unknownOperation(id: string): { message: string; details: unknown } {
  return {
    message: `Unknown operation "${id}".`,
    details: { issues: [{ path: [], message: `No operation is registered with id "${id}"` }] },
  }
}

describe('invoke: a reference in raw input must name a resolvable object (D7)', () => {
  it('runs a call whose references name resources the app can get', async () => {
    const { runtime, executor } = harness()

    await runtime.invoke(
      SHELVE_BOOK,
      {
        shelf: {
          reference: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
        },
      },
      librarian()
    )

    expect(executor.requests).toHaveLength(1)
  })

  it('rejects a reference whose own resource has no get with ValidationError, executing nothing', async () => {
    const { runtime, executor } = harness()
    const page = {
      resource: 'Page',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
    }

    const error = await rejection(
      runtime.invoke(SHELVE_BOOK, { page: { reference: page } }, librarian())
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['page', 'reference']])
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a reference whose container has no get with ValidationError, executing nothing', async () => {
    const { runtime, executor } = harness()
    const shelfOnPage = {
      resource: 'Shelf',
      form: 'identity',
      cardinality: 'one',
      id: 'SF-1',
      container: {
        resource: 'Page',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '0' } },
      },
    }

    const error = await rejection(
      runtime.invoke(SHELVE_BOOK, { shelf: { reference: shelfOnPage } }, librarian())
    )

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['shelf', 'reference']])
    expect(executor.requests).toHaveLength(0)
  })
})

describe('invoke: an operation marked unavailable is answered as unknown (D7)', () => {
  it('asks for approval of the operation while it is available, so the policy holds it', async () => {
    const { runtime, provider } = harness({ policy: CONFIRM_FIRST_LIBRARY })

    // The executor's `null` is not the operation's string output, so the
    // approved call then fails output validation; only the approval request
    // matters here.
    await runtime.invoke('library.books.describeBook', {}, librarian()).catch(() => undefined)

    expect(provider.requests).toHaveLength(1)
  })

  it('fails with the unknown-operation error, never asking for approval or executing', async () => {
    const { runtime, executor, provider } = harness({
      unavailable: ['library.books.describeBook'],
      policy: CONFIRM_FIRST_LIBRARY,
    })

    const unavailable = await rejection(
      runtime.invoke('library.books.describeBook', {}, librarian())
    )
    const unknown = await rejection(runtime.invoke('library.books.nope', {}, librarian()))

    expect(unavailable).toBeInstanceOf(ValidationError)
    expect(unknown).toBeInstanceOf(ValidationError)
    if (!(unavailable instanceof ValidationError) || !(unknown instanceof ValidationError)) return
    expect({ message: unavailable.message, details: unavailable.details }).toEqual(
      unknownOperation('library.books.describeBook')
    )
    expect({ message: unknown.message, details: unknown.details }).toEqual(
      unknownOperation('library.books.nope')
    )
    expect(provider.requests).toHaveLength(0)
    expect(executor.requests).toHaveLength(0)
  })

  it('stays registered, so it is still listed with its descriptor', () => {
    const { runtime } = harness({ unavailable: ['library.books.describeBook'] })

    expect(runtime.operation('library.books.describeBook')?.descriptor.unavailable).toBeDefined()
  })
})

describe('resolveReference: a resolving operation marked unavailable (D7)', () => {
  it('fails as for a resource with no get, never asking for approval or resolving', async () => {
    const { runtime, executor, provider } = harness({
      unavailable: ['library.stamps.get'],
      policy: CONFIRM_FIRST_LIBRARY,
    })
    const stamp = { resource: 'Stamp', form: 'identity', cardinality: 'one', id: { integer: '7' } }

    const error = await rejection(
      runtime.resolveReference('library', { reference: stamp }, librarian())
    )

    expect(error).toBeInstanceOf(InvalidSelectionError)
    if (!(error instanceof InvalidSelectionError)) return
    expect(error.message).toBe(
      'References to "Stamp" cannot be resolved: the library app has no get operation for it.'
    )
    expect(error.details).toEqual({ resource: 'Stamp' })
    expect(provider.requests).toHaveLength(0)
    expect(executor.resolutions).toHaveLength(0)
  })
})

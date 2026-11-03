/**
 * Tests for the runtime's validation of operation results against their
 * output contracts.
 *
 * Expected outcomes are hand-written from phases/13 D11:
 *
 * - Every executor result whose output plan is not `passthrough` is validated
 *   against the operation's `output.wire`, on `invoke` and on resolution,
 *   before any adapter emits it. A conforming result is returned unchanged.
 * - The skip is keyed by the operation's output plan, never by the executor:
 *   a `passthrough` result is returned unchanged even where `output.wire`
 *   would reject it.
 * - A mismatch is `UnexpectedValueError` whose issues give paths but no
 *   values, and whose message says the operation ran, so a caller does not
 *   assume it had no effect.
 * - An identity collection's result must hold one record per entry whatever
 *   the output plan (D7).
 *
 * The fixture is the library contract of `runtime-test-helpers.ts`, with
 * individual operations' outputs replaced where a test needs a different
 * contract. Operation ids and permissions are derived by hand there.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9, D11)
 */

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  PASSTHROUGH_PLAN,
  UnexpectedValueError,
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
import { createBearerCredential } from './invocation/credential.js'
import { toValidationIssues } from './operations/passthrough.js'
import { createRuntime, type MactsRuntime, type RuntimeLogger } from './runtime.js'
import {
  BOOK_RECORD,
  LIBRARY_MANIFEST,
  createFakeVerifier,
  createRecordingExecutor,
  fixedClock,
  libraryContract,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

const LIBRARIAN_SECRET = 'macts_sk_librarian-secret-never-logged'

/** Holds the permissions of every library operation these tests call. */
const LIBRARIAN: Authority = {
  subject: 'key_librarian',
  permissions: [
    'library:books:lookupBook',
    'library:books:list',
    'library:pages:list',
    'library:shelves:get',
  ],
}

/** The message every output mismatch carries, by operation and purpose (D11). */
function ranMessage(id: string, purpose?: string): string {
  return `The "${id}" operation ran in the app${purpose === undefined ? '' : ` ${purpose}`}, but its result does not match its contract; do not assume it had no effect.`
}

/** A book in wire form; `pages` is an integer control record (D3). */
const DUNE_WIRE = { isbn: '978-0441013593', title: 'Dune', pages: { integer: '412' } }

/** A single identified book, as a reference control record (D7). */
const DUNE_REFERENCE = {
  reference: { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0441013593' },
}

/** Two identified books. */
const TWO_BOOKS_REFERENCE = {
  reference: {
    resource: 'Book',
    form: 'identity',
    cardinality: 'many',
    entries: [
      { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0441013593' },
      { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0553293357' },
    ],
  },
}

/**
 * A value type that claims the `passthrough` plan while its wire schema
 * accepts only text: if the runtime consulted `output.wire` under that plan, a
 * number would be rejected.
 */
const PASSTHROUGH_TEXT: ValueType<unknown> = {
  plan: PASSTHROUGH_PLAN,
  sdk: z.string(),
  wire: z.string(),
  encode: (value) => ({ ok: true, value: value as WireValue }),
  decode: (wire) => ({ ok: true, value: wire }),
}

/** A book record with an enumerated condition, for invalid-enum issues. */
const GRADED_BOOK = t.record({
  isbn: t.string(),
  condition: t.enumeration(['mint', 'worn']),
})

/** The library contract with each listed operation's output replaced. */
function libraryContractWithOutputs(
  outputs: Readonly<Record<OperationId, AnyOperationDescriptor['output']>>
): AppContract<unknown> {
  const base = libraryContract()
  return {
    ...base,
    operations: Object.fromEntries(
      Object.entries(base.operations).map(([id, op]) => [
        id,
        { ...op, output: outputs[op.id] ?? op.output },
      ])
    ),
  }
}

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly logger: SpyLogger
}

/** A logger whose calls can be inspected. */
interface SpyLogger extends RuntimeLogger {
  readonly error: ReturnType<typeof vi.fn>
  readonly warn: ReturnType<typeof vi.fn>
  readonly info: ReturnType<typeof vi.fn>
}

/** A runtime with `contract` registered, whose executor answers every call with `result`. */
function harness(result: WireValue, contract = libraryContract()): Harness {
  const executor = createRecordingExecutor(
    () => Promise.resolve(result),
    () => Promise.resolve(result)
  )
  const logger: SpyLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier({ [LIBRARIAN_SECRET]: LIBRARIAN }),
    clock: fixedClock,
    logger,
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(contract, LIBRARY_MANIFEST)
  return { runtime, executor, logger }
}

/** The librarian's invocation context. */
function asLibrarian(): InvocationContext {
  return { credential: createBearerCredential(LIBRARIAN_SECRET) }
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

/** Await a rejection that must be an `UnexpectedValueError`, and return it. */
async function unexpectedValue(promise: Promise<unknown>): Promise<UnexpectedValueError> {
  const error = await rejection(promise)
  expect(error).toBeInstanceOf(UnexpectedValueError)
  if (!(error instanceof UnexpectedValueError)) throw error
  return error
}

/** The two paths into a get operation, each handed the same executor result. */
const PATHS = [
  {
    path: 'invoke',
    call: (runtime: MactsRuntime) => runtime.invoke('library.books.lookupBook', {}, asLibrarian()),
    purpose: undefined,
  },
  {
    path: 'resolveReference',
    call: (runtime: MactsRuntime) =>
      runtime.resolveReference('library', DUNE_REFERENCE, asLibrarian()),
    purpose: 'to resolve a reference',
  },
] as const

describe.each(PATHS)('output validation through $path (D11)', ({ call, purpose }) => {
  it('rejects a result that violates a typed output plan with UnexpectedValueError', async () => {
    // `pages` arrives as a bare number instead of an integer control record.
    const { runtime, executor } = harness({ isbn: '978-0441013593', title: 'Dune', pages: 412 })

    const error = await unexpectedValue(call(runtime))

    expect(error.code).toBe('UNEXPECTED_VALUE')
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['pages']])
    // The executor was reached exactly once: the operation ran.
    expect(executor.requests.length + executor.resolutions.length).toBe(1)
  })

  it('says the operation ran, so a caller does not assume it had no effect', async () => {
    const { runtime } = harness({ isbn: '978-0441013593' })

    const error = await unexpectedValue(call(runtime))

    expect(error.message).toBe(ranMessage('library.books.lookupBook', purpose))
  })

  it('returns a conforming result unchanged', async () => {
    const result = { ...DUNE_WIRE }
    const { runtime } = harness(result)

    await expect(call(runtime)).resolves.toBe(result)
  })

  it('returns a passthrough result unchanged, even where output.wire would reject it', async () => {
    const result = 412
    // The schema check is genuinely skipped: the same value fails the wire schema.
    expect(PASSTHROUGH_TEXT.wire.safeParse(result).success).toBe(false)
    const { runtime } = harness(
      result,
      libraryContractWithOutputs({ 'library.books.lookupBook': PASSTHROUGH_TEXT })
    )

    await expect(call(runtime)).resolves.toBe(result)
  })

  it('never repeats the result in the message or the issues, including an invalid enum member', async () => {
    const SECRET = 'secret-7f3a'
    // An undeclared enum member, an undeclared key, and a value the
    // contract's own check quotes (integer text) all carry the secret.
    const graded = libraryContractWithOutputs({
      'library.books.lookupBook': t.record({
        isbn: t.string(),
        condition: t.enumeration(['mint', 'worn']),
        pages: t.integer(),
      }),
    })
    const result = {
      isbn: '978-0441013593',
      condition: `${SECRET}-condition`,
      pages: { integer: `${SECRET}-pages` },
      [`${SECRET}-key`]: 'x',
    }
    const { runtime } = harness(result, graded)

    const error = await unexpectedValue(call(runtime))

    expect(error.message).not.toContain(SECRET)
    expect(JSON.stringify(error.details)).not.toContain(SECRET)
    expect(error.details.issues).toEqual([
      {
        path: ['condition'],
        message: 'Expected one of "mint" | "worn".',
        code: 'invalid_value',
      },
      {
        path: ['pages', 'integer'],
        message: 'Expected text in the form its contract declares.',
        code: 'invalid_format',
      },
      {
        path: [],
        message: 'The record has 1 key its contract does not declare.',
        code: 'unrecognized_keys',
      },
    ])
  })
})

describe.each(PATHS)('output mismatches in the operator log, through $path', ({ call }) => {
  it('logs a warning with the operation, the executor provider, and the value-free issues only', async () => {
    const SECRET = 'secret-7f3a'
    const { runtime, logger } = harness({ isbn: SECRET, title: SECRET, pages: SECRET })

    const error = await unexpectedValue(call(runtime))

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      {
        operation: 'library.books.lookupBook',
        provider: 'recording-stub',
        issues: error.details.issues,
      },
      'Executor result violates the output contract'
    )
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(SECRET)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs nothing for a conforming result', async () => {
    const { runtime, logger } = harness({ ...DUNE_WIRE })

    await call(runtime)

    expect(logger.warn).not.toHaveBeenCalled()
  })
})

describe('output validation of dynamic content (D3, D11)', () => {
  it('never names a user key of a dynamic record in an issue path', async () => {
    // Regression: zod reported the failing integer text inside a dynamic user
    // record at ["notes", "record", <user key>, "integer"], so the user's key
    // reached the caller.
    const SECRET = 'secret-7f3a'
    const { runtime, logger } = harness(
      { isbn: '978-0441013593', notes: { record: { [SECRET]: { integer: 'abc' } } } },
      libraryContractWithOutputs({
        'library.books.lookupBook': t.record({ isbn: t.string(), notes: t.unknown() }),
      })
    )

    const error = await unexpectedValue(
      runtime.invoke('library.books.lookupBook', {}, asLibrarian())
    )

    expect(error.details.issues).toEqual([
      {
        path: ['notes', 'record'],
        message: 'A value in this dynamic content does not match its contract.',
        code: 'invalid_format',
      },
    ])
    expect(error.message).not.toContain(SECRET)
    expect(JSON.stringify(error.details)).not.toContain(SECRET)
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(SECRET)
  })
})

describe('output validation: the value-free issues are needed', () => {
  it("zod's own issue messages for the same result would repeat it", () => {
    // Guards the premise of the value-free messages: if zod and the value
    // library stopped quoting received data, this test would say so.
    const SECRET = 'secret-7f3a'
    const parsed = t
      .record({ isbn: t.string(), pages: t.integer() })
      .wire.safeParse({ isbn: 'x', pages: { integer: `${SECRET}-pages` }, [`${SECRET}-key`]: 1 })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(JSON.stringify(toValidationIssues(parsed.error.issues))).toContain(SECRET)
  })
})

describe('output validation of collections through resolveReference (D7, D11)', () => {
  it('rejects a list result whose record violates the list output contract', async () => {
    const { runtime } = harness(
      [DUNE_WIRE, { isbn: '978-0553293357', condition: 'secret-7f3a' }],
      libraryContractWithOutputs({ 'library.books.list': t.page(GRADED_BOOK) })
    )

    const error = await unexpectedValue(
      runtime.resolveReference('library', TWO_BOOKS_REFERENCE, asLibrarian())
    )

    expect(error.message).toBe(ranMessage('library.books.list', 'to resolve a reference'))
    expect(JSON.stringify(error.details)).not.toContain('secret-7f3a')
    expect(error.details.issues.map((issue) => issue.path)).toContainEqual([1, 'condition'])
  })

  it('still requires one record per identity-collection entry under a passthrough plan', async () => {
    const { runtime } = harness(
      [DUNE_WIRE],
      libraryContractWithOutputs({ 'library.books.list': PASSTHROUGH_TEXT })
    )

    const error = await unexpectedValue(
      runtime.resolveReference('library', TWO_BOOKS_REFERENCE, asLibrarian())
    )

    expect(error.message).toBe(
      'The result of resolving an identity collection as "library.books.list" must hold one record per entry: expected 2 records, received 1.'
    )
  })
})

describe('output validation through invoke of a list operation (D11)', () => {
  it('rejects a page item that violates the list item contract, at its path within the page', async () => {
    // `pages` arrives as a bare number instead of an integer control record.
    const { runtime } = harness({ items: [{ ...DUNE_WIRE, pages: 412 }], length: 1, last: 'x' })

    const error = await unexpectedValue(runtime.invoke('library.books.list', {}, asLibrarian()))

    expect(error.message).toBe(ranMessage('library.books.list'))
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['items', 0, 'pages']])
  })

  it('rejects a single record where a list of a resource with no identifier requires an array', async () => {
    const { runtime } = harness({ text: 'one page' })

    const error = await unexpectedValue(runtime.invoke('library.pages.list', {}, asLibrarian()))

    expect(error.message).toBe(ranMessage('library.pages.list'))
    expect(error.details.issues).toEqual([
      { path: ['items'], message: 'Expected a value of type array.', code: 'invalid_type' },
    ])
  })

  it('returns the conforming items of a window as a page', async () => {
    const { runtime } = harness({ items: [DUNE_WIRE], length: 1, last: DUNE_WIRE.isbn })

    await expect(runtime.invoke('library.books.list', {}, asLibrarian())).resolves.toEqual({
      items: [DUNE_WIRE],
    })
    expect(BOOK_RECORD.wire.safeParse(DUNE_WIRE).success).toBe(true)
  })
})

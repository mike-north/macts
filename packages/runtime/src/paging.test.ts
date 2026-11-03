/**
 * Tests for bounded list pages through the runtime: the paging inputs, the
 * cursor, the page window the executor receives, and the page the caller
 * gets back.
 *
 * Expected outcomes are hand-written from the paging contract
 * (`@macts/contracts` `Page`, `PAGE_SIZE_LIMITS`) and phases/13:
 *
 * - D2: every list returns a page `{ items, nextCursor? }`; a list whose
 *   identifier is claimed unique takes the optional `pageSize` and `cursor`
 *   inputs; a list of a resource with no identifier takes neither and returns
 *   one page with no `nextCursor`.
 * - D9: the cursor's input digest covers the validated wire input, so a cursor
 *   issued for a raw wire input continues through the SDK encode path, and the
 *   reverse.
 * - D9: the executor reads a window `{ offset, size, anchor? }` with an
 *   output plan that is an array of the list's items, and answers with the
 *   items, the collection length and the last item's identifier.
 * - D10: the default page size is 25 and the maximum 100; a size of zero,
 *   below zero, not an integer or above the maximum is a `ValidationError` at
 *   `["pageSize"]`, never clamped.
 * - D6: a cursor that is malformed, of an unknown format version, from another
 *   operation or for other inputs is a `ValidationError` at `["cursor"]`,
 *   never `COLLECTION_CHANGED`.
 * - The cursor's contents never reach an audit record, a log entry or an
 *   error; audit records say only `cursor: true`, for every operation, even
 *   one that refuses the cursor.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D2, D6, D9, D10)
 */

import { describe, expect, it, vi } from 'vitest'
import type { ExecutionRequest } from '@macts/core'
import {
  CollectionChangedError,
  UnexpectedValueError,
  ValidationError,
  ValueTypes as t,
  type Authority,
  type AppContract,
  type InvocationContext,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { createBearerCredential } from './invocation/credential.js'
import { createRuntime, type MactsRuntime, type RuntimeLogger } from './runtime.js'
import {
  BOOK_RECORD,
  LIBRARY_MANIFEST,
  PAGED_LIST_INPUT,
  createFakeVerifier,
  createMemoryAuditWriter,
  createRecordingExecutor,
  fixedClock,
  libraryContract,
  type MemoryAuditWriter,
  type RecordingExecutor,
} from './runtime-test-helpers.js'

const LIBRARIAN_SECRET = 'macts_sk_librarian-secret-never-logged'

/** May list books, shelves and pages. */
const LIBRARIAN: Authority = {
  subject: 'key_librarian',
  permissions: [
    'library:books:list',
    'library:shelves:list',
    'library:pages:list',
    'library:shelves:get',
  ],
}

/** A book in wire form, numbered `n`; its identifier (`isbn`) is `isbn-n`. */
function book(n: number): WireRecord {
  return {
    isbn: `isbn-${String(n)}`,
    title: `Book ${String(n)}`,
    pages: { integer: String(100 + n) },
  }
}

/** `count` books, numbered from 1, in collection order. */
function books(count: number): WireRecord[] {
  return Array.from({ length: count }, (_, i) => book(i + 1))
}

/** The identifier of a wire book (`isbn`) or shelf (`code`). */
function isbnOf(value: WireValue): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected a book or shelf record')
  }
  const record = value as WireRecord
  const id = record['isbn'] ?? record['code']
  if (typeof id !== 'string') throw new Error('expected an identifier')
  return id
}

/** Six shelves in wire form, identified by `code`. */
const SHELVES: readonly WireRecord[] = Array.from({ length: 6 }, (_, i) => ({
  code: `SF-${String(i + 1)}`,
  label: `Shelf ${String(i + 1)}`,
}))

/**
 * An executor serving page windows from an in-memory collection the way a
 * native executor reads them: it checks the anchor sits at `offset - 1`
 * (reporting a changed collection otherwise), then answers with the window's
 * items, the collection length and the last item's identifier. `rows()` is
 * read on every call, so a test can change the collection between pages.
 * Shelf lists are served from {@link SHELVES}.
 */
function windowExecutor(rows: () => readonly WireRecord[]): RecordingExecutor {
  return createRecordingExecutor((request: ExecutionRequest) => {
    const all = request.target.resource === 'Shelf' ? SHELVES : rows()
    const window = request.page
    if (window === undefined) return Promise.resolve([...all])
    if (window.anchor !== undefined) {
      const before = all[window.offset - 1]
      if (before === undefined || isbnOf(before) !== window.anchor) {
        return Promise.reject(
          new CollectionChangedError('The Book collection in Library changed.', {})
        )
      }
    }
    const items = all.slice(window.offset, window.offset + window.size)
    const last = items.at(-1)
    return Promise.resolve({
      items,
      length: all.length,
      ...(last === undefined ? {} : { last: isbnOf(last) }),
    })
  })
}

/** A logger whose calls can be inspected. */
interface SpyLogger extends RuntimeLogger {
  readonly error: ReturnType<typeof vi.fn>
  readonly warn: ReturnType<typeof vi.fn>
  readonly info: ReturnType<typeof vi.fn>
}

interface Harness {
  readonly runtime: MactsRuntime
  readonly executor: RecordingExecutor
  readonly logger: SpyLogger
  readonly audit: MemoryAuditWriter
}

/** A runtime with `contract` registered over `executor`, auditing every call. */
function harness(executor: RecordingExecutor, contract = libraryContract()): Harness {
  const logger: SpyLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  const audit = createMemoryAuditWriter()
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier({ [LIBRARIAN_SECRET]: LIBRARIAN }),
    clock: fixedClock,
    logger,
    governance: { policy: ALLOW_ALL_POLICY, writer: audit },
  })
  runtime.registerContract(contract, LIBRARY_MANIFEST)
  return { runtime, executor, logger, audit }
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

/** Await a rejection that must be a `ValidationError`, and return it. */
async function validationFailure(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await rejection(promise)
  expect(error).toBeInstanceOf(ValidationError)
  if (!(error instanceof ValidationError)) throw error
  return error
}

/** A page as the caller receives it. */
interface WirePage {
  readonly items: readonly WireValue[]
  readonly nextCursor?: string
}

/** Narrow an invoke result to a page, failing the test otherwise. */
function asPage(value: WireValue): WirePage {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected a page')
  }
  const record = value as WireRecord
  const items = record['items']
  const nextCursor = record['nextCursor']
  if (!Array.isArray(items)) throw new Error('expected page items')
  return typeof nextCursor === 'string' ? { items, nextCursor } : { items }
}

/** Every page of `library.books.list`, following each `nextCursor` until there is none. */
async function pageThrough(
  runtime: MactsRuntime,
  input: WireRecord = {}
): Promise<readonly WirePage[]> {
  const pages: WirePage[] = []
  let cursor: string | undefined
  do {
    const page = asPage(
      await runtime.invoke(
        'library.books.list',
        cursor === undefined ? input : { ...input, cursor },
        asLibrarian()
      )
    )
    pages.push(page)
    cursor = page.nextCursor
  } while (cursor !== undefined && pages.length < 100)
  return pages
}

/** The library contract whose book list also takes an optional `shelf` input. */
function contractWithShelfInput(): AppContract<unknown> {
  const base = libraryContract()
  const list = base.operations['library.books.list']
  if (list === undefined) throw new Error('fixture lost its book list')
  return {
    ...base,
    operations: {
      ...base.operations,
      'library.books.list': {
        ...list,
        input: t.record({ shelf: t.optional(t.string()), ...t.pageInputs() }),
      },
    },
  }
}

/** A cursor `library.books.list` issued after its first page of three, with no other input. */
async function issuedCursor(runtime: MactsRuntime, input: WireRecord = {}): Promise<string> {
  const first = asPage(
    await runtime.invoke(
      'library.books.list',
      { ...input, pageSize: { integer: '3' } },
      asLibrarian()
    )
  )
  if (first.nextCursor === undefined) throw new Error('expected a next cursor')
  return first.nextCursor
}

describe('paging contract of the fixture (D2)', () => {
  it('gives a list whose identifier is claimed unique both paging inputs, both optional', () => {
    const plan = PAGED_LIST_INPUT.plan
    expect(plan.kind === 'record' ? Object.keys(plan.fields) : []).toEqual(['pageSize', 'cursor'])
    expect(PAGED_LIST_INPUT.wire.safeParse({}).success).toBe(true)
  })
})

describe('paging through a list (D2, D9)', () => {
  it('returns every item exactly once across pages of the default size, and no cursor on the last page', async () => {
    const { runtime } = harness(windowExecutor(() => books(60)))

    const pages = await pageThrough(runtime)

    // 60 items at the default size of 25: 25, 25, 10.
    expect(pages.map((page) => page.items.length)).toEqual([25, 25, 10])
    expect(pages.map((page) => page.nextCursor !== undefined)).toEqual([true, true, false])
    const isbns = pages.flatMap((page) => page.items.map(isbnOf))
    expect(isbns).toEqual(books(60).map(isbnOf))
    expect(new Set(isbns).size).toBe(60)
  })

  it('hands the executor half-open windows anchored on the last item of the previous page', async () => {
    const { runtime, executor } = harness(windowExecutor(() => books(7)))

    const first = asPage(
      await runtime.invoke('library.books.list', { pageSize: { integer: '3' } }, asLibrarian())
    )
    await runtime.invoke(
      'library.books.list',
      { pageSize: { integer: '3' }, cursor: first.nextCursor ?? '' },
      asLibrarian()
    )

    expect(executor.requests.map((request) => request.page)).toEqual([
      { offset: 0, size: 3 },
      { offset: 3, size: 3, anchor: 'isbn-3' },
    ])
  })

  it('reads with an array of the item plan and without the paging inputs', async () => {
    const { runtime, executor } = harness(windowExecutor(() => books(2)))

    await runtime.invoke('library.books.list', { pageSize: { integer: '5' } }, asLibrarian())

    expect(executor.requests[0]?.outputPlan).toEqual({ kind: 'array', items: BOOK_RECORD.plan })
    expect(executor.requests[0]?.input).toEqual({})
  })

  it('uses the default size of 25 when no pageSize is given', async () => {
    const { runtime, executor } = harness(windowExecutor(() => books(1)))

    await runtime.invoke('library.books.list', {}, asLibrarian())

    expect(executor.requests[0]?.page).toEqual({ offset: 0, size: 25 })
  })

  it('accepts the maximum page size of 100', async () => {
    const { runtime } = harness(windowExecutor(() => books(150)))

    const page = asPage(
      await runtime.invoke('library.books.list', { pageSize: { integer: '100' } }, asLibrarian())
    )

    expect(page.items).toHaveLength(100)
    expect(page.nextCursor).toBeDefined()
  })

  it('omits nextCursor when a page ends exactly at the end of the collection', async () => {
    const { runtime } = harness(windowExecutor(() => books(6)))

    const pages = await pageThrough(runtime, { pageSize: { integer: '3' } })

    expect(pages.map((page) => page.items.length)).toEqual([3, 3])
    expect(pages[1]?.nextCursor).toBeUndefined()
  })

  it('returns an empty page with no cursor for an empty collection', async () => {
    const { runtime } = harness(windowExecutor(() => []))

    await expect(runtime.invoke('library.books.list', {}, asLibrarian())).resolves.toEqual({
      items: [],
    })
  })

  it('keeps every item exactly once when an item is added after the anchor between pages', async () => {
    let rows = books(6)
    const { runtime } = harness(windowExecutor(() => rows))

    const cursor = await issuedCursor(runtime)
    rows = [...rows, book(99)]
    const rest = asPage(
      await runtime.invoke(
        'library.books.list',
        { pageSize: { integer: '3' }, cursor },
        asLibrarian()
      )
    )

    expect(rest.items.map(isbnOf)).toEqual(['isbn-4', 'isbn-5', 'isbn-6'])
    expect(rest.nextCursor).toBeDefined()
  })

  it('reports COLLECTION_CHANGED from the executor when the anchor moved, unchanged', async () => {
    let rows = books(6)
    const { runtime } = harness(windowExecutor(() => rows))

    const cursor = await issuedCursor(runtime)
    rows = rows.filter((row) => isbnOf(row) !== 'isbn-3')
    const error = await rejection(
      runtime.invoke('library.books.list', { pageSize: { integer: '3' }, cursor }, asLibrarian())
    )

    expect(error).toBeInstanceOf(CollectionChangedError)
    expect(error).toMatchObject({ code: 'COLLECTION_CHANGED', details: {} })
  })

  it('binds the cursor to the other inputs and passes them to the executor', async () => {
    const { runtime, executor } = harness(
      windowExecutor(() => books(6)),
      contractWithShelfInput()
    )

    const cursor = await issuedCursor(runtime, { shelf: 'SF-1' })
    await runtime.invoke(
      'library.books.list',
      { shelf: 'SF-1', pageSize: { integer: '3' }, cursor },
      asLibrarian()
    )

    expect(executor.requests.map((request) => request.input)).toEqual([
      { shelf: 'SF-1' },
      { shelf: 'SF-1' },
    ])
  })
})

describe('a list of a resource with no identifier (D2)', () => {
  it('reads the whole collection as an array and returns it as one page with no cursor', async () => {
    const executor = createRecordingExecutor(() =>
      Promise.resolve([{ text: 'one' }, { text: 'two' }])
    )
    const { runtime } = harness(executor)

    const result = await runtime.invoke('library.pages.list', {}, asLibrarian())

    expect(result).toEqual({ items: [{ text: 'one' }, { text: 'two' }] })
    expect(executor.requests[0]?.page).toBeUndefined()
    expect(executor.requests[0]?.outputPlan).toEqual({
      kind: 'array',
      items: {
        kind: 'record',
        fields: { text: { value: { kind: 'string' }, presence: 'required' } },
      },
    })
  })

  it('refuses paging inputs it does not take', async () => {
    const { runtime, executor } = harness(createRecordingExecutor(() => Promise.resolve([])))

    const error = await validationFailure(
      runtime.invoke('library.pages.list', { pageSize: { integer: '5' } }, asLibrarian())
    )

    expect(error.details.issues.map((issue) => issue.path)).toEqual([[]])
    expect(executor.requests).toHaveLength(0)
  })
})

describe('page size validation (D10)', () => {
  it.each([
    { label: 'zero', pageSize: { integer: '0' } },
    { label: 'negative', pageSize: { integer: '-1' } },
    { label: 'not an integer', pageSize: { integer: '2.5' } },
    { label: 'above the maximum of 100', pageSize: { integer: '101' } },
    { label: 'a bare number instead of an integer control record', pageSize: 5 },
  ])(
    'rejects a page size that is $label at ["pageSize"], never clamping it',
    async ({ pageSize }) => {
      const { runtime, executor } = harness(windowExecutor(() => books(3)))

      const error = await validationFailure(
        runtime.invoke('library.books.list', { pageSize }, asLibrarian())
      )

      expect(error.details.issues.map((issue) => issue.path)).toEqual([['pageSize']])
      expect(executor.requests).toHaveLength(0)
    }
  )

  it('accepts a page size of 1', async () => {
    const { runtime } = harness(windowExecutor(() => books(3)))

    const page = asPage(
      await runtime.invoke('library.books.list', { pageSize: { integer: '1' } }, asLibrarian())
    )

    expect(page.items.map(isbnOf)).toEqual(['isbn-1'])
  })
})

describe('cursor validation (D6)', () => {
  /** Reject `cursor` sent to the book list, expecting one issue at ["cursor"]. */
  async function cursorRejection(
    runtime: MactsRuntime,
    cursor: string,
    input: WireRecord = {}
  ): Promise<ValidationError> {
    const error = await validationFailure(
      runtime.invoke('library.books.list', { ...input, cursor }, asLibrarian())
    )
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['cursor']])
    return error
  }

  it.each([
    { label: 'text with no version', cursor: 'not-a-cursor' },
    { label: 'an empty string', cursor: '' },
    { label: 'a payload that is not base64url JSON', cursor: '1.***' },
    { label: 'a payload missing fields', cursor: `1.${encode({ op: 'library.books.list' })}` },
  ])('rejects a malformed cursor ($label)', async ({ cursor }) => {
    const { runtime, executor } = harness(windowExecutor(() => books(3)))

    const error = await cursorRejection(runtime, cursor)

    expect(error.details.issues[0]?.message).toBe('The cursor is not one this service issued.')
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a cursor of an unknown format version', async () => {
    const { runtime } = harness(windowExecutor(() => books(6)))
    const issued = await issuedCursor(runtime)

    const error = await cursorRejection(runtime, `2${issued.slice(1)}`)

    expect(error.details.issues[0]?.message).toBe(
      'The cursor was written in a format this service does not read.'
    )
  })

  it('rejects a cursor issued by another operation', async () => {
    const { runtime, executor } = harness(windowExecutor(() => books(6)))
    const shelfPage = asPage(
      await runtime.invoke('library.shelves.list', { pageSize: { integer: '3' } }, asLibrarian())
    )
    const before = executor.requests.length

    const error = await cursorRejection(runtime, shelfPage.nextCursor ?? '')

    expect(error.details.issues[0]?.message).toBe(
      'The cursor was issued by a different operation; send it only to the operation that returned it.'
    )
    expect(executor.requests).toHaveLength(before)
  })

  it('rejects a cursor sent with different inputs', async () => {
    const { runtime } = harness(
      windowExecutor(() => books(6)),
      contractWithShelfInput()
    )
    const issued = await issuedCursor(runtime, { shelf: 'SF-1' })

    const error = await cursorRejection(runtime, issued, { shelf: 'SF-2' })

    expect(error.details.issues[0]?.message).toBe(
      'The cursor was issued for different inputs; send it with the same inputs as the call that returned it.'
    )
  })

  it('accepts a cursor whatever page size the next call asks for', async () => {
    const { runtime } = harness(windowExecutor(() => books(6)))
    const issued = await issuedCursor(runtime)

    const rest = asPage(
      await runtime.invoke(
        'library.books.list',
        { pageSize: { integer: '10' }, cursor: issued },
        asLibrarian()
      )
    )

    expect(rest.items.map(isbnOf)).toEqual(['isbn-4', 'isbn-5', 'isbn-6'])
  })
})

describe('cursors across surfaces (D9)', () => {
  /** The book list taking a shelf and an integer minimum besides the paging inputs. */
  const SCOPED_INPUT = t.record({
    shelf: t.string(),
    minPages: t.optional(t.integer()),
    ...t.pageInputs(),
  })

  function scopedContract(): AppContract<unknown> {
    const base = libraryContract()
    const list = base.operations['library.books.list']
    if (list === undefined) throw new Error('fixture lost its book list')
    return {
      ...base,
      operations: { ...base.operations, 'library.books.list': { ...list, input: SCOPED_INPUT } },
    }
  }

  /** The wire input an SDK sends for SDK-side `value`: its encoded form. */
  function encodedBySdk(value: Record<string, unknown>): WireRecord {
    const encoded = SCOPED_INPUT.encode(value)
    if (!encoded.ok) throw new Error('the SDK input did not encode')
    return encoded.value as WireRecord
  }

  // A raw wire record, as an HTTP body or an MCP tool call carries it, in
  // another key order than the SDK writes.
  const RAW = { minPages: { integer: '7' }, shelf: 'SF-1' }
  const SDK = { shelf: 'SF-1', minPages: 7 }

  it('continues a cursor issued for a raw wire input through the SDK encode path', async () => {
    const { runtime } = harness(
      windowExecutor(() => books(6)),
      scopedContract()
    )
    const cursor = await issuedCursor(runtime, RAW)

    const rest = asPage(
      await runtime.invoke('library.books.list', encodedBySdk({ ...SDK, cursor }), asLibrarian())
    )

    expect(rest.items.map(isbnOf)).toEqual(['isbn-4', 'isbn-5', 'isbn-6'])
  })

  it('continues a cursor issued through the SDK encode path for a raw wire input', async () => {
    const { runtime } = harness(
      windowExecutor(() => books(6)),
      scopedContract()
    )
    const first = asPage(
      await runtime.invoke(
        'library.books.list',
        encodedBySdk({ ...SDK, pageSize: 3 }),
        asLibrarian()
      )
    )
    if (first.nextCursor === undefined) throw new Error('expected a next cursor')

    const rest = asPage(
      await runtime.invoke(
        'library.books.list',
        { ...RAW, cursor: first.nextCursor },
        asLibrarian()
      )
    )

    expect(rest.items.map(isbnOf)).toEqual(['isbn-4', 'isbn-5', 'isbn-6'])
  })

  it('refuses the cursor when a non-paging input differs only in value', async () => {
    const { runtime } = harness(
      windowExecutor(() => books(6)),
      scopedContract()
    )
    const cursor = await issuedCursor(runtime, RAW)

    const error = await validationFailure(
      runtime.invoke(
        'library.books.list',
        { ...RAW, minPages: { integer: '8' }, cursor },
        asLibrarian()
      )
    )

    expect(error.details.issues.map((issue) => issue.path)).toEqual([['cursor']])
  })
})

describe('page window results the runtime does not trust', () => {
  it('rejects a result that is not a window result with UnexpectedValueError', async () => {
    const { runtime } = harness(createRecordingExecutor(() => Promise.resolve([book(1)])))

    const error = await rejection(runtime.invoke('library.books.list', {}, asLibrarian()))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      message:
        'The "library.books.list" operation ran in the app, but its page of results is malformed.',
    })
  })

  it('rejects a window result that claims more items remain after an empty page', async () => {
    const { runtime } = harness(
      createRecordingExecutor(() => Promise.resolve({ items: [], length: 50 }))
    )

    const error = await rejection(runtime.invoke('library.books.list', {}, asLibrarian()))

    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('rejects a window result holding more items than the requested page size with UnexpectedValueError', async () => {
    // An executor that ignores the window's size: four items for a page of three.
    const { runtime } = harness(
      createRecordingExecutor(() =>
        Promise.resolve({ items: books(4), length: 10, last: 'isbn-4' })
      )
    )

    const error = await rejection(
      runtime.invoke('library.books.list', { pageSize: { integer: '3' } }, asLibrarian())
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      message:
        'The "library.books.list" operation ran in the app, but its page of results is malformed.',
      details: { issues: [expect.objectContaining({ path: ['items'] })] },
    })
  })

  it('rejects a window result holding more items than the default page size of 25', async () => {
    const { runtime } = harness(
      createRecordingExecutor(() =>
        Promise.resolve({ items: books(26), length: 40, last: 'isbn-26' })
      )
    )

    const error = await rejection(runtime.invoke('library.books.list', {}, asLibrarian()))

    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('accepts a window result holding exactly the page size', async () => {
    const { runtime } = harness(
      createRecordingExecutor(() => Promise.resolve({ items: books(3), length: 3, last: 'isbn-3' }))
    )

    const page = asPage(
      await runtime.invoke('library.books.list', { pageSize: { integer: '3' } }, asLibrarian())
    )

    expect(page.items).toHaveLength(3)
    expect(page.nextCursor).toBeUndefined()
  })

  it('validates the page items against the item contract', async () => {
    const { runtime } = harness(
      createRecordingExecutor(() =>
        Promise.resolve({ items: [{ isbn: 'x', title: 'y', pages: 7 }], length: 1, last: 'x' })
      )
    )

    const error = await rejection(runtime.invoke('library.books.list', {}, asLibrarian()))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      details: { issues: [expect.objectContaining({ path: ['items', 0, 'pages'] })] },
    })
  })
})

describe('cursor privacy', () => {
  /** An identifier that must never appear outside the cursor. */
  const MARKER = 'anchor-marker-5d1c9e'

  /** Everything the runtime recorded or reported about a call, as text. */
  function everythingRecorded(h: Harness, error: unknown): string {
    return JSON.stringify({
      audit: h.audit.records,
      warn: h.logger.warn.mock.calls,
      info: h.logger.info.mock.calls,
      error: h.logger.error.mock.calls,
      thrown:
        error instanceof Error
          ? { message: error.message, ...Object.fromEntries(Object.entries(error)) }
          : error,
    })
  }

  it('audits a presented cursor only as `cursor: true`', async () => {
    const h = harness(windowExecutor(() => books(6)))
    const cursor = await issuedCursor(h.runtime)

    await h.runtime.invoke(
      'library.books.list',
      { pageSize: { integer: '3' }, cursor },
      asLibrarian()
    )

    const summaries = h.audit.records.map((record) => record.argsSummary)
    expect(summaries.at(-1)).toContain('cursor: true')
    expect(JSON.stringify(h.audit.records)).not.toContain(cursor)
  })

  it('keeps a marker anchor out of the audit, the logs and the error for a bad cursor', async () => {
    const h = harness(windowExecutor(() => books(6)))
    // A cursor anchored on the marker, but issued for another operation.
    const cursor = `1.${encode({ op: 'library.shelves.list', in: 'x', fl: '', at: 3, an: MARKER })}`

    const error = await rejection(h.runtime.invoke('library.books.list', { cursor }, asLibrarian()))

    expect(error).toBeInstanceOf(ValidationError)
    expect(h.audit.records.length).toBeGreaterThan(0)
    const recorded = everythingRecorded(h, error)
    expect(recorded).not.toContain(MARKER)
    expect(recorded).not.toContain(cursor)
  })

  it.each([
    ['a list that does not page', 'library.pages.list'],
    ['an operation that is not a list', 'library.shelves.get'],
  ] as const)(
    'audits a cursor sent to %s only as `cursor: true`, though validation refuses it',
    async (_kind, id) => {
      const h = harness(windowExecutor(() => books(6)))
      // A cursor anchored on the marker, as another list might have issued it.
      const cursor = `1.${encode({ op: 'library.books.list', in: 'x', fl: '', at: 3, an: MARKER })}`

      const error = await rejection(h.runtime.invoke(id, { cursor }, asLibrarian()))

      expect(error).toBeInstanceOf(ValidationError)
      expect(h.executor.requests).toHaveLength(0)
      expect(h.audit.records.map((record) => record.argsSummary).at(-1)).toContain('cursor: true')
      const recorded = everythingRecorded(h, error)
      expect(recorded).not.toContain(MARKER)
      expect(recorded).not.toContain(cursor)
    }
  )

  it('audits a raw marker sent as the cursor of a list that does not page only as `cursor: true`', async () => {
    const h = harness(windowExecutor(() => books(6)))

    const error = await rejection(
      h.runtime.invoke('library.pages.list', { cursor: MARKER }, asLibrarian())
    )

    expect(error).toBeInstanceOf(ValidationError)
    expect(h.audit.records.length).toBeGreaterThan(0)
    expect(everythingRecorded(h, error)).not.toContain(MARKER)
  })

  it('keeps a marker anchor out of the audit, the logs and the error for COLLECTION_CHANGED', async () => {
    let rows: WireRecord[] = [
      { isbn: 'isbn-1', title: 'one', pages: { integer: '1' } },
      { isbn: MARKER, title: 'marker', pages: { integer: '2' } },
      { isbn: 'isbn-3', title: 'three', pages: { integer: '3' } },
    ]
    const h = harness(windowExecutor(() => rows))
    const first = asPage(
      await h.runtime.invoke('library.books.list', { pageSize: { integer: '2' } }, asLibrarian())
    )
    const cursor = first.nextCursor ?? ''
    rows = rows.filter((row) => isbnOf(row) !== MARKER)
    h.audit.records.length = 0
    h.logger.warn.mockClear()

    const error = await rejection(
      h.runtime.invoke('library.books.list', { pageSize: { integer: '2' }, cursor }, asLibrarian())
    )

    expect(error).toBeInstanceOf(CollectionChangedError)
    expect(h.audit.records.length).toBeGreaterThan(0)
    const recorded = everythingRecorded(h, error)
    expect(recorded).not.toContain(MARKER)
    expect(recorded).not.toContain(cursor)
  })
})

/** A cursor payload written the way the runtime writes one, for forged-cursor tests. */
function encode(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

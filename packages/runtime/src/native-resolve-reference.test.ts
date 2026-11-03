/**
 * Reference resolution through the runtime with the real native macOS
 * executor.
 *
 * `resolveReference` runs the full pipeline as the resource's get (a single
 * reference) or list (a collection), then the executor's `resolve`, then
 * validates the result against the operation's output contract (phases/13
 * D7). Here the executor is the shipped native one; only its transport is
 * replaced, by one that evaluates the composed script against a stand-in
 * library application in an isolated context. So the reference the runtime
 * validated, the resource plans it derived from the registered contract, the
 * output plan it chose, the native body, and the value codec all meet as they
 * do on a Mac.
 *
 * Expected outcomes are written by hand from D7 and D9: a book is found by its
 * ISBN as the book get finds it, an identity collection resolves in entry
 * order, a missing book is `TargetNotFoundError` naming the resource (with
 * `entryIndex` for an entry), and a form outside the native conversion scope
 * is `InternalError`.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9)
 */

import { describe, expect, it } from 'vitest'
import { createNativeExecutor, type AppManifest } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  InternalError,
  TargetNotFoundError,
  type AppContract,
  type Authority,
  type InvocationContext,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { createBearerCredential } from './invocation/credential.js'
import { createRuntime, type MactsRuntime } from './runtime.js'
import {
  LIBRARY_MANIFEST,
  createFakeVerifier,
  fixedClock,
  libraryContract,
} from './runtime-test-helpers.js'

const READER_SECRET = 'macts_sk_native-resolution-reader-never-logged'

/** May read one book and list books: the operations book references resolve as. */
const READER: Authority = {
  subject: 'key_native_reader',
  permissions: ['library:books:lookupBook', 'library:books:list'],
}

/**
 * The library manifest with a book's properties declared, so the book get's
 * record read has fields to read. The ISBN is the book's identifier, a string
 * as the contract's identifier type says.
 */
const LIBRARY_WITH_BOOK_PROPERTIES: AppManifest = withBookProperties(LIBRARY_MANIFEST)

function withBookProperties(manifest: AppManifest): AppManifest {
  const base = manifest.resources['Book']
  if (base === undefined) throw new Error('the library fixture has no Book resource')
  return {
    ...manifest,
    resources: {
      ...manifest.resources,
      Book: {
        ...base,
        properties: {
          isbn: { access: 'r', type: 'string', optional: false, description: 'The ISBN' },
          title: { access: 'r', type: 'string', optional: false, description: 'The title' },
          pages: { access: 'r', type: 'integer', optional: false, description: 'The page count' },
        },
      },
    },
  }
}

const DUNE = { isbn: '978-0441013593', title: 'Dune', pages: 412 }
const FOUNDATION = { isbn: '978-0553293357', title: 'Foundation', pages: 255 }

/** A book in wire form: `pages` is an integer control record. */
function wireBook(book: typeof DUNE) {
  return { isbn: book.isbn, title: book.title, pages: { integer: String(book.pages) } }
}

/** A stand-in library app whose books are found by ISBN in `books`. */
function standInLibrary(books: readonly (typeof DUNE)[]) {
  const absent = { exists: () => false }
  const byIsbn = new Map(
    books.map((book) => [
      book.isbn,
      { exists: () => true, isbn: () => book.isbn, properties: () => ({ ...book }) },
    ])
  )
  return { books: { byId: (isbn: unknown) => byIsbn.get(String(isbn)) ?? absent } }
}

/** A runtime with the library contract registered over the native executor. */
function nativeRuntime(app: object): MactsRuntime {
  const runtime = createRuntime({
    executor: createNativeExecutor({ transport: standInTransport(app) }),
    verifier: createFakeVerifier({ [READER_SECRET]: READER }),
    clock: fixedClock,
    logger: { error: () => undefined, warn: () => undefined, info: () => undefined },
    governance: { policy: ALLOW_ALL_POLICY },
  })
  const contract: AppContract<unknown> = libraryContract()
  runtime.registerContract(contract, LIBRARY_WITH_BOOK_PROPERTIES)
  return runtime
}

const CONTEXT: InvocationContext = { credential: createBearerCredential(READER_SECRET) }

/** A single identity reference to the book with `isbn`, as encoding produces it. */
function book(isbn: string) {
  return { resource: 'Book', form: 'identity', cardinality: 'one', id: isbn } as const
}

/** An identity collection of the books with `isbns`, in that order. */
function books(...isbns: string[]) {
  return {
    reference: {
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: isbns.map(book),
    },
  }
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe('resolveReference with the native executor', () => {
  it('resolves a book reference to the book get record, validated by its output contract', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE, FOUNDATION]))

    await expect(
      runtime.resolveReference('library', { reference: book(DUNE.isbn) }, CONTEXT)
    ).resolves.toEqual(wireBook(DUNE))
  })

  it('resolves an identity collection of books in entry order', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE, FOUNDATION]))

    await expect(
      runtime.resolveReference('library', books(FOUNDATION.isbn, DUNE.isbn), CONTEXT)
    ).resolves.toEqual([wireBook(FOUNDATION), wireBook(DUNE)])
  })

  it('resolves an empty identity collection to []', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE]))

    await expect(runtime.resolveReference('library', books(), CONTEXT)).resolves.toEqual([])
  })

  it('fails with TargetNotFoundError naming the book when none has the ISBN', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE]))

    const error = await rejectionOf(
      runtime.resolveReference('library', { reference: book('978-0000000000') }, CONTEXT)
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Book' })
  })

  it('fails with TargetNotFoundError whose entryIndex names the missing entry', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE]))

    const error = await rejectionOf(
      runtime.resolveReference('library', books(DUNE.isbn, '978-0000000000'), CONTEXT)
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    if (!(error instanceof TargetNotFoundError)) return
    expect(error.details).toEqual({ resource: 'Book', entryIndex: 1 })
  })

  it('fails a selector reference with InternalError naming the form', async () => {
    const runtime = nativeRuntime(standInLibrary([DUNE]))

    const error = await rejectionOf(
      runtime.resolveReference(
        'library',
        {
          reference: {
            resource: 'Book',
            form: 'selector',
            cardinality: 'one',
            selector: { by: 'name', name: 'Dune' },
          },
        },
        CONTEXT
      )
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe(
      'The macOS provider cannot resolve a selector reference to the Library resource "Book" yet.'
    )
  })
})

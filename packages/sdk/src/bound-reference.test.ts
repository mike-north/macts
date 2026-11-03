/**
 * Unit tests for binding decoded references to a client and resolving them,
 * through `createCodecClientRuntime` with a recording transport (no runtime,
 * no network).
 *
 * Expected values are written by hand from phases/13:
 *
 * - D7 Binding: a bound reference is its data form plus `resolve`, with every
 *   container and identity-collection entry bound as well; the binder keeps
 *   client state in `#private` fields or prototype members, so a bound
 *   reference is valid encode input and re-encodes to exactly the canonical
 *   wire form; `resolve()` sends that re-encoded form, never received wire.
 * - D8 Encode strictness: function members and anything not own and
 *   enumerable are ignored; any other own enumerable property is an
 *   `unknown-field` issue at its key.
 * - D7 The app: a different `app` at any level is a `ValidationError` at that
 *   level's `app`, before anything is sent.
 * - D11: the client decodes a resolution result with the output contract of
 *   the resource's `get` or `list` operation; a mismatch is
 *   `UnexpectedValueError`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7, D8, D11)
 */

import { describe, expect, it } from 'vitest'
import {
  InternalError,
  UnexpectedValueError,
  ValidationError,
  ValueTypes as t,
  type AppContract,
  type CallOptions,
  type ReferenceData,
  type WireValue,
} from '@macts/contracts'
import { createCodecClientRuntime, type ClientApp } from './codec-runtime.js'
import {
  DUNE_ISBN,
  DUNE_MESSIAH_ISBN,
  DUNE_MESSIAH_WIRE,
  DUNE_WIRE,
  SCIENCE_FICTION_WIRE,
  libraryContract,
  type LibraryClient,
} from './library-fixture.js'
import { rejection } from './test-helpers.js'

/** One request a transport received. */
interface Sent {
  readonly kind: 'invoke' | 'resolve'
  readonly wire: WireValue
  readonly options: CallOptions | undefined
}

/** A library client over a transport that records what it is sent and answers `answer`. */
function recordingClient(
  answer: (sent: Sent) => unknown,
  app: ClientApp = libraryContract
): { client: LibraryClient; sent: Sent[] } {
  const sent: Sent[] = []
  const record = (request: Sent): Promise<unknown> => {
    sent.push(request)
    return Promise.resolve(answer(request))
  }
  const runtime = createCodecClientRuntime(app, {
    invoke: (_operation, wire, options) => record({ kind: 'invoke', wire, options }),
    resolve: (wire, options) => record({ kind: 'resolve', wire, options }),
  })
  return { client: libraryContract.bind(runtime), sent }
}

/**
 * A shelf reference payload with a two-level container chain, an identity
 * collection of books whose entries carry containers, and positions as
 * integer control records: canonical wire as D7 defines it.
 */
const SHELF_IN_BRANCH = {
  resource: 'Shelf',
  form: 'selector',
  cardinality: 'one',
  selector: { by: 'index', index: { integer: '2' } },
  container: { resource: 'Branch', form: 'identity', cardinality: 'one', id: 'DT' },
} as const
const SEQUELS_WITH_CONTAINERS = {
  resource: 'Book',
  form: 'identity',
  cardinality: 'many',
  entries: [
    {
      resource: 'Book',
      form: 'identity',
      cardinality: 'one',
      id: DUNE_ISBN,
      container: SHELF_IN_BRANCH,
    },
    { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_MESSIAH_ISBN },
  ],
} as const

/** A book whose shelf has containers and whose sequels' entries do too. */
const DUNE_WITH_CONTAINERS_WIRE = {
  ...DUNE_WIRE,
  shelf: { reference: SHELF_IN_BRANCH },
  sequels: { reference: SEQUELS_WITH_CONTAINERS },
}

/** Decode {@link DUNE_WITH_CONTAINERS_WIRE} through the client and return the book. */
async function decodedBook(answer: (sent: Sent) => unknown = () => DUNE_WITH_CONTAINERS_WIRE) {
  const harness = recordingClient((request) =>
    request.kind === 'invoke' ? DUNE_WITH_CONTAINERS_WIRE : answer(request)
  )
  const book = await harness.client.books.get()
  return { ...harness, book }
}

/** The reference value types of the book's positions, built as the contract builds them. */
const shelfReference = t.reference(() => libraryContract, 'Shelf', 'one')
const booksReference = t.reference(() => libraryContract, 'Book', 'many')

describe('binding decoded references', () => {
  it('binds the data form at every level: reference, containers, and entries', async () => {
    const { book } = await decodedBook()

    expect(book.shelf).toEqual({
      app: 'library',
      resource: 'Shelf',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 2 },
      container: {
        app: 'library',
        resource: 'Branch',
        form: 'identity',
        cardinality: 'one',
        id: 'DT',
      },
    })
    expect(typeof book.shelf.resolve).toBe('function')
    expect(typeof book.shelf.container?.resolve).toBe('function')
    expect(typeof book.sequels.resolve).toBe('function')
    const entries = book.sequels.form === 'identity' ? book.sequels.entries : []
    expect(entries).toHaveLength(2)
    for (const entry of entries) expect(typeof entry.resolve).toBe('function')
    expect(typeof entries[0]?.container?.resolve).toBe('function')
    expect(typeof entries[0]?.container?.container?.resolve).toBe('function')
  })

  it('keeps client state off the data: own enumerable keys are exactly the data fields', async () => {
    const { book } = await decodedBook()

    expect(Object.keys(book.shelf)).toEqual([
      'app',
      'resource',
      'form',
      'cardinality',
      'selector',
      'container',
    ])
    expect(Object.hasOwn(book.shelf, 'resolve')).toBe(false)
    // An absent container is an absent property, not an own `undefined`.
    const entries = book.sequels.form === 'identity' ? book.sequels.entries : []
    expect(Object.keys(entries[1] ?? {})).toEqual(['app', 'resource', 'form', 'cardinality', 'id'])
    expect(JSON.parse(JSON.stringify(book.sequels))).toEqual({
      app: 'library',
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [
        {
          app: 'library',
          resource: 'Book',
          form: 'identity',
          cardinality: 'one',
          id: DUNE_ISBN,
          container: {
            app: 'library',
            resource: 'Shelf',
            form: 'selector',
            cardinality: 'one',
            selector: { by: 'index', index: 2 },
            container: {
              app: 'library',
              resource: 'Branch',
              form: 'identity',
              cardinality: 'one',
              id: 'DT',
            },
          },
        },
        {
          app: 'library',
          resource: 'Book',
          form: 'identity',
          cardinality: 'one',
          id: DUNE_MESSIAH_ISBN,
        },
      ],
    })
  })

  it('re-encodes a bound reference to exactly the canonical wire form', async () => {
    const { book } = await decodedBook()

    expect(shelfReference.encode(book.shelf)).toEqual({
      ok: true,
      value: { reference: SHELF_IN_BRANCH },
    })
    expect(booksReference.encode(book.sequels)).toEqual({
      ok: true,
      value: { reference: SEQUELS_WITH_CONTAINERS },
    })
  })

  it('fails encoding once an own enumerable property is added (D8 strictness)', async () => {
    const { book } = await decodedBook()
    Object.assign(book.shelf, { note: 'top row' })

    const encoded = shelfReference.encode(book.shelf)

    expect(encoded.ok).toBe(false)
    if (encoded.ok) return
    expect(encoded.issues).toHaveLength(1)
    expect(encoded.issues[0]).toMatchObject({ path: ['note'], code: 'unknown-field' })
  })
})

describe('resolving bound references', () => {
  it('sends each level its own re-encoded data, and decodes with its get or list operation', async () => {
    const { book, sent } = await decodedBook((request) => {
      const payload = (request.wire as { reference: { resource: string; cardinality: string } })
        .reference
      if (payload.resource === 'Branch') return { code: 'DT', name: 'Downtown' }
      if (payload.resource === 'Shelf') return SCIENCE_FICTION_WIRE
      return payload.cardinality === 'many' ? [DUNE_WIRE, DUNE_MESSIAH_WIRE] : DUNE_MESSIAH_WIRE
    })
    const controller = new AbortController()

    const shelf = await book.shelf.resolve({ signal: controller.signal })
    const branch = await book.shelf.container?.resolve()
    const sequels = await book.sequels.resolve()
    const entries = book.sequels.form === 'identity' ? book.sequels.entries : []
    const second = await entries[1]?.resolve()

    expect(shelf).toEqual(SCIENCE_FICTION_WIRE)
    expect(branch).toEqual({ code: 'DT', name: 'Downtown' })
    expect(sequels).toHaveLength(2)
    expect(second).toMatchObject({ isbn: DUNE_MESSIAH_ISBN, title: 'Dune Messiah', pages: 256 })
    expect(sent.slice(1)).toEqual([
      {
        kind: 'resolve',
        wire: { reference: SHELF_IN_BRANCH },
        options: { signal: controller.signal },
      },
      {
        kind: 'resolve',
        wire: { reference: { resource: 'Branch', form: 'identity', cardinality: 'one', id: 'DT' } },
        options: undefined,
      },
      { kind: 'resolve', wire: { reference: SEQUELS_WITH_CONTAINERS }, options: undefined },
      {
        kind: 'resolve',
        wire: {
          reference: {
            resource: 'Book',
            form: 'identity',
            cardinality: 'one',
            id: DUNE_MESSIAH_ISBN,
          },
        },
        options: undefined,
      },
    ])
  })

  it('raises UnexpectedValueError when the result fails the resolving operation output contract', async () => {
    // A shelf answered where a book is expected.
    const { client, sent } = recordingClient(() => SCIENCE_FICTION_WIRE)

    const error = await rejection(
      client.resolve({
        app: 'library',
        resource: 'Book',
        form: 'identity',
        cardinality: 'one',
        id: DUNE_ISBN,
      })
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      message:
        'The result of resolving a reference as "library.books.get" does not match its contract.',
    })
    expect(sent).toHaveLength(1)
  })

  it("raises ValidationError at a nested container's app, sending nothing", async () => {
    const { client, sent } = recordingClient(() => DUNE_WIRE)
    const reference: ReferenceData = {
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Dune' },
      container: {
        app: 'bookstore',
        resource: 'Shelf',
        form: 'identity',
        cardinality: 'one',
        id: 'SF-1',
      },
    }

    const error = await rejection(client.resolve(reference))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['container', 'app']])
    expect(sent).toHaveLength(0)
  })

  it('raises ValidationError for a reference without a valid resource or cardinality, sending nothing', async () => {
    const { client, sent } = recordingClient(() => DUNE_WIRE)
    // A caller that bypassed the static types.
    const malformed = {
      app: 'library',
      resource: '',
      form: 'identity',
      cardinality: 'some',
      id: 'x',
    }

    const error = await rejection(client.resolve(malformed as unknown as ReferenceData))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues.map((issue) => issue.path)).toEqual([['resource'], ['cardinality']])
    expect(sent).toHaveLength(0)
  })

  it('raises InternalError when the contract records a resolving operation it does not contain', async () => {
    // Inconsistent: the resource table names a get the operations lack.
    const inconsistent: ClientApp = {
      ...libraryContract,
      operations: Object.fromEntries(
        Object.entries(libraryContract.operations).filter(([id]) => id !== 'library.shelves.get')
      ),
    }
    const { client, sent } = recordingClient(() => SCIENCE_FICTION_WIRE, inconsistent)

    const error = await rejection(
      client.resolve({
        app: 'library',
        resource: 'Shelf',
        form: 'identity',
        cardinality: 'one',
        id: 'SF-1',
      })
    )

    expect(error).toBeInstanceOf(InternalError)
    expect(sent).toHaveLength(0)
  })

  it('raises InternalError when a collection resolves to something other than an array', async () => {
    // Inconsistent: the list operation's output contract is a single record.
    const listOperation = libraryContract.operations['library.books.list']
    const getOperation = libraryContract.operations['library.books.get']
    if (listOperation === undefined || getOperation === undefined) throw new Error('fixture')
    const inconsistent: Pick<AppContract<unknown>, 'app' | 'resources' | 'operations'> = {
      ...libraryContract,
      operations: {
        ...libraryContract.operations,
        'library.books.list': { ...listOperation, output: getOperation.output },
      },
    }
    const { client } = recordingClient(
      (request) => (request.kind === 'invoke' ? DUNE_WIRE : DUNE_MESSIAH_WIRE),
      inconsistent
    )
    const book = await client.books.get()

    const error = await rejection(book.sequels.resolve())

    expect(error).toBeInstanceOf(InternalError)
  })
})

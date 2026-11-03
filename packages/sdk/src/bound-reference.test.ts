/**
 * Unit tests for binding decoded references to a client and resolving them,
 * through `createCodecClient` with a recording transport (no runtime,
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
 * - D7 Resolution step 8: an identity collection resolves to exactly one
 *   record per entry; the client checks it again, and a mismatch is
 *   `UnexpectedValueError`.
 * - D7 Caller-built references: `bindReference(client, data)` encodes the
 *   data through the app's reference value type and decodes it with the
 *   client's own decode context, so the result is a reference the client
 *   could have decoded; binding sends nothing; it rebinds a reference bound
 *   to another client of the same app; everything encoding rejects (another
 *   app at any level, a malformed or other-form field, a target, container,
 *   or entry without its resolving operation) is `ValidationError` with the
 *   encode issues.
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
  type ClientBrand,
  type ReferenceData,
  type ResourceDescriptor,
  type ResourceTable,
  type WireValue,
} from '@macts/contracts'
import { bindReference, createCodecClient } from './codec-runtime.js'
import {
  DUNE_ISBN,
  DUNE_MESSIAH_ISBN,
  DUNE_MESSIAH_WIRE,
  DUNE_WIRE,
  SCIENCE_FICTION_WIRE,
  libraryContract,
  type LibraryClient,
  type LibraryResources,
} from './library-fixture.js'
import { rejection, thrownBy } from './test-helpers.js'

/** One request a transport received. */
interface Sent {
  readonly kind: 'invoke' | 'resolve'
  readonly wire: WireValue
  readonly options: CallOptions | undefined
}

/**
 * A library client over a transport that records what it is sent and answers
 * `answer`.
 *
 * @remarks
 * Its type carries the widest resource table, because `app` may differ from
 * the library contract, so binding is checked here only at runtime.
 */
function recordingClient(
  answer: (sent: Sent) => unknown,
  app: AppContract<LibraryClient> = libraryContract
): { client: LibraryClient & ClientBrand<ResourceTable>; sent: Sent[] } {
  const sent: Sent[] = []
  const record = (request: Sent): Promise<unknown> => {
    sent.push(request)
    return Promise.resolve(answer(request))
  }
  const client = createCodecClient(app, {
    invoke: (_operation, wire, options) => record({ kind: 'invoke', wire, options }),
    resolve: (wire, options) => record({ kind: 'resolve', wire, options }),
  })
  return { client, sent }
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

  it('compares equal to its data except under prototype-strict equality', async () => {
    const { book } = await decodedBook()
    const data = {
      app: 'library',
      resource: 'Branch',
      form: 'identity',
      cardinality: 'one',
      id: 'DT',
    }

    expect(book.shelf.container).toEqual(data)
    expect({ ...book.shelf.container }).toStrictEqual(data)
    expect(JSON.parse(JSON.stringify(book.shelf.container))).toStrictEqual(data)
    // A bound reference is a class instance, not a plain object.
    expect(book.shelf.container).not.toStrictEqual(data)
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

  it('raises UnexpectedValueError when an identity collection resolves to fewer records than entries', async () => {
    // Two entries, one record: an entry was dropped instead of reported.
    const { book, sent } = await decodedBook(() => [DUNE_WIRE])

    const error = await rejection(book.sequels.resolve())

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      message:
        'The result of resolving a reference as "library.books.list" must hold one record per ' +
        'entry: expected 2 records, received 1.',
      details: {
        issues: [{ path: [], message: 'Expected 2 records, one per entry, but received 1' }],
      },
    })
    expect(sent.map((request) => request.kind)).toEqual(['invoke', 'resolve'])
  })

  it('raises UnexpectedValueError when an identity collection resolves to more records than entries', async () => {
    const { client } = recordingClient(() => [DUNE_WIRE, DUNE_MESSIAH_WIRE])

    const error = await rejection(
      client.resolve({
        app: 'library',
        resource: 'Book',
        form: 'identity',
        cardinality: 'many',
        entries: [],
      })
    )

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({
      details: {
        issues: [{ path: [], message: 'Expected 0 records, one per entry, but received 2' }],
      },
    })
  })

  it('does not count records for a selector collection', async () => {
    const { client } = recordingClient(() => [DUNE_WIRE, DUNE_MESSIAH_WIRE])

    const resolved = await client.resolve({
      app: 'library',
      resource: 'Book',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    })

    expect(resolved).toHaveLength(2)
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
    const inconsistent: AppContract<LibraryClient> = {
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

  it('raises InternalError when the list a collection resolves through does not return a page', async () => {
    // Inconsistent: the list operation's output contract is a single record,
    // not a page, so no item type is known to decode the resolved records with.
    const listOperation = libraryContract.operations['library.books.list']
    const getOperation = libraryContract.operations['library.books.get']
    if (listOperation === undefined || getOperation === undefined) throw new Error('fixture')
    const inconsistent: AppContract<LibraryClient> = {
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

/** A library resource-table entry with its `get` or `list` operation removed. */
function withoutOperation(
  entry: ResourceDescriptor<unknown> | undefined,
  key: 'get' | 'list'
): ResourceDescriptor<unknown> {
  if (entry === undefined) throw new Error('fixture')
  const { name, record, id, get, list } = entry
  return {
    name,
    record,
    ...(id === undefined ? {} : { id }),
    ...(key === 'get' || get === undefined ? {} : { get }),
    ...(key === 'list' || list === undefined ? {} : { list }),
  }
}

/** The library contract with one resource's `get` or `list` operation removed from its table. */
function libraryWithout(
  resource: keyof LibraryResources,
  key: 'get' | 'list'
): AppContract<LibraryClient> {
  return {
    ...libraryContract,
    resources: {
      ...libraryContract.resources,
      [resource]: withoutOperation(libraryContract.resources[resource], key),
    },
  }
}

/** A reference to Dune by its ISBN, built by hand as a caller would. */
const DUNE_REFERENCE: ReferenceData = {
  app: 'library',
  resource: 'Book',
  form: 'identity',
  cardinality: 'one',
  id: DUNE_ISBN,
}

/** The science-fiction shelf within the downtown branch, built by hand. */
const SHELF_IN_DOWNTOWN: ReferenceData = {
  app: 'library',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'SF-1',
  container: { app: 'library', resource: 'Branch', form: 'identity', cardinality: 'one', id: 'DT' },
}

/** One reference that binding must reject, with the issue paths encoding reports for it. */
interface RejectedCase {
  readonly name: string
  readonly reference: unknown
  readonly paths: readonly (readonly (string | number)[])[]
  /** The contract the client is created from, when it is not the library contract. */
  readonly contract?: AppContract<LibraryClient>
}

const REJECTED: readonly RejectedCase[] = [
  {
    name: 'another app at the top level',
    reference: { ...DUNE_REFERENCE, app: 'bookstore' },
    paths: [['app']],
  },
  {
    name: 'another app in a container',
    reference: {
      ...SHELF_IN_DOWNTOWN,
      container: {
        app: 'bookstore',
        resource: 'Branch',
        form: 'identity',
        cardinality: 'one',
        id: 'DT',
      },
    },
    paths: [['container', 'app']],
  },
  {
    name: 'another app in an identity-collection entry',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [{ ...DUNE_REFERENCE, app: 'bookstore' }],
    },
    paths: [['entries', 0, 'app']],
  },
  {
    name: 'no resource and no cardinality',
    reference: { app: 'library', resource: '', form: 'identity', cardinality: 'some', id: 'x' },
    paths: [['resource'], ['cardinality']],
  },
  {
    // D8 strictness: a field of the other form is an undeclared own field.
    name: 'an identity reference carrying a selector',
    reference: { ...DUNE_REFERENCE, selector: { by: 'name', name: 'Dune' } },
    paths: [['selector']],
  },
  {
    // A branch has a get but no list, so a collection of branches could never resolve.
    name: 'a collection of a resource without a list operation',
    reference: {
      app: 'library',
      resource: 'Branch',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    },
    paths: [[]],
  },
  {
    name: 'a container whose resource has no get operation',
    reference: SHELF_IN_DOWNTOWN,
    paths: [['container', 'resource']],
    contract: libraryWithout('Branch', 'get'),
  },
  {
    name: 'an identity-collection entry whose resource has no get operation',
    reference: {
      app: 'library',
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [DUNE_REFERENCE],
    },
    paths: [['entries', 0, 'resource']],
    contract: libraryWithout('Book', 'get'),
  },
]

describe('bindReference', () => {
  it('binds caller-built data at every level, sending nothing', () => {
    const { client, sent } = recordingClient(() => SCIENCE_FICTION_WIRE)

    const shelf = bindReference(client, SHELF_IN_DOWNTOWN)

    expect(shelf).toEqual(SHELF_IN_DOWNTOWN)
    expect(Object.keys(shelf)).toEqual([
      'app',
      'resource',
      'form',
      'cardinality',
      'id',
      'container',
    ])
    expect(typeof shelf.resolve).toBe('function')
    expect(typeof shelf.container?.resolve).toBe('function')
    expect(sent).toHaveLength(0)
  })

  it('binds a reference that resolves through the client, sending its canonical wire form', async () => {
    const { client, sent } = recordingClient(() => SCIENCE_FICTION_WIRE)

    const resolved = await bindReference(client, SHELF_IN_DOWNTOWN).resolve()

    expect(resolved).toEqual(SCIENCE_FICTION_WIRE)
    expect(sent).toEqual([
      {
        kind: 'resolve',
        wire: {
          reference: {
            resource: 'Shelf',
            form: 'identity',
            cardinality: 'one',
            id: 'SF-1',
            container: { resource: 'Branch', form: 'identity', cardinality: 'one', id: 'DT' },
          },
        },
        options: undefined,
      },
    ])
  })

  it('binds a collection whose entries are each bound to the client', async () => {
    const { client, sent } = recordingClient(() => DUNE_WIRE)
    const sequels: ReferenceData = {
      app: 'library',
      resource: 'Book',
      form: 'identity',
      cardinality: 'many',
      entries: [DUNE_REFERENCE],
    }

    const bound = bindReference(client, sequels)
    const first = await bound.entries[0]?.resolve()

    expect(bound).toEqual(sequels)
    expect(first).toMatchObject({ isbn: DUNE_ISBN, title: 'Dune' })
    expect(sent).toEqual([
      {
        kind: 'resolve',
        wire: {
          reference: { resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_ISBN },
        },
        options: undefined,
      },
    ])
  })

  it('rebinds a reference bound to another client of the same app', async () => {
    const first = await decodedBook()
    const second = recordingClient(() => SCIENCE_FICTION_WIRE)

    const rebound = bindReference(second.client, first.book.shelf)
    const resolved = await rebound.resolve()

    expect(rebound).toEqual(first.book.shelf)
    expect(rebound).not.toBe(first.book.shelf)
    expect(resolved).toEqual(SCIENCE_FICTION_WIRE)
    // Only the operation call that decoded the book reached the first client.
    expect(first.sent.map((request) => request.kind)).toEqual(['invoke'])
    expect(second.sent).toEqual([
      { kind: 'resolve', wire: { reference: SHELF_IN_BRANCH }, options: undefined },
    ])
  })

  describe('raises ValidationError with the encode issues, sending nothing, for', () => {
    it.each(REJECTED)('$name', ({ reference, paths, contract }) => {
      const { client, sent } = recordingClient(() => DUNE_WIRE, contract)

      // A caller that bypassed the static types.
      const error = thrownBy(() => bindReference(client, reference as ReferenceData))

      expect(error).toBeInstanceOf(ValidationError)
      if (!(error instanceof ValidationError)) return
      expect(error.message).toBe('The library reference to bind failed validation.')
      expect(error.details.issues.map((issue) => issue.path)).toEqual(paths)
      expect(sent).toHaveLength(0)
    })
  })

  it('raises TypeError for a value that is not a client made by either factory', async () => {
    const { client } = recordingClient(() => DUNE_WIRE)
    const decoded = (await decodedBook()).book

    // A copy of a client has the same members but was not made by a factory.
    for (const notAClient of [{}, { ...client }, libraryContract, decoded.shelf]) {
      expect(() => bindReference(notAClient, DUNE_REFERENCE)).toThrow(TypeError)
    }
    // @ts-expect-error -- a caller that bypassed the static types
    expect(() => bindReference('library', DUNE_REFERENCE)).toThrow(TypeError)
  })

  it('raises InternalError when a contract binds one client object over two runtimes', () => {
    const shared = libraryContract.bind({
      invoke: () => Promise.reject(new Error('unused')),
      resolve: () => Promise.reject(new Error('unused')),
    })
    const sharing: AppContract<LibraryClient> = { ...libraryContract, bind: () => shared }
    recordingClient(() => DUNE_WIRE, sharing)

    // Recording it again would resolve the first client's references under the second runtime.
    expect(() => recordingClient(() => DUNE_WIRE, sharing)).toThrow(InternalError)
  })
})

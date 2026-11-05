/**
 * A hand-written app contract whose records hold references, for tests of
 * reference resolution through both clients.
 *
 * It stands in for a generated contract. Operation ids and permissions are
 * derived by hand from the manifest route rules
 * (`app.<resource plural>.<command key>`, permission
 * `app:<resource plural>:<command key>`):
 *
 * - `Branch` (string identifier `code`): get `library.branches.get`.
 * - `Shelf` (string identifier `code`): get `library.shelves.get`, list
 *   `library.shelves.list`.
 * - `Book` (string identifier `isbn`): get `library.books.get`, list
 *   `library.books.list`.
 *
 * A book record holds a reference to its shelf and a collection of its
 * sequels, so a resolved book carries references of its own. Every resource
 * has a `get`, so each can be a container: a book is located within a shelf,
 * and a shelf within a branch.
 *
 * Wire values are written by hand from phases/13: integers as the D3 control
 * record `{"integer": "…"}`, references as the D7 control record
 * `{"reference": {…}}` with no `app`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D3, D7)
 */

import type { AppManifest } from '@macts/core'
import {
  Integer,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type CollectionReferenceVariant,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type OperationId,
  type PermissionString,
  type ReferenceData,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

/** The library app's manifest. */
export const LIBRARY_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Library', bundleId: 'com.example.library', tccEntitlements: [] },
  resources: {
    Branch: {
      name: 'Branch',
      plural: 'Branches',
      description: 'A library branch',
      properties: {},
      identifiers: [{ property: 'code', primary: true, targeting: 'byId' }],
    },
    Shelf: {
      name: 'Shelf',
      plural: 'Shelves',
      description: 'A shelf',
      properties: {},
      identifiers: [{ property: 'code', primary: true, targeting: 'byId' }],
    },
    Book: {
      name: 'Book',
      plural: 'Books',
      description: 'A book',
      properties: {},
      identifiers: [{ property: 'isbn', primary: true, targeting: 'byId' }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one item',
      scope: 'resource',
      resourceType: ['Branch', 'Shelf', 'Book'],
      parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
    },
    list: {
      name: 'list',
      description: 'List items',
      scope: 'resource',
      resourceType: ['Shelf', 'Book'],
      parameters: [],
    },
  },
}

/** A branch as SDK callers see it. */
export interface Branch {
  readonly code: string
  readonly name: string
}

/** A shelf as SDK callers see it. */
export interface Shelf {
  readonly code: string
  readonly label: string
}

/** A book as SDK callers see it: its shelf and its sequels are bound references. */
export interface Book {
  readonly isbn: string
  readonly title: string
  readonly pages: Integer
  readonly shelf: ObjectReferenceVariant<Shelf, string, 'Shelf'>
  readonly sequels: CollectionReferenceVariant<Book, string, 'Book'>
}

/** The library contract, read lazily by every reference value type below. */
const scope = (): AppContract<LibraryClient> => libraryContract

const BRANCH_RECORD: ValueType<Branch> = t.record({ code: t.string(), name: t.string() })
const SHELF_RECORD: ValueType<Shelf> = t.record({ code: t.string(), label: t.string() })
const BOOK_RECORD: ValueType<Book> = t.record({
  isbn: t.string(),
  title: t.string(),
  pages: t.integer(),
  shelf: t.reference<Shelf, string, 'Shelf'>(scope, 'Shelf', 'one'),
  sequels: t.reference<Book, string, 'Book'>(scope, 'Book', 'many'),
})

/** One library operation descriptor. Its input is empty: resolution never uses it. */
function libraryOperation<Output>(
  id: OperationId,
  permission: PermissionString,
  command: string,
  resource: string,
  output: ValueType<Output>
): OperationDescriptor<Readonly<Record<string, never>>, Output> {
  return {
    id,
    permission,
    target: { command, resource },
    description: `${command} ${resource}`,
    input: t.record({}),
    output,
  }
}

/** `library.books.get`: one book. */
export const BOOKS_GET = libraryOperation(
  'library.books.get',
  'library:books:get',
  'get',
  'Book',
  BOOK_RECORD
)

/** Every library operation, as a generator would emit them. */
const LIBRARY_OPERATIONS: readonly AnyOperationDescriptor[] = [
  libraryOperation('library.branches.get', 'library:branches:get', 'get', 'Branch', BRANCH_RECORD),
  libraryOperation('library.shelves.get', 'library:shelves:get', 'get', 'Shelf', SHELF_RECORD),
  libraryOperation(
    'library.shelves.list',
    'library:shelves:list',
    'list',
    'Shelf',
    t.page(SHELF_RECORD)
  ),
  BOOKS_GET,
  libraryOperation('library.books.list', 'library:books:list', 'list', 'Book', t.page(BOOK_RECORD)),
]

/**
 * The library app's client.
 *
 * @remarks
 * `resolve` exposes the client runtime's own resolution, so tests can resolve
 * references they build by hand, as a caller passes such a reference to an
 * operation. A reference the client decoded resolves through its own
 * `resolve`, which calls the same runtime member.
 */
export interface LibraryClient {
  readonly books: {
    get(options?: CallOptions): Promise<Book>
  }
  resolve(reference: ReferenceData, options?: CallOptions): Promise<unknown>
}

/**
 * The type of the library resource table, declared as a generated contract
 * declares one: each entry builds on `ResourceDescriptor` and narrows the
 * identifier and the resolving operations it has to required literals.
 * `Branch` records `get` but no `list`.
 */
export type LibraryResources = Readonly<{
  Branch: ResourceDescriptor<Branch, string> & {
    readonly id: ValueType<string>
    readonly get: 'library.branches.get'
  }
  Shelf: ResourceDescriptor<Shelf, string> & {
    readonly id: ValueType<string>
    readonly get: 'library.shelves.get'
    readonly list: 'library.shelves.list'
  }
  Book: ResourceDescriptor<Book, string> & {
    readonly id: ValueType<string>
    readonly get: 'library.books.get'
    readonly list: 'library.books.list'
  }
}>

/** The library resource table, the implementation of {@link LibraryResources}. */
const LIBRARY_RESOURCES = {
  Branch: { name: 'Branch', record: BRANCH_RECORD, id: t.string(), get: 'library.branches.get' },
  Shelf: {
    name: 'Shelf',
    record: SHELF_RECORD,
    id: t.string(),
    get: 'library.shelves.get',
    list: 'library.shelves.list',
  },
  Book: {
    name: 'Book',
    record: BOOK_RECORD,
    id: t.string(),
    get: 'library.books.get',
    list: 'library.books.list',
  },
} satisfies LibraryResources

/** A hand-built contract for {@link LIBRARY_MANIFEST}, standing in for a generated one. */
export const libraryContract: AppContract<LibraryClient, LibraryResources> = {
  app: 'library',
  operations: Object.fromEntries(LIBRARY_OPERATIONS.map((op) => [op.id, op])),
  resources: LIBRARY_RESOURCES,
  loadManifest: () => Promise.resolve(LIBRARY_MANIFEST),
  bind(runtime: ClientRuntime): LibraryClient {
    return {
      books: { get: (options) => runtime.invoke(BOOKS_GET, {}, options) },
      resolve: (reference, options) => runtime.resolve(reference, options),
    }
  },
}

/** Dune's ISBN. */
export const DUNE_ISBN = '978-0441013593'
/** Dune Messiah's ISBN. */
export const DUNE_MESSIAH_ISBN = '978-0593098233'

/** The science-fiction shelf, in wire form; its SDK form is the same. */
export const SCIENCE_FICTION_WIRE = { code: 'SF-1', label: 'Science Fiction' } as const

/** The downtown branch, in wire form; its SDK form is the same. */
export const DOWNTOWN_WIRE = { code: 'DT', name: 'Downtown' } as const

/** The wire form of a reference to the science-fiction shelf by its code. */
const SCIENCE_FICTION_SHELF_REFERENCE = {
  reference: { resource: 'Shelf', form: 'identity', cardinality: 'one', id: 'SF-1' },
} as const

/** The wire form of the collection of Dune's sequels: one identity entry. */
const DUNE_SEQUELS_REFERENCE = {
  reference: {
    resource: 'Book',
    form: 'identity',
    cardinality: 'many',
    entries: [{ resource: 'Book', form: 'identity', cardinality: 'one', id: DUNE_MESSIAH_ISBN }],
  },
} as const

/** Dune, in wire form: 412 pages, on the science-fiction shelf, with one sequel. */
export const DUNE_WIRE = {
  isbn: DUNE_ISBN,
  title: 'Dune',
  pages: { integer: '412' },
  shelf: SCIENCE_FICTION_SHELF_REFERENCE,
  sequels: DUNE_SEQUELS_REFERENCE,
} as const

/** Dune Messiah, in wire form: 256 pages, on the same shelf, with no sequels listed. */
export const DUNE_MESSIAH_WIRE = {
  isbn: DUNE_MESSIAH_ISBN,
  title: 'Dune Messiah',
  pages: { integer: '256' },
  shelf: SCIENCE_FICTION_SHELF_REFERENCE,
  sequels: {
    reference: { resource: 'Book', form: 'identity', cardinality: 'many', entries: [] },
  },
} as const

/**
 * The data fields of the science-fiction shelf reference as decoding produces
 * them: the wire payload with the app at every level.
 */
export const SCIENCE_FICTION_SHELF_DATA = {
  app: 'library',
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'SF-1',
} as const

/** Dune as SDK callers see it, data fields only: 412 is a number, references are data. */
export const DUNE_DATA = {
  isbn: DUNE_ISBN,
  title: 'Dune',
  pages: 412,
  shelf: SCIENCE_FICTION_SHELF_DATA,
  sequels: {
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
        id: DUNE_MESSIAH_ISBN,
      },
    ],
  },
} as const

/** Dune Messiah as SDK callers see it, data fields only. */
export const DUNE_MESSIAH_DATA = {
  isbn: DUNE_MESSIAH_ISBN,
  title: 'Dune Messiah',
  pages: 256,
  shelf: SCIENCE_FICTION_SHELF_DATA,
  sequels: { app: 'library', resource: 'Book', form: 'identity', cardinality: 'many', entries: [] },
} as const

/** A selector position, as an SDK `Integer`. */
export function position(value: number): Integer {
  return Integer.validate(value)
}

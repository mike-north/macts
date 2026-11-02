/**
 * A small app registered from a hand-built contract, for HTTP tests of
 * reference resolution.
 *
 * Reference resolution needs an app contract (its resource table is the app's
 * reference registry, phases/13 D7), which a passthrough manifest registration
 * does not have. This fixture stands in for a generated contract. Operation
 * ids and permissions are derived by hand from the manifest route rules
 * (`app.<resource plural>.<command key>`, permission
 * `app:<resource plural>:<command key>`):
 *
 * - `Book` (string identifier `isbn`): get `library.books.get`
 *   (`library:books:get`), list `library.books.list` (`library:books:list`).
 * - `Shelf` (string identifier `code`): list `library.shelves.list`
 *   (`library:shelves:list`) and no get, so a single shelf reference has no
 *   operation to resolve as.
 */

import type { AppManifest } from '@macts/core'
import {
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type Authority,
  type OperationId,
  type PermissionString,
} from '@macts/contracts'

/** The library app's manifest. */
export const LIBRARY_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Library', bundleId: 'com.example.library', tccEntitlements: [] },
  resources: {
    Shelf: {
      name: 'Shelf',
      plural: 'Shelves',
      description: 'A shelf',
      properties: {},
      identifiers: [{ property: 'code', primary: true }],
    },
    Book: {
      name: 'Book',
      plural: 'Books',
      description: 'A book',
      properties: {},
      identifiers: [{ property: 'isbn', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one book',
      scope: 'resource',
      resourceType: 'Book',
      parameters: [{ name: 'isbn', type: 'string', description: 'ISBN', required: true }],
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

/** A shelf record. */
const SHELF_RECORD = t.record({ code: t.string(), label: t.string() })
/** A book record; `pages` is an integer, so its wire form is a control record. */
const BOOK_RECORD = t.record({ isbn: t.string(), title: t.string(), pages: t.integer() })

/** One library operation descriptor, with an input the tests never exercise. */
function libraryOperation(
  id: OperationId,
  permission: PermissionString,
  command: string,
  resource: string,
  output: AnyOperationDescriptor['output']
): AnyOperationDescriptor {
  return {
    id,
    permission,
    target: { command, resource },
    description: `${command} ${resource}`,
    input: t.record({}),
    output,
  }
}

/** The descriptors of the library's operations, as a generator would emit them. */
const LIBRARY_OPERATIONS: readonly AnyOperationDescriptor[] = [
  libraryOperation('library.books.get', 'library:books:get', 'get', 'Book', BOOK_RECORD),
  libraryOperation(
    'library.books.list',
    'library:books:list',
    'list',
    'Book',
    t.array(BOOK_RECORD)
  ),
  libraryOperation(
    'library.shelves.list',
    'library:shelves:list',
    'list',
    'Shelf',
    t.array(SHELF_RECORD)
  ),
]

/** A hand-built contract for {@link LIBRARY_MANIFEST}, standing in for a generated one. */
export function libraryContract(): AppContract<unknown> {
  return {
    app: 'library',
    operations: Object.fromEntries(LIBRARY_OPERATIONS.map((op) => [op.id, op])),
    resources: {
      Shelf: { name: 'Shelf', record: SHELF_RECORD, id: t.string(), list: 'library.shelves.list' },
      Book: {
        name: 'Book',
        record: BOOK_RECORD,
        id: t.string(),
        get: 'library.books.get',
        list: 'library.books.list',
      },
    },
    loadManifest: () => Promise.resolve(LIBRARY_MANIFEST),
    bind: () => ({}),
  }
}

/** Secrets the library tests' verifier recognizes. */
export const LIBRARIAN_TOKEN = 'macts_sk_librarian-token-must-never-leak'
export const BOOK_LISTER_TOKEN = 'macts_sk_book-lister-token-must-never-leak'

/** Holds every library permission. */
export const LIBRARIAN: Authority = {
  subject: 'key_librarian',
  permissions: ['library:books:get', 'library:books:list', 'library:shelves:list'],
}

/** May list books, but not read one book. */
export const BOOK_LISTER: Authority = {
  subject: 'key_book_lister',
  permissions: ['library:books:list'],
}

/** A book in wire form; `pages` is an integer control record (phases/13 D3). */
export const DUNE_WIRE = { isbn: '978-0441013593', title: 'Dune', pages: { integer: '412' } }

/** A second book in wire form. */
export const FOUNDATION_WIRE = {
  isbn: '978-0553293357',
  title: 'Foundation',
  pages: { integer: '255' },
}

/** The book identified by Dune's ISBN, as a reference payload. */
export const DUNE = {
  resource: 'Book',
  form: 'identity',
  cardinality: 'one',
  id: '978-0441013593',
} as const

/** Every book, as a reference payload. */
export const EVERY_BOOK = {
  resource: 'Book',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const

/** Two explicitly identified books, as a reference payload. */
export const TWO_BOOKS = {
  resource: 'Book',
  form: 'identity',
  cardinality: 'many',
  entries: [
    { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0441013593' },
    { resource: 'Book', form: 'identity', cardinality: 'one', id: '978-0553293357' },
  ],
} as const

/** The fifth book, by position, as a reference payload. */
export const FIFTH_BOOK = {
  resource: 'Book',
  form: 'selector',
  cardinality: 'one',
  // Positions are integer control records on the wire (phases/13 D3, D7).
  selector: { by: 'index', index: { integer: '4' } },
} as const

/** The shelf coded `SF-1`, as a reference payload; shelves have no get operation. */
export const SCIENCE_FICTION_SHELF = {
  resource: 'Shelf',
  form: 'identity',
  cardinality: 'one',
  id: 'SF-1',
} as const

/** Wrap a reference payload in its wire control record, as encoding produces it (phases/13 D7). */
export function wire(payload: unknown): { readonly reference: unknown } {
  return { reference: payload }
}

/**
 * Tests for superclass inheritance in a manifest: a resource whose dictionary
 * class inherits another records `inherits: { resource, evidence }`, and the
 * manifest is read flattened.
 *
 * Expected values are written by hand from the rule in
 * `phases/13-sdk-value-and-execution-contracts.md` (D10, "Superclasses"):
 *
 * - a resource gains each ancestor property it does not declare, nearest
 *   ancestor first, whole, with its code, native spelling and `unsupported`
 *   marker, and with only the claims the dictionary itself backs (an `sdef`
 *   nullability claim); claims observed on, or curated for, the ancestor's
 *   own collection (probe or curated nullability, resettability) stay with it;
 * - a property the resource declares replaces the inherited one whole;
 * - the resource gains the nearest ancestor's identifiers when it declares
 *   none, without uniqueness claims, which describe one collection's items;
 * - collection-level records (`code`, `native`, `unsupported`, probe blocks)
 *   are never inherited;
 * - an unknown superclass and a cycle are manifest errors at
 *   `resources.<R>.inherits.resource`.
 *
 * The stand-in Catalog app's dictionary has an `item` class (Item) that
 * `book` (Book) and `magazine` (Magazine) inherit, `novel` (Novel) inheriting
 * `book`, and `pamphlet` (Pamphlet) inheriting `item`.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 * @see `man 5 sdef`, the `inherits` attribute of a class
 */

import { describe, expect, it } from 'vitest'
import { AppManifestSchema, type AppManifest } from './schemas/app.js'
import { parseManifestYaml } from './loader.js'

const DICTIONARY = {
  source: 'dictionary',
  bundleId: 'com.example.catalog',
  appVersion: '2.0',
  osVersion: '27.2',
} as const

/** The `inherits` record naming `resource`, from the dictionary term `term`. */
const inherits = (resource: string, term: string): Record<string, unknown> => ({
  resource,
  evidence: { ...DICTIONARY, term },
})

const PROBE_NON_NULL = {
  source: 'probe',
  observedAt: '2026-11-04T10:00:00.000Z',
  bundleId: 'com.example.catalog',
  appVersion: '2.0',
  osVersion: '27.2',
  sampleSize: 40,
  nullCount: 0,
  failedReads: 0,
} as const

const LEGACY_UNSUPPORTED = {
  reason: 'The app no longer has shelf marks; every read fails.',
  evidence: {
    source: 'probe',
    observedAt: '2026-11-04T10:00:00.000Z',
    bundleId: 'com.example.catalog',
    appVersion: '2.0',
    osVersion: '27.2',
    sampleSize: 3,
    failedReads: 3,
    errorNumbers: [-1728],
  },
} as const

/** The Catalog item class: every kind of the app's item inherits it. */
function item(): Record<string, unknown> {
  return {
    name: 'Item',
    plural: 'Items',
    description: 'An item in the catalog',
    code: 'citm',
    native: { collection: 'catalogItems', evidence: { ...DICTIONARY, term: 'catalog items' } },
    properties: {
      id: { access: 'r', type: 'string', description: 'The id of the item', code: 'ID  ' },
      name: { access: 'rw', type: 'string', description: 'The name of the item', code: 'pnam' },
      size: {
        access: 'r',
        type: 'integer',
        description: 'The size of the item',
        code: 'ptsz',
        nullable: false,
        evidence: { nullable: PROBE_NON_NULL },
      },
      note: {
        access: 'rw',
        type: 'string',
        description: 'A note about the item',
        code: 'note',
        resettable: true,
        evidence: {
          resettable: { source: 'curated', note: 'Setting it to missing value clears it.' },
        },
      },
      label: {
        access: 'r',
        type: 'string',
        description: 'The label of the item',
        code: 'labl',
        nullable: true,
        evidence: { nullable: { source: 'sdef', note: 'The dictionary says it can be missing.' } },
      },
      uRL: {
        access: 'r',
        type: 'string',
        description: 'The URL of the item',
        code: 'url ',
        native: { name: 'url', evidence: { ...DICTIONARY, term: 'URL' } },
      },
      shelfMark: {
        access: 'r',
        type: 'string',
        description: 'The shelf mark of the item',
        code: 'shlf',
        unsupported: LEGACY_UNSUPPORTED,
      },
    },
    identifiers: [
      {
        property: 'id',
        primary: true,
        unique: true,
        evidence: { unique: { source: 'curated', note: '40 items read, ids distinct.' } },
      },
    ],
  }
}

/** A Catalog manifest of `resources`, with no commands. */
function catalog(resources: Record<string, unknown>): Record<string, unknown> {
  return {
    version: '1.0',
    app: { name: 'Catalog', bundleId: 'com.example.catalog' },
    resources,
    hierarchy: { children: {} },
  }
}

/** The stand-in Catalog: Item, Book and Novel in a chain, Magazine and Pamphlet beside Book. */
function catalogManifest(): Record<string, unknown> {
  return catalog({
    Item: item(),
    Book: {
      name: 'Book',
      plural: 'Books',
      description: 'A book in the catalog',
      code: 'cbok',
      inherits: inherits('Item', 'item'),
      properties: {
        author: { access: 'r', type: 'string', description: 'The author', code: 'auth' },
        name: { access: 'rw', type: 'string', description: 'The title of the book', code: 'pnam' },
      },
    },
    Novel: {
      name: 'Novel',
      plural: 'Novels',
      description: 'A novel in the catalog',
      inherits: inherits('Book', 'book'),
      properties: {
        genre: { access: 'r', type: 'string', description: 'The genre', code: 'genr' },
      },
    },
    Magazine: {
      name: 'Magazine',
      plural: 'Magazines',
      description: 'A magazine in the catalog',
      inherits: inherits('Item', 'item'),
      properties: {
        issn: { access: 'r', type: 'string', description: 'The ISSN', code: 'issn' },
      },
      identifiers: [{ property: 'issn', primary: true }],
    },
    Pamphlet: {
      name: 'Pamphlet',
      plural: 'Pamphlets',
      description: 'A pamphlet in the catalog',
      inherits: inherits('Item', 'item'),
      properties: {
        // The app cannot read a pamphlet's size: the override marks it.
        size: {
          access: 'r',
          type: 'integer',
          description: 'The size of the item',
          code: 'ptsz',
          unsupported: {
            ...LEGACY_UNSUPPORTED,
            reason: 'Pamphlets have no size; every read fails.',
          },
        },
        // A pamphlet's shelf mark reads: the override declares it supported.
        shelfMark: {
          access: 'r',
          type: 'string',
          description: 'The shelf mark of the pamphlet',
          code: 'shlf',
        },
      },
    },
  })
}

/** The flattened Catalog. */
function parsed(): AppManifest {
  return AppManifestSchema.parse(catalogManifest())
}

/** Resource `key` of a parsed manifest. */
function resourceOf(manifest: AppManifest, key: string): AppManifest['resources'][string] {
  const resource = manifest.resources[key]
  if (resource === undefined) throw new Error(`no resource ${key}`)
  return resource
}

/** Each issue a failed parse reports, as its path and message. */
function issues(input: unknown): { path: PropertyKey[]; message: string }[] {
  const result = AppManifestSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map(({ path, message }) => ({ path, message }))
}

describe('a resource that inherits a superclass', () => {
  it('records the superclass and its dictionary term', () => {
    expect(resourceOf(parsed(), 'Book').inherits).toEqual({
      resource: 'Item',
      evidence: { ...DICTIONARY, term: 'item' },
    })
  })

  it('gains the properties it does not declare, after its own, in the superclass order', () => {
    expect(Object.keys(resourceOf(parsed(), 'Book').properties)).toEqual([
      'author',
      'name',
      'id',
      'size',
      'note',
      'label',
      'uRL',
      'shelfMark',
    ])
  })

  it('keeps its own declaration of a property whole', () => {
    expect(resourceOf(parsed(), 'Book').properties['name']).toEqual({
      access: 'rw',
      type: 'string',
      description: 'The title of the book',
      code: 'pnam',
      optional: false,
    })
  })

  it("keeps an inherited property's code and native spelling", () => {
    expect(resourceOf(parsed(), 'Book').properties['uRL']).toEqual({
      access: 'r',
      type: 'string',
      description: 'The URL of the item',
      code: 'url ',
      optional: false,
      native: { name: 'url', evidence: { ...DICTIONARY, term: 'URL' } },
    })
  })

  it('keeps a nullability claim the dictionary backs', () => {
    const label = resourceOf(parsed(), 'Book').properties['label']
    expect(label?.nullable).toBe(true)
    expect(label?.evidence).toEqual({
      nullable: { source: 'sdef', note: 'The dictionary says it can be missing.' },
    })
  })

  it("leaves claims observed on the superclass's collection with it", () => {
    const book = resourceOf(parsed(), 'Book')
    // A probe of items says nothing yet about books, so the size falls back
    // to the default, and so does the curated resettability of the note.
    expect(book.properties['size']).toEqual({
      access: 'r',
      type: 'integer',
      description: 'The size of the item',
      code: 'ptsz',
      optional: false,
    })
    expect(book.properties['note']).toEqual({
      access: 'rw',
      type: 'string',
      description: 'A note about the item',
      code: 'note',
      optional: false,
    })
    // The superclass keeps its own claims.
    expect(resourceOf(parsed(), 'Item').properties['size']?.nullable).toBe(false)
  })

  it('inherits a property marked unsupported, still marked', () => {
    expect(resourceOf(parsed(), 'Book').properties['shelfMark']?.unsupported).toEqual(
      LEGACY_UNSUPPORTED
    )
  })

  it('can mark an inherited property unsupported, with evidence, by declaring it', () => {
    expect(resourceOf(parsed(), 'Pamphlet').properties['size']?.unsupported).toEqual({
      ...LEGACY_UNSUPPORTED,
      reason: 'Pamphlets have no size; every read fails.',
    })
  })

  it('can declare an inherited unsupported property supported', () => {
    expect(resourceOf(parsed(), 'Pamphlet').properties['shelfMark']).toEqual({
      access: 'r',
      type: 'string',
      description: 'The shelf mark of the pamphlet',
      code: 'shlf',
      optional: false,
    })
  })

  it("inherits the superclass's identifiers when it declares none, without uniqueness claims", () => {
    expect(resourceOf(parsed(), 'Book').identifiers).toEqual([{ property: 'id', primary: true }])
    // The superclass keeps its claim.
    expect(resourceOf(parsed(), 'Item').identifiers?.[0]?.unique).toBe(true)
  })

  it('keeps the identifiers it declares', () => {
    expect(resourceOf(parsed(), 'Magazine').identifiers).toEqual([
      { property: 'issn', primary: true },
    ])
  })

  it('does not inherit what describes the superclass itself', () => {
    const book = resourceOf(parsed(), 'Book')
    expect(book.code).toBe('cbok')
    expect(book.native).toBeUndefined()
    expect(resourceOf(parsed(), 'Novel').code).toBeUndefined()
  })

  it('leaves a resource that inherits nothing as it is', () => {
    const plain = AppManifestSchema.parse(catalog({ Item: item() }))
    expect(resourceOf(parsed(), 'Item')).toEqual(resourceOf(plain, 'Item'))
    expect(resourceOf(parsed(), 'Item').inherits).toBeUndefined()
  })
})

describe('a chain of superclasses', () => {
  it('gains every ancestor property, the nearest declaration winning', () => {
    const novel = resourceOf(parsed(), 'Novel')
    expect(Object.keys(novel.properties)).toEqual([
      'genre',
      'author',
      'name',
      'id',
      'size',
      'note',
      'label',
      'uRL',
      'shelfMark',
    ])
    // Book's name, not Item's.
    expect(novel.properties['name']?.description).toBe('The title of the book')
  })

  it("inherits the nearest ancestor's identifiers", () => {
    expect(resourceOf(parsed(), 'Novel').identifiers).toEqual([{ property: 'id', primary: true }])
  })
})

describe('reading a flattened manifest again', () => {
  it('changes nothing', () => {
    const once = parsed()
    expect(AppManifestSchema.parse(once)).toEqual(once)
  })
})

describe('an invalid superclass', () => {
  const book = (superclass: string): Record<string, unknown> => ({
    name: 'Book',
    plural: 'Books',
    description: 'A book',
    inherits: inherits(superclass, 'item'),
    properties: {},
  })

  it('rejects a superclass the manifest does not declare, naming the resource and value', () => {
    expect(issues(catalog({ Item: item(), Book: book('Items') }))).toEqual([
      {
        path: ['resources', 'Book', 'inherits', 'resource'],
        message:
          'resources.Book.inherits.resource: "Items" is not a resource the manifest declares; name the key of the resource the dictionary says this class inherits from.',
      },
    ])
  })

  it('rejects a resource that inherits itself', () => {
    expect(issues(catalog({ Item: item(), Book: book('Book') }))).toEqual([
      {
        path: ['resources', 'Book', 'inherits', 'resource'],
        message:
          'resources.Book.inherits: the superclasses form a cycle, Book → Book; a class cannot inherit from itself.',
      },
    ])
  })

  it('rejects a cycle of two once, starting at the first resource of the cycle', () => {
    const magazine = { ...book('Book'), name: 'Magazine', plural: 'Magazines' }
    expect(issues(catalog({ Item: item(), Book: book('Magazine'), Magazine: magazine }))).toEqual([
      {
        path: ['resources', 'Book', 'inherits', 'resource'],
        message:
          'resources.Book.inherits: the superclasses form a cycle, Book → Magazine → Book; a class cannot inherit from itself.',
      },
    ])
  })

  it('rejects a cycle of three, and a resource leading into it is not reported again', () => {
    const named = (name: string, superclass: string): Record<string, unknown> => ({
      ...book(superclass),
      name,
      plural: `${name}s`,
    })
    const manifest = catalog({
      Item: item(),
      Tract: named('Tract', 'Novel'),
      Book: named('Book', 'Novel'),
      Novel: named('Novel', 'Magazine'),
      Magazine: named('Magazine', 'Book'),
    })
    expect(issues(manifest)).toEqual([
      {
        path: ['resources', 'Book', 'inherits', 'resource'],
        message:
          'resources.Book.inherits: the superclasses form a cycle, Book → Novel → Magazine → Book; a class cannot inherit from itself.',
      },
    ])
  })

  it('rejects a superclass recorded without its dictionary evidence', () => {
    const manifest = catalog({
      Item: item(),
      Book: { ...book('Item'), inherits: { resource: 'Item' } },
    })
    expect(issues(manifest).map(({ path }) => path)).toEqual([
      ['resources', 'Book', 'inherits', 'evidence'],
    ])
  })

  it('rejects an inherited primary identifier marked unsupported by the subclass', () => {
    const manifest = catalog({
      Item: item(),
      Book: {
        ...book('Item'),
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The id of the item',
            unsupported: LEGACY_UNSUPPORTED,
          },
        },
      },
    })
    expect(issues(manifest)).toEqual([
      {
        path: ['resources', 'Book', 'properties', 'id', 'unsupported'],
        message:
          'The primary identifier "id" cannot be marked unsupported: choose a different identifier.',
      },
    ])
  })
})

describe('loading a manifest file that records a superclass', () => {
  it('flattens it, as every other read of the manifest does', () => {
    const yaml = `
version: '1.0'
app:
  name: Catalog
  bundleId: com.example.catalog
resources:
  Item:
    name: Item
    plural: Items
    description: An item
    properties:
      id:
        access: r
        type: string
        description: The id of the item
    identifiers:
      - property: id
        primary: true
  Book:
    name: Book
    plural: Books
    description: A book
    inherits:
      resource: Item
      evidence:
        source: dictionary
        bundleId: com.example.catalog
        appVersion: '2.0'
        osVersion: '27.2'
        term: item
hierarchy:
  children: {}
`
    const book = resourceOf(parseManifestYaml(yaml), 'Book')
    expect(Object.keys(book.properties)).toEqual(['id'])
    expect(book.identifiers).toEqual([{ property: 'id', primary: true }])
  })
})

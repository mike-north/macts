/**
 * Tests for superclass inheritance in a manifest: a resource whose dictionary
 * class inherits another records `inherits: { resource, evidence }`, and the
 * manifest is read flattened.
 *
 * Expected values are written by hand from the rule in
 * `phases/13-sdk-value-and-execution-contracts.md` (D10, "Superclasses"):
 *
 * - a resource gains each ancestor property it does not declare, nearest
 *   ancestor first, whole: its code, native spelling, `unsupported` marker
 *   and every claim, whatever the evidence (probe, curated or dictionary
 *   nullability, resettability), as the ancestor's evidence;
 * - a claims-only overlay (`inheritedClaims`) replaces each inherited claim
 *   it states and leaves the declaration the ancestor's; a marker it states
 *   also drops the inherited claims and native spelling. An overlay is only
 *   for a property the resource inherits and does not declare;
 * - a property the resource declares replaces the inherited one whole;
 * - the resource gains the nearest ancestor's identifiers when it declares
 *   none, with their targeting and uniqueness claims;
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

/** The identifiers of the Catalog item class, with its uniqueness claim. */
const ITEM_IDENTIFIERS = [
  {
    property: 'id',
    primary: true,
    unique: true,
    evidence: { unique: { source: 'curated', note: '40 items read, ids distinct.' } },
  },
] as const

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
    identifiers: ITEM_IDENTIFIERS.map((identifier) => ({ ...identifier })),
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
  return catalog(catalogResources())
}

/** The resources of the stand-in Catalog, in manifest order. */
function catalogResources(): Record<string, unknown> {
  return {
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
  }
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

  it("inherits every claim made about the superclass's property, as its evidence", () => {
    const book = resourceOf(parsed(), 'Book')
    // A book is an item, so what a probe observed of items holds for it.
    expect(book.properties['size']).toEqual({
      access: 'r',
      type: 'integer',
      description: 'The size of the item',
      code: 'ptsz',
      optional: false,
      nullable: false,
      evidence: { nullable: PROBE_NON_NULL },
    })
    // So does a curated claim.
    expect(book.properties['note']).toEqual({
      access: 'rw',
      type: 'string',
      description: 'A note about the item',
      code: 'note',
      optional: false,
      resettable: true,
      evidence: {
        resettable: { source: 'curated', note: 'Setting it to missing value clears it.' },
      },
    })
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

  it("inherits the superclass's identifiers when it declares none, with their claims", () => {
    expect(resourceOf(parsed(), 'Book').identifiers).toEqual(ITEM_IDENTIFIERS)
  })

  it("inherits an identifier's targeting", () => {
    const base = item()
    const manifest = AppManifestSchema.parse(
      catalog({
        Item: {
          ...base,
          identifiers: [
            { property: 'id', primary: true, targeting: 'byProperty', runtimeProperty: 'name' },
          ],
        },
        Book: {
          name: 'Book',
          plural: 'Books',
          description: 'A book',
          inherits: inherits('Item', 'item'),
          properties: {},
        },
      })
    )
    expect(resourceOf(manifest, 'Book').identifiers).toEqual([
      { property: 'id', primary: true, targeting: 'byProperty', runtimeProperty: 'name' },
    ])
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
    expect(resourceOf(parsed(), 'Novel').identifiers).toEqual(ITEM_IDENTIFIERS)
  })

  // Regression: a superclass declared after a subclass was flattened first,
  // for the subclass, and moved ahead of it in the read manifest, reordering
  // every generated surface.
  it("keeps the manifest's resource order when a subclass is declared before its superclass", () => {
    const { Item, ...rest } = catalogResources()
    const manifest = AppManifestSchema.parse(catalog({ ...rest, Item }))
    expect(Object.keys(manifest.resources)).toEqual([
      'Book',
      'Novel',
      'Magazine',
      'Pamphlet',
      'Item',
    ])
  })
})

describe('a claims-only overlay', () => {
  const PROBE_NULLABLE = { ...PROBE_NON_NULL, nullCount: 4 } as const

  /** A Catalog whose Book states `claims` about the properties it inherits. */
  const withOverlay = (claims: Record<string, unknown>): Record<string, unknown> => {
    const manifest = catalogManifest()
    const resources = manifest['resources'] as Record<string, Record<string, unknown>>
    resources['Book'] = { ...resources['Book'], inheritedClaims: claims }
    return manifest
  }

  it("replaces the inherited claim with the resource's own, keeping the declaration", () => {
    const manifest = AppManifestSchema.parse(
      withOverlay({ size: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } })
    )
    expect(resourceOf(manifest, 'Book').properties['size']).toEqual({
      access: 'r',
      type: 'integer',
      description: 'The size of the item',
      code: 'ptsz',
      optional: false,
      nullable: true,
      evidence: { nullable: PROBE_NULLABLE },
    })
    // The superclass keeps its claim, and a subclass of Book inherits Book's.
    expect(resourceOf(manifest, 'Item').properties['size']?.nullable).toBe(false)
    expect(resourceOf(manifest, 'Novel').properties['size']?.nullable).toBe(true)
  })

  it('replaces only the claims it states', () => {
    const manifest = AppManifestSchema.parse(
      withOverlay({
        note: {
          nullable: true,
          evidence: { nullable: { source: 'curated', note: 'Often empty.' } },
        },
      })
    )
    expect(resourceOf(manifest, 'Book').properties['note']).toMatchObject({
      nullable: true,
      resettable: true,
      evidence: {
        nullable: { source: 'curated', note: 'Often empty.' },
        resettable: { source: 'curated', note: 'Setting it to missing value clears it.' },
      },
    })
  })

  it('marks an inherited property unsupported, dropping its claims and native spelling', () => {
    const marker = { ...LEGACY_UNSUPPORTED, reason: 'Books have no URL; every read fails.' }
    const manifest = AppManifestSchema.parse(
      withOverlay({ uRL: { unsupported: marker }, size: { unsupported: marker } })
    )
    expect(resourceOf(manifest, 'Book').properties['uRL']).toEqual({
      access: 'r',
      type: 'string',
      description: 'The URL of the item',
      code: 'url ',
      optional: false,
      unsupported: marker,
    })
    expect(resourceOf(manifest, 'Book').properties['size']).toEqual({
      access: 'r',
      type: 'integer',
      description: 'The size of the item',
      code: 'ptsz',
      optional: false,
      unsupported: marker,
    })
  })

  it('is merged when read, so the read manifest records none and reads back the same', () => {
    const once = AppManifestSchema.parse(
      withOverlay({ size: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } })
    )
    expect(resourceOf(once, 'Book').inheritedClaims).toBeUndefined()
    expect(AppManifestSchema.parse(once)).toEqual(once)
  })

  it('rejects an overlay for a property the resource declares itself', () => {
    expect(
      issues(withOverlay({ name: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } }))
    ).toEqual([
      {
        path: ['resources', 'Book', 'inheritedClaims', 'name'],
        message:
          'resources.Book.inheritedClaims.name: "Book" declares "name" itself, so the claim belongs on that declaration.',
      },
    ])
  })

  it('rejects an overlay for a property no superclass declares', () => {
    expect(
      issues(withOverlay({ pages: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } }))
    ).toEqual([
      {
        path: ['resources', 'Book', 'inheritedClaims', 'pages'],
        message:
          'resources.Book.inheritedClaims.pages: no superclass of "Book" declares "pages", so there is no inherited property to make the claim about.',
      },
    ])
  })

  it('rejects an overlay on a resource that records no superclass', () => {
    const manifest = catalog({
      Item: {
        ...item(),
        inheritedClaims: { size: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } },
      },
    })
    expect(issues(manifest).map(({ path }) => path)).toEqual([
      ['resources', 'Item', 'inheritedClaims', 'size'],
    ])
  })

  it('rejects an overlay that states no claim, or a claim without its evidence', () => {
    expect(issues(withOverlay({ size: {} })).map(({ path }) => path)).toEqual([
      ['resources', 'Book', 'inheritedClaims', 'size'],
    ])
    expect(issues(withOverlay({ size: { nullable: true } })).map(({ path }) => path)).toEqual([
      ['resources', 'Book', 'inheritedClaims', 'size', 'evidence', 'nullable'],
    ])
  })

  it("holds an overlay's claim to the inherited declaration's rules", () => {
    // The inherited shelfMark is marked unsupported, so it takes no nullability claim.
    expect(
      issues(withOverlay({ shelfMark: { nullable: true, evidence: { nullable: PROBE_NULLABLE } } }))
    ).toEqual([
      {
        path: ['resources', 'Book', 'properties', 'shelfMark', 'unsupported'],
        message:
          'An unsupported property cannot carry a nullable or resettable claim: every surface leaves it out.',
      },
    ])
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

describe("a resource's own rules, applied to what it inherits", () => {
  /** Dictionary evidence that the app has no class `term`. */
  const noClass = (term: string) => ({
    evidence: { ...DICTIONARY, term, finding: 'no-class' },
  })

  // Regression: an unsupported superclass's property typed by another
  // unsupported resource reached a usable subclass unchecked, and the contract
  // declared it as `unknown`.
  it('rejects an inherited property whose type names an unsupported resource', () => {
    const manifest = catalog({
      Item: {
        name: 'Item',
        plural: 'Items',
        description: 'An item',
        unsupported: noClass('item'),
        properties: {
          ghost: { access: 'r', type: { resource: 'Gone' }, description: 'A gone thing' },
        },
      },
      Gone: {
        name: 'Gone',
        plural: 'Gones',
        description: 'A thing the app does not have',
        unsupported: noClass('gone'),
        properties: {},
      },
      Book: {
        name: 'Book',
        plural: 'Books',
        description: 'A book',
        inherits: inherits('Item', 'item'),
        properties: {},
      },
    })
    expect(issues(manifest)).toEqual([
      {
        path: ['resources', 'Book', 'properties', 'ghost', 'type'],
        message:
          'resources.Book.properties.ghost: its type names the resource "Gone", which is marked unsupported, so no generated surface declares it; change the type, or mark the property unsupported too.',
      },
    ])
  })

  it('reports such a property once, on the resource that declares it', () => {
    const manifest = catalog({
      Item: {
        name: 'Item',
        plural: 'Items',
        description: 'An item',
        properties: {
          ghost: { access: 'r', type: { resource: 'Gone' }, description: 'A gone thing' },
        },
      },
      Gone: {
        name: 'Gone',
        plural: 'Gones',
        description: 'A thing the app does not have',
        unsupported: noClass('gone'),
        properties: {},
      },
      Book: {
        name: 'Book',
        plural: 'Books',
        description: 'A book',
        inherits: inherits('Item', 'item'),
        properties: {},
      },
    })
    expect(issues(manifest).map(({ path }) => path)).toEqual([
      ['resources', 'Item', 'properties', 'ghost', 'type'],
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

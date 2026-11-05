/**
 * The "Shelf" fixture: a small hand-written manifest with one output reference
 * position of each kind the output rule judges (phases/13 D7, #219).
 *
 * Resources, and whether a reference to each one read from the app can be
 * used:
 *
 * - `Book` has a `get` that records no parent: usable.
 * - `Chapter` has a `get` that records its book as parent: parent-scoped, so
 *   usable only at a field of a book's own record, which a native read hands
 *   over as its container ({@link shelfManifestWithContainedFields}).
 * - `Author` has a `list` but no `get`: not usable, alone or in an array.
 * - `Series` is identified by its `name`, with no `unique` claim, and has a
 *   top-level `get`: name-keyed, so not usable at outputs.
 * - `Genre` declares `id` but is matched on `name` (`byProperty`), claimed
 *   not unique, like Calendar's calendars: name-keyed too.
 * - `Library` holds the record fields under test.
 *
 * `Library`'s fields:
 *
 * - `favoriteBook` (Book): kept.
 * - `currentChapter` (Chapter, writable): left out of output, parent-scoped;
 *   still in the create and update inputs, since an input only needs `get`.
 * - `topAuthor` (Author): left out, no get.
 * - `authors` (array of Author): left out, no get.
 * - `series` (Series): left out, not unique.
 * - `genre` (Genre): left out, not unique.
 * - `retiredSeries` (Series, marked unsupported): on no surface, so not left
 *   out by the rule and not warned about.
 *
 * Commands with results: `featuredAuthor` returns an Author (result left
 * out, no get), `featuredSeries` returns a Series (result left out, not
 * unique), `featuredBook` returns a Book (kept). `shelve` takes a Chapter and
 * a Series as inputs, which are generated.
 */

import { parseManifestYaml } from '../loader.js'
import type { AppManifest } from '../schemas/index.js'

/** YAML tag: identity pass-through for editor support. */
const yaml = String.raw

/** The Shelf manifest, as YAML. */
export const SHELF_MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.shelf
  name: Shelf
  tccEntitlements: []
resources:
  Book:
    name: Book
    plural: Books
    description: A book
    properties:
      id:
        access: r
        type: string
        description: The book's identifier
      title:
        access: r
        type: string
        description: The book's title
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Chapter:
    name: Chapter
    plural: Chapters
    description: A chapter of a book
    properties:
      id:
        access: r
        type: string
        description: The chapter's identifier
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Author:
    name: Author
    plural: Authors
    description: An author
    properties:
      id:
        access: r
        type: string
        description: The author's identifier
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Series:
    name: Series
    plural: SeriesList
    description: A series of books
    properties:
      name:
        access: r
        type: string
        description: The series' name
    identifiers:
      - property: name
        primary: true
        targeting: byProperty
  Genre:
    name: Genre
    plural: Genres
    description: A genre
    properties:
      id:
        access: r
        type: string
        description: The genre's identifier
      name:
        access: r
        type: string
        description: The genre's name
    identifiers:
      - property: id
        primary: true
        targeting: byProperty
        runtimeProperty: name
        unique: false
        evidence:
          unique:
            source: curated
            note: Genre names are chosen freely, so two genres can share one.
  Library:
    name: Library
    plural: Libraries
    description: A library
    properties:
      id:
        access: r
        type: string
        description: The library's identifier
      favoriteBook:
        access: r
        type: { resource: Book }
        description: The library's favorite book
      currentChapter:
        access: rw
        type: { resource: Chapter }
        description: The chapter being read
        optional: true
      topAuthor:
        access: r
        type: { resource: Author }
        description: The most read author
      authors:
        access: r
        type: { array: { resource: Author } }
        description: Every author in the library
      series:
        access: r
        type: { resource: Series }
        description: The series on display
      genre:
        access: r
        type: { resource: Genre }
        description: The library's main genre
      retiredSeries:
        access: r
        type: { resource: Series }
        description: A series no longer on display
        unsupported:
          reason: Every read fails.
          evidence:
            source: probe
            observedAt: '2026-11-01T12:00:00.000Z'
            bundleId: com.example.shelf
            appVersion: '1.0'
            osVersion: '27.2'
            sampleSize: 3
            failedReads: 3
            errorNumbers: [-1728]
    identifiers:
      - property: id
        primary: true
        targeting: byId
enums: {}
hierarchy:
  children:
    libraries:
      resource: Library
      access: rw
      description: Libraries
commands:
  getBook:
    name: get
    description: Get a book
    scope: resource
    resourceType: Book
    parameters:
      - name: id
        type: string
        description: The book to read
  listBooks:
    name: list
    description: List books
    scope: resource
    resourceType: Book
  getChapter:
    name: get
    description: Get a chapter of a book
    scope: resource
    resourceType: Chapter
    parent:
      resource: Book
      parameter: bookId
    parameters:
      - name: bookId
        type: string
        description: The book holding the chapter
      - name: id
        type: string
        description: The chapter to read
  listAuthors:
    name: list
    description: List authors
    scope: resource
    resourceType: Author
  getGenre:
    name: get
    description: Get a genre
    scope: resource
    resourceType: Genre
    parameters:
      - name: id
        type: string
        description: The genre to read
  getSeries:
    name: get
    description: Get a series
    scope: resource
    resourceType: Series
    parameters:
      - name: name
        type: string
        description: The series to read
  listLibraries:
    name: list
    description: List libraries
    scope: resource
    resourceType: Library
  getLibrary:
    name: get
    description: Get a library
    scope: resource
    resourceType: Library
    parameters:
      - name: id
        type: string
        description: The library to read
  createLibrary:
    name: create
    description: Create a library
    scope: resource
    resourceType: Library
  updateLibrary:
    name: update
    description: Update a library
    scope: resource
    resourceType: Library
    parameters:
      - name: id
        type: string
        description: The library to update
  shelve:
    name: shelve
    description: Shelve a chapter in a series
    scope: application
    parameters:
      - name: chapter
        type: { resource: Chapter }
        description: The chapter to shelve
      - name: series
        type: { resource: Series }
        description: The series to shelve it in
  featuredAuthor:
    name: featuredAuthor
    description: The featured author
    scope: application
    returns: Author
  featuredSeries:
    name: featuredSeries
    description: The featured series
    scope: application
    returns: Series
  featuredBook:
    name: featuredBook
    description: The featured book
    scope: application
    returns: Book
`

/** The validated Shelf manifest. */
export function shelfManifest(): AppManifest {
  return parseManifestYaml(SHELF_MANIFEST_YAML)
}

/**
 * The Shelf manifest with the series' name claimed unique, with evidence, so a
 * reference to a series pins one object: `Library.series` and the
 * `featuredSeries` result are declared.
 */
export function shelfManifestWithUniqueSeries(): AppManifest {
  return claimSeriesNamesUnique(shelfManifest())
}

/** Claims a Shelf manifest's series names unique, with evidence, in place. */
function claimSeriesNamesUnique(manifest: AppManifest): AppManifest {
  const identifier = manifest.resources['Series']?.identifiers?.[0]
  if (identifier === undefined) throw new Error('the Shelf fixture has no Series identifier')
  identifier.unique = true
  identifier.evidence = {
    unique: { source: 'curated', note: 'Shelf refuses a second series with a taken name.' },
  }
  return manifest
}

/** Resources {@link shelfManifestWithContainedFields} adds, as YAML. */
const CONTAINED_RESOURCES_YAML = yaml`
  Paragraph:
    name: Paragraph
    plural: Paragraphs
    description: A paragraph of a chapter
    properties:
      id:
        access: r
        type: string
        description: The paragraph's identifier
    identifiers:
      - property: id
        primary: true
        targeting: byId
  Volume:
    name: Volume
    plural: Volumes
    description: A volume of a series
    properties:
      id:
        access: r
        type: string
        description: The volume's identifier
    identifiers:
      - property: id
        primary: true
        targeting: byId
`

/** Commands {@link shelfManifestWithContainedFields} adds, as YAML. */
const CONTAINED_COMMANDS_YAML = yaml`
  getParagraph:
    name: get
    description: Get a paragraph of a chapter
    scope: resource
    resourceType: Paragraph
    parent:
      resource: Chapter
      parameter: chapterId
    parameters:
      - name: chapterId
        type: string
        description: The chapter holding the paragraph
      - name: id
        type: string
        description: The paragraph to read
  getVolume:
    name: get
    description: Get a volume of a series
    scope: resource
    resourceType: Volume
    parent:
      resource: Series
      parameter: seriesName
    parameters:
      - name: seriesName
        type: string
        description: The series holding the volume
      - name: id
        type: string
        description: The volume to read
  featuredChapter:
    name: featuredChapter
    description: The featured chapter
    scope: application
    returns: Chapter
`

/** A record field of a Shelf resource, as YAML under its `properties`. */
function fieldYaml(name: string, target: string, description: string): string {
  return yaml`
      ${name}:
        access: r
        type: { resource: ${target} }
        description: ${description}`
}

/**
 * `text` with `addition` inserted after `anchor`, which must occur exactly
 * once in it.
 */
function insertAfter(text: string, anchor: string, addition: string): string {
  const at = text.indexOf(anchor)
  if (at < 0 || text.includes(anchor, at + 1)) {
    throw new Error(`the Shelf fixture does not hold ${JSON.stringify(anchor)} exactly once`)
  }
  return text.slice(0, at + anchor.length) + addition + text.slice(at + anchor.length)
}

/**
 * The Shelf manifest with a field of each kind the positional rule judges for
 * a target whose `get` records a parent (phases/13 D7, container scoping).
 * The container a reference carries is the record the field is read through,
 * so such a field is kept only on a record of the target's parent, and only
 * when that parent is a valid container: top-level, with an identifier, and
 * not identified by a name it does not claim unique.
 *
 * - `Book.bookmark` (Chapter, got within its Book): read through a Book, a
 *   top-level resource with an id. Kept.
 * - `Library.currentChapter` (Chapter): read through a Library, not the
 *   chapter's Book. Left out, parent-scoped.
 * - `Chapter.firstParagraph` (Paragraph, got within its Chapter): read
 *   through a Chapter, whose own `get` records a parent, a nested chain. Left
 *   out, parent-scoped.
 * - `Series.latestVolume` (Volume, got within its Series): read through a
 *   Series, which is name-keyed. Left out, parent-scoped, unless the series'
 *   name is claimed unique (`uniqueSeries`).
 * - The `featuredChapter` result (Chapter) has no record it is read through.
 *   Left out, parent-scoped.
 *
 * @param options - `uniqueSeries` claims series names unique, with evidence.
 */
export function shelfManifestWithContainedFields(
  options: { readonly uniqueSeries?: boolean } = {}
): AppManifest {
  let text = insertAfter(SHELF_MANIFEST_YAML, '\nresources:', CONTAINED_RESOURCES_YAML.trimEnd())
  text = insertAfter(
    text,
    "description: The book's title",
    fieldYaml('bookmark', 'Chapter', 'The chapter the reader stopped at')
  )
  text = insertAfter(
    text,
    "description: The chapter's identifier",
    fieldYaml('firstParagraph', 'Paragraph', "The chapter's first paragraph")
  )
  text = insertAfter(
    text,
    "description: The series' name",
    fieldYaml('latestVolume', 'Volume', "The series' latest volume")
  )
  const manifest = parseManifestYaml(text.trimEnd() + CONTAINED_COMMANDS_YAML)
  return options.uniqueSeries === true ? claimSeriesNamesUnique(manifest) : manifest
}

/**
 * The Shelf manifest with the book's identifier removed, so a book can still
 * be got but has no identity form: `Library.favoriteBook` and the
 * `featuredBook` result are left out of output (`no-identifier`).
 *
 * `getChapter` is removed too. It finds a chapter within its book, and a book
 * with no identifier can be no chapter's container, so generation would fail
 * on it (phases/13 D7, parent-scoped targets). Without it, the variant tests
 * the missing identifier alone.
 */
export function shelfManifestWithoutBookIdentifier(): AppManifest {
  const manifest = shelfManifest()
  const book = manifest.resources['Book']
  if (book === undefined) throw new Error('the Shelf fixture has no Book')
  delete book.identifiers
  delete manifest.commands['getChapter']
  return manifest
}

/**
 * The Shelf manifest with a hierarchy that holds books, and their chapters,
 * only within a library, and series only within a library, while `getBook`
 * and `getSeries` still record no parent. A book or a series is then found
 * only within a container its `get` does not name, so `Library.favoriteBook`,
 * `Library.series` and the `featuredBook` and `featuredSeries` results are
 * left out of output (`unrecorded-parent`). `getChapter` records its book, so
 * a chapter is still `parent-scoped`.
 */
export function shelfManifestWithBooksInLibraries(): AppManifest {
  const manifest = shelfManifest()
  const libraries = manifest.hierarchy.children['libraries']
  if (libraries === undefined) throw new Error('the Shelf fixture has no libraries')
  libraries.children = {
    books: {
      resource: 'Book',
      access: 'r',
      description: 'Books in the library',
      children: {
        chapters: { resource: 'Chapter', access: 'r', description: 'Chapters of the book' },
      },
    },
    series: { resource: 'Series', access: 'r', description: 'Series in the library' },
  }
  return manifest
}

/**
 * {@link shelfManifestWithBooksInLibraries}, with books also held by the
 * application, as Reminders holds reminders both in a list and at the
 * application. A book can then be found without its library, so
 * `Library.favoriteBook` and the `featuredBook` result are kept.
 */
export function shelfManifestWithBooksAlsoAtTheApplication(): AppManifest {
  const manifest = shelfManifestWithBooksInLibraries()
  manifest.hierarchy.children['books'] = {
    resource: 'Book',
    access: 'r',
    description: 'Every book',
  }
  return manifest
}

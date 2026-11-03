/**
 * The "Shelf" fixture: a small hand-written manifest with one output reference
 * position of each kind the output rule judges (phases/13 D7, #219).
 *
 * Resources, and whether a reference to each one read from the app can be
 * used:
 *
 * - `Book` has a `get` that records no parent: usable.
 * - `Chapter` has a `get` that records its book as parent: parent-scoped, so
 *   not usable at outputs (native reads emit no container).
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
  const manifest = shelfManifest()
  const identifier = manifest.resources['Series']?.identifiers?.[0]
  if (identifier === undefined) throw new Error('the Shelf fixture has no Series identifier')
  identifier.unique = true
  identifier.evidence = {
    unique: { source: 'curated', note: 'Shelf refuses a second series with a taken name.' },
  }
  return manifest
}

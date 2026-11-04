/**
 * Tests for the interim rule that generated surfaces do not declare an output
 * position holding a reference macts cannot yet resolve, over the Shelf
 * fixture (see `shelfManifest` for its cases). Each such position is a
 * coverage gap (#219), left out until macts provides the missing piece.
 *
 * Every expected value is written by hand from the fixture and the rule
 * (phases/13 D7, "Resolvable targets", "Container scoping", "Name-keyed
 * resources"): a record field or a command result holding a reference to a
 * resource with no `get`, or whose `get` records a parent, is left out of the
 * contract, the HTTP client, the CLI and the native reads, with a generation
 * warning citing #219; so is one holding a reference to a resource identified
 * by a name its primary identifier does not claim unique, while the same
 * resource with a `unique: true` claim is declared; so is one holding a
 * reference to a resource the hierarchy holds only within another resource,
 * when that resource's `get` names no container;
 * input positions follow their own rule and are still generated.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see https://github.com/mike-north/macts/issues/219
 */

import { describe, expect, it } from 'vitest'
import { buildNativeBody } from '../jxa/native-scripts.js'
import {
  shelfManifest,
  shelfManifestWithBooksAlsoAtTheApplication,
  shelfManifestWithBooksInLibraries,
  shelfManifestWithoutBookIdentifier,
  shelfManifestWithUniqueSeries,
} from '../manifest/test-support/shelf-output-references.js'
import { generateCliPlugin } from './cli/index.js'
import { CONTRACT_MODULE_PATH, generateContract } from './contract/index.js'
import { generateHttpClientSdk } from './sdk/http-client.js'

/** The text of one generated file. */
function fileOf(files: readonly { path: string; content: string }[], path: string): string {
  const found = files.find((file) => file.path === path)
  if (found === undefined) throw new Error(`no generated ${path}`)
  return found.content
}

/** The first declaration in `text` that `pattern` matches. */
function declaration(text: string, pattern: RegExp): string {
  const found = pattern.exec(text)?.[0]
  if (found === undefined) throw new Error(`no declaration matching ${String(pattern)}`)
  return found
}

/** The fields left out of every output, at least one per reason. */
const OMITTED_FIELDS = ['currentChapter', 'topAuthor', 'authors', 'series', 'genre'] as const

/** The warning for a Library field left out because its target is not unique. */
function notUniqueWarning(field: string, target: string): string {
  return `shelf: resources.Library.properties.${field}: the Library field "${field}" is left out of output for now: it holds a reference to "${target}", which macts identifies by its name, and macts has no evidence yet that the name identifies one "${target}" (#219).`
}

describe('the generated contract', () => {
  const generated = generateContract(shelfManifest())
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('generates without errors, since leaving a position out is not a failure', () => {
    expect(generated.errors).toEqual([])
  })

  it('declares only the resolvable fields in the record type and its value type', () => {
    const record = declaration(text, /export interface Library \{[\s\S]*?\n\}/)
    expect(record).toContain(
      "  readonly favoriteBook: ObjectReferenceVariant<Book, string, 'Book'> | null"
    )
    for (const field of [...OMITTED_FIELDS, 'retiredSeries']) {
      expect(record).not.toContain(field)
    }
    const value = declaration(
      text,
      /const libraryRecordType: ValueType<Library> = t\.record\(\{[\s\S]*?\n\}/
    )
    expect(value).toContain('  favoriteBook: t.nullable(')
    for (const field of OMITTED_FIELDS) expect(value).not.toContain(field)
  })

  it('keeps an omitted writable field in the create and update inputs', () => {
    // An input only needs the target's get, which a chapter has.
    expect(declaration(text, /export interface LibraryCreateInput \{[\s\S]*?\n\}/)).toContain(
      "  currentChapter?: ObjectReferenceData<string, 'Chapter'>"
    )
    expect(declaration(text, /export interface LibraryUpdateInput \{[\s\S]*?\n\}/)).toContain(
      "  currentChapter?: ObjectReferenceData<string, 'Chapter'>"
    )
  })

  it('still generates input positions to parent-scoped and name-keyed resources', () => {
    expect(text).toContain(
      "  shelve(chapter: ObjectReferenceData<string, 'Chapter'>, series: ObjectReferenceData<string, 'Series'>, options?: CallOptions): Promise<void>"
    )
  })

  it('declares no result for a command whose result macts cannot yet resolve', () => {
    const author = declaration(text, / {2}id: 'shelf\.app\.featuredAuthor',[\s\S]*?\n\}/)
    expect(author).toContain('  output: t.none(),')
    const series = declaration(text, / {2}id: 'shelf\.app\.featuredSeries',[\s\S]*?\n\}/)
    expect(series).toContain('  output: t.none(),')
    const book = declaration(text, / {2}id: 'shelf\.app\.featuredBook',[\s\S]*?\n\}/)
    expect(book).toContain("t.reference<Book, string, 'Book'>")
  })

  it('warns once per left-out position, naming the app, resource, field, target and reason', () => {
    expect(
      generated.diagnostics
        .filter(({ kind }) => kind === 'omitted-output')
        .map(({ message }) => message)
    ).toEqual([
      'shelf: resources.Library.properties.currentChapter: the Library field "currentChapter" is left out of output for now: it holds a reference to "Chapter", which the app finds only within its container, and this field is not read through a valid container for "Chapter" (#219, #242).',
      'shelf: resources.Library.properties.topAuthor: the Library field "topAuthor" is left out of output for now: it holds a reference to "Author", and macts has no get for "Author" yet (#219).',
      'shelf: resources.Library.properties.authors: the Library field "authors" is left out of output for now: it holds a reference to "Author", and macts has no get for "Author" yet (#219).',
      // A name-keyed identifier with no unique claim.
      notUniqueWarning('series', 'Series'),
      // Matched on its name, and claimed not unique, like Calendar's calendars.
      notUniqueWarning('genre', 'Genre'),
      'shelf: commands.featuredAuthor.returns: the result of "featuredAuthor" is left out of output for now: it holds a reference to "Author", and macts has no get for "Author" yet (#219).',
      'shelf: commands.featuredSeries.returns: the result of "featuredSeries" is left out of output for now: it holds a reference to "Series", which macts identifies by its name, and macts has no evidence yet that the name identifies one "Series" (#219).',
    ])
    // The unsupported `retiredSeries` is on no surface, so it is not reported.
  })
})

describe('a name-keyed resource whose name is claimed unique', () => {
  const generated = generateContract(shelfManifestWithUniqueSeries())
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('declares the field and the result that reference it', () => {
    expect(generated.errors).toEqual([])
    expect(declaration(text, /export interface Library \{[\s\S]*?\n\}/)).toContain(
      "  readonly series: ObjectReferenceVariant<Series, string, 'Series'> | null"
    )
    expect(declaration(text, / {2}id: 'shelf\.app\.featuredSeries',[\s\S]*?\n\}/)).toContain(
      "t.reference<Series, string, 'Series'>"
    )
  })

  it('no longer warns about it, and still leaves the other positions out', () => {
    const omitted = generated.diagnostics
      .filter(({ kind }) => kind === 'omitted-output')
      .map(({ message }) => message)
    expect(omitted.some((message) => message.includes('"Series"'))).toBe(false)
    expect(omitted).toContain(notUniqueWarning('genre', 'Genre'))
    expect(omitted).toHaveLength(5)
  })
})

describe('a resource with a get but no identifier', () => {
  // A book can still be got, but without an identifier it has no identity
  // form, and native reads emit only identity references, so a reference to
  // one read from the app could not be expressed (phases/13 D7).
  const generated = generateContract(shelfManifestWithoutBookIdentifier())
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('leaves out the field and the result that reference it, without failing', () => {
    expect(generated.errors).toEqual([])
    expect(declaration(text, /export interface Library \{[\s\S]*?\n\}/)).not.toContain(
      'favoriteBook'
    )
    expect(declaration(text, / {2}id: 'shelf\.app\.featuredBook',[\s\S]*?\n\}/)).toContain(
      '  output: t.none(),'
    )
  })

  it('warns about each, with the no-identifier reason', () => {
    const book = generated.diagnostics.filter(
      (diagnostic) => diagnostic.kind === 'omitted-output' && diagnostic.target === 'Book'
    )
    expect(book).toEqual([
      {
        kind: 'omitted-output',
        app: 'shelf',
        position: 'resources.Library.properties.favoriteBook',
        target: 'Book',
        reason: 'no-identifier',
        message:
          'shelf: resources.Library.properties.favoriteBook: the Library field "favoriteBook" is left out of output for now: it holds a reference to "Book", and macts has no identifier for "Book" yet (#219).',
      },
      {
        kind: 'omitted-output',
        app: 'shelf',
        position: 'commands.featuredBook.returns',
        target: 'Book',
        reason: 'no-identifier',
        message:
          'shelf: commands.featuredBook.returns: the result of "featuredBook" is left out of output for now: it holds a reference to "Book", and macts has no identifier for "Book" yet (#219).',
      },
    ])
  })
})

describe('a resource held only within a container its get does not name', () => {
  // Books are held only within a library, and getBook records no parent, so
  // a book reference read from the app could not be resolved.
  const generated = generateContract(shelfManifestWithBooksInLibraries())
  const text = fileOf(generated.files, CONTRACT_MODULE_PATH)

  it('leaves out the field and the result that reference it, without failing', () => {
    expect(generated.errors).toEqual([])
    expect(declaration(text, /export interface Library \{[\s\S]*?\n\}/)).not.toContain(
      'favoriteBook'
    )
    expect(declaration(text, / {2}id: 'shelf\.app\.featuredBook',[\s\S]*?\n\}/)).toContain(
      '  output: t.none(),'
    )
  })

  it('warns about each, with the unrecorded-parent reason', () => {
    const book = generated.diagnostics.filter(
      (diagnostic) => diagnostic.kind === 'omitted-output' && diagnostic.target === 'Book'
    )
    expect(book).toEqual([
      {
        kind: 'omitted-output',
        app: 'shelf',
        position: 'resources.Library.properties.favoriteBook',
        target: 'Book',
        reason: 'unrecorded-parent',
        message:
          'shelf: resources.Library.properties.favoriteBook: the Library field "favoriteBook" is left out of output for now: it holds a reference to "Book", which the app holds only within a container, and macts\'s get for "Book" does not name that container yet (#219).',
      },
      {
        kind: 'omitted-output',
        app: 'shelf',
        position: 'commands.featuredBook.returns',
        target: 'Book',
        reason: 'unrecorded-parent',
        message:
          'shelf: commands.featuredBook.returns: the result of "featuredBook" is left out of output for now: it holds a reference to "Book", which the app holds only within a container, and macts\'s get for "Book" does not name that container yet (#219).',
      },
    ])
  })

  it('keeps both, and warns about neither, when the application holds books too', () => {
    const also = generateContract(shelfManifestWithBooksAlsoAtTheApplication())
    expect(
      declaration(
        fileOf(also.files, CONTRACT_MODULE_PATH),
        /export interface Library \{[\s\S]*?\n\}/
      )
    ).toContain("  readonly favoriteBook: ObjectReferenceVariant<Book, string, 'Book'> | null")
    expect(
      also.diagnostics.filter(
        (diagnostic) => diagnostic.kind === 'omitted-output' && diagnostic.target === 'Book'
      )
    ).toEqual([])
  })
})

describe('the generated HTTP client', () => {
  const sdk = generateHttpClientSdk(shelfManifest(), {
    packageName: '@macts/shelf',
  })
  const types = fileOf(sdk.files, 'src/types.ts')

  it('declares only the resolvable fields in the read type and its schema', () => {
    const read = declaration(types, /export interface Library \{[\s\S]*?\n\}/)
    expect(read).toContain('  favoriteBook: Book;')
    const schema = declaration(types, /export const LibrarySchema = z\.object\(\{[\s\S]*?\n\}\);/)
    expect(schema).toContain('  favoriteBook:')
    for (const field of OMITTED_FIELDS) {
      expect(read).not.toContain(field)
      expect(schema).not.toContain(field)
    }
  })

  it('keeps an omitted writable field in the create input', () => {
    expect(declaration(types, /export interface LibraryCreateInput \{[\s\S]*?\n\}/)).toContain(
      '  currentChapter?: Chapter;'
    )
  })
})

describe('the generated CLI', () => {
  const plugin = generateCliPlugin(shelfManifest(), {
    packageName: '@macts/shelf-cli',
    sdkPackageName: '@macts/shelf',
  })

  it.each(['src/commands/libraries/list.ts', 'src/commands/libraries/get.ts'])(
    'prints only the resolvable fields in %s',
    (path) => {
      const command = fileOf(plugin.files, path)
      expect(command).toContain('favoriteBook: item.favoriteBook,')
      for (const field of OMITTED_FIELDS) expect(command).not.toContain(`item.${field}`)
    }
  )
})

describe('the native reads', () => {
  const manifest = shelfManifest()

  it.each(['getLibrary', 'listLibraries', 'createLibrary', 'updateLibrary'])(
    '%s reads no field the record leaves out',
    (command) => {
      const body = buildNativeBody(manifest, { command, resource: 'Library' })
      expect(body).toContain('favoriteBook')
      for (const field of OMITTED_FIELDS) expect(body).not.toContain(field)
    }
  )
})

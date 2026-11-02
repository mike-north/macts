/**
 * Tests for a command's recorded parent (`command.parent`): the resource whose
 * items hold the command's target, and the command's own required parameter
 * that carries the parent's identifier.
 *
 * Expected outcomes are derived by hand from the rule in
 * `phases/13-sdk-value-and-execution-contracts.md` (D10, command parents): the
 * parent resource is declared by the manifest and, for a usable command, not
 * marked unsupported; the parameter is one of the command's declared required
 * parameters. Each rejection names the command, the field and the value. The
 * fixture's Shelf holds Books; Crate is marked unsupported in the marked
 * variant only.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md
 * @see https://github.com/mike-north/macts/issues/165
 */

import { describe, expect, it } from 'vitest'
import { AppManifestSchema } from './app.js'
import { CommandSchema } from './command.js'

/** The Library app's dictionary, which declares no crate class. */
const CRATE_MARK = {
  evidence: {
    source: 'dictionary',
    bundleId: 'com.example.library',
    appVersion: '1.0',
    osVersion: '27.2',
    term: 'crate',
    finding: 'no-class',
  },
} as const

const LIVE_MARK = {
  evidence: {
    source: 'live',
    observedAt: '2026-11-01T16:34:20.000Z',
    bundleId: 'com.example.library',
    appVersion: '1.0',
    osVersion: '27.2',
    expression: 'the books collection of a crate',
    errorNumber: -1728,
  },
} as const

const parameter = (name: string, required = true): Record<string, unknown> => ({
  name,
  type: 'string',
  description: name,
  required,
})

/** A resource command listing books, with `fields` merged in. */
const listBooks = (fields: Record<string, unknown>): Record<string, unknown> => ({
  name: 'list',
  description: 'List books',
  scope: 'resource',
  resourceType: 'Book',
  parameters: [parameter('shelfId')],
  ...fields,
})

/** A Library manifest with Shelf, Book and Crate, Crate marked when `marked`. */
function library(commands: Record<string, unknown>, marked = false): unknown {
  const resource = (
    name: string,
    extra: Record<string, unknown> = {}
  ): Record<string, unknown> => ({
    name,
    plural: `${name}s`,
    description: `A ${name.toLowerCase()}`,
    properties: { name: { access: 'r', type: 'string', description: 'The name' } },
    ...extra,
  })
  return {
    version: '1.0',
    app: { name: 'Library', bundleId: 'com.example.library' },
    resources: {
      Shelf: resource('Shelf'),
      Book: resource('Book'),
      Crate: resource('Crate', marked ? { unsupported: CRATE_MARK } : {}),
    },
    hierarchy: {
      children: {
        shelves: {
          resource: 'Shelf',
          access: 'r',
          children: { books: { resource: 'Book', access: 'r' } },
        },
      },
    },
    commands,
  }
}

/** Each issue a failed parse reports, as its path and message. */
function issues(input: unknown): { path: PropertyKey[]; message: string }[] {
  const result = AppManifestSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
}

describe('a command parent', () => {
  it('is optional, and absent when not recorded', () => {
    const parsed = CommandSchema.parse(listBooks({}))
    expect(parsed.parent).toBeUndefined()
  })

  it('accepts a declared resource and a declared required parameter', () => {
    const parent = { resource: 'Shelf', parameter: 'shelfId' }
    const result = AppManifestSchema.safeParse(library({ listBooks: listBooks({ parent }) }))
    expect(result.success).toBe(true)
    expect(result.data?.commands['listBooks']?.parent).toEqual(parent)
  })

  it('accepts a parent parameter declared after the item identifier', () => {
    const getBook = listBooks({
      name: 'get',
      parameters: [parameter('id'), parameter('shelfId')],
      parent: { resource: 'Shelf', parameter: 'shelfId' },
    })
    expect(issues(library({ getBook }))).toEqual([])
  })

  it('rejects unknown fields, so a misspelled key is not silently dropped', () => {
    const parent = { resource: 'Shelf', parameter: 'shelfId', collection: 'shelves' }
    expect(CommandSchema.safeParse(listBooks({ parent })).success).toBe(false)
  })

  it('rejects a missing or empty field', () => {
    expect(CommandSchema.safeParse(listBooks({ parent: { resource: 'Shelf' } })).success).toBe(
      false
    )
    expect(
      CommandSchema.safeParse(listBooks({ parent: { resource: '', parameter: 'shelfId' } })).success
    ).toBe(false)
  })

  it('rejects a resource the manifest does not declare, naming the command, field and value', () => {
    const parent = { resource: 'Bookcase', parameter: 'shelfId' }
    expect(issues(library({ listBooks: listBooks({ parent }) }))).toEqual([
      {
        path: ['commands', 'listBooks', 'parent', 'resource'],
        message: expect.stringMatching(
          /^commands\.listBooks\.parent\.resource: "Bookcase" is not a resource the manifest declares/
        ) as unknown as string,
      },
    ])
  })

  it('rejects a resource matched only by name or plural, since it must be a resource key', () => {
    // `Shelfs` is the plural of the Shelf resource, not a key of `resources`.
    const parent = { resource: 'Shelfs', parameter: 'shelfId' }
    expect(issues(library({ listBooks: listBooks({ parent }) })).map((i) => i.path)).toEqual([
      ['commands', 'listBooks', 'parent', 'resource'],
    ])
  })

  it('rejects a resource marked unsupported on a usable command', () => {
    const parent = { resource: 'Crate', parameter: 'shelfId' }
    const input = library({ listBooks: listBooks({ parent }) }, true)
    expect(issues(input)).toEqual([
      {
        path: ['commands', 'listBooks', 'parent', 'resource'],
        message: expect.stringMatching(
          /^commands\.listBooks\.parent\.resource: "Crate" is marked unsupported.*mark the command unsupported too/
        ) as unknown as string,
      },
    ])
    // The same parent is valid while Crate is usable.
    expect(issues(library({ listBooks: listBooks({ parent }) }))).toEqual([])
  })

  it('accepts a resource marked unsupported on a command marked unsupported too', () => {
    const parent = { resource: 'Crate', parameter: 'shelfId' }
    const input = library({ listBooks: listBooks({ parent, unsupported: LIVE_MARK }) }, true)
    expect(issues(input)).toEqual([])
  })

  it('rejects a parameter the command does not declare, naming the command, field and value', () => {
    const parent = { resource: 'Shelf', parameter: 'shelfName' }
    expect(issues(library({ listBooks: listBooks({ parent }) }))).toEqual([
      {
        path: ['commands', 'listBooks', 'parent', 'parameter'],
        message: expect.stringMatching(
          /^commands\.listBooks\.parent\.parameter: "shelfName" is not a parameter the command declares/
        ) as unknown as string,
      },
    ])
  })

  it('rejects an optional parameter, since a body cannot address a parent without it', () => {
    const parent = { resource: 'Shelf', parameter: 'shelfId' }
    const command = listBooks({ parameters: [parameter('shelfId', false)], parent })
    expect(issues(library({ listBooks: command }))).toEqual([
      {
        path: ['commands', 'listBooks', 'parent', 'parameter'],
        message: expect.stringMatching(
          /^commands\.listBooks\.parent\.parameter: "shelfId" is an optional parameter of the command/
        ) as unknown as string,
      },
    ])
  })

  it('reports an undeclared resource and an undeclared parameter together', () => {
    const parent = { resource: 'Bookcase', parameter: 'caseId' }
    expect(issues(library({ listBooks: listBooks({ parent }) })).map((i) => i.path)).toEqual([
      ['commands', 'listBooks', 'parent', 'resource'],
      ['commands', 'listBooks', 'parent', 'parameter'],
    ])
  })
})

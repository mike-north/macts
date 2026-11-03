/**
 * Tests for the output reference judgment, over the Shelf fixture (see
 * `shelfManifest` for its cases). Expected values are written by hand from
 * phases/13 D7: an output reference is usable only through its target's
 * `get`, only when the target has a primary identifier, only when that `get`
 * records no parent, and only when the target is not identified by a name its
 * identifier does not claim unique.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see https://github.com/mike-north/macts/issues/219
 */

import { describe, expect, it } from 'vitest'
import {
  isNameKeyed,
  omittedOutput,
  omittedOutputPositions,
  omittedOutputProperties,
  omittedOutputReason,
  omittedOutputResult,
  outputProperties,
} from './output-references.js'
import type { AppManifest } from './schemas/index.js'
import {
  shelfManifest,
  shelfManifestWithoutBookIdentifier,
  shelfManifestWithUniqueSeries,
} from './test-support/shelf-output-references.js'
import type { ValueShape } from './value-shapes.js'

const manifest = shelfManifest()

/** A resource of the fixture, by key. */
function resource(key: string): NonNullable<AppManifest['resources'][string]> {
  const found = manifest.resources[key]
  if (found === undefined) throw new Error(`the fixture has no resource ${key}`)
  return found
}

/** A command of the fixture, by key. */
function command(key: string): NonNullable<AppManifest['commands'][string]> {
  const found = manifest.commands[key]
  if (found === undefined) throw new Error(`the fixture has no command ${key}`)
  return found
}

const reference = (resourceKey: string): ValueShape => ({ kind: 'reference', resourceKey })

describe('omittedOutputReason', () => {
  it('accepts a resource whose get records no parent', () => {
    expect(omittedOutputReason(manifest, 'Book')).toBeUndefined()
  })

  it('rejects a resource whose get records a parent', () => {
    expect(omittedOutputReason(manifest, 'Chapter')).toBe('parent-scoped')
  })

  it('rejects a resource with a list but no get', () => {
    expect(omittedOutputReason(manifest, 'Author')).toBe('no-get')
  })

  it('rejects a key the manifest does not declare', () => {
    expect(omittedOutputReason(manifest, 'Shelf')).toBe('no-get')
  })

  it('rejects a resource identified by a name that is not claimed unique', () => {
    expect(omittedOutputReason(manifest, 'Series')).toBe('not-unique')
    expect(omittedOutputReason(manifest, 'Genre')).toBe('not-unique')
  })

  it('rejects a resource with a get but no primary identifier', () => {
    expect(omittedOutputReason(shelfManifestWithoutBookIdentifier(), 'Book')).toBe('no-identifier')
  })

  it('accepts a name claimed unique, with evidence', () => {
    expect(omittedOutputReason(shelfManifestWithUniqueSeries(), 'Series')).toBeUndefined()
  })
})

describe('omittedOutput', () => {
  it('finds an unusable reference bare, in an array, in a nullable, and nested', () => {
    const author = { target: 'Author', reason: 'no-get' }
    expect(omittedOutput(manifest, reference('Author'))).toEqual(author)
    expect(omittedOutput(manifest, { kind: 'array', item: reference('Author') })).toEqual(author)
    expect(omittedOutput(manifest, { kind: 'nullable', inner: reference('Author') })).toEqual(
      author
    )
    expect(
      omittedOutput(manifest, {
        kind: 'nullable',
        inner: { kind: 'array', item: reference('Chapter') },
      })
    ).toEqual({ target: 'Chapter', reason: 'parent-scoped' })
  })

  it('finds nothing in a usable reference or a value with no reference', () => {
    expect(omittedOutput(manifest, { kind: 'nullable', inner: reference('Book') })).toBeUndefined()
    expect(omittedOutput(manifest, { kind: 'array', item: { kind: 'string' } })).toBeUndefined()
  })
})

describe('isNameKeyed', () => {
  it('holds for a declared name identifier with no unique claim', () => {
    expect(isNameKeyed(manifest, 'Series')).toBe(true)
  })

  it('holds for a resource matched on its name and claimed not unique', () => {
    expect(isNameKeyed(manifest, 'Genre')).toBe(true)
  })

  it('does not hold for a name claimed unique', () => {
    expect(isNameKeyed(shelfManifestWithUniqueSeries(), 'Series')).toBe(false)
  })

  it('does not hold for an identifier that is not a name, or for no identifier', () => {
    expect(isNameKeyed(manifest, 'Book')).toBe(false)
    expect(isNameKeyed(manifest, 'Shelf')).toBe(false)
  })
})

describe('omittedOutputProperties and outputProperties', () => {
  it('leave out exactly the unusable fields, and keep the rest in declaration order', () => {
    expect([...omittedOutputProperties(manifest, resource('Library'))]).toEqual([
      ['currentChapter', { target: 'Chapter', reason: 'parent-scoped' }],
      ['topAuthor', { target: 'Author', reason: 'no-get' }],
      ['authors', { target: 'Author', reason: 'no-get' }],
      ['series', { target: 'Series', reason: 'not-unique' }],
      ['genre', { target: 'Genre', reason: 'not-unique' }],
    ])
    // `retiredSeries` is marked unsupported, so it is on no surface at all.
    expect(outputProperties(manifest, resource('Library')).map(([name]) => name)).toEqual([
      'id',
      'favoriteBook',
    ])
  })

  it('keep a reference to a name claimed unique', () => {
    const unique = shelfManifestWithUniqueSeries()
    const library = unique.resources['Library']
    if (library === undefined) throw new Error('the fixture has no Library')
    expect(outputProperties(unique, library).map(([name]) => name)).toEqual([
      'id',
      'favoriteBook',
      'series',
    ])
  })

  it('leave out nothing of a resource with no reference fields', () => {
    expect(omittedOutputProperties(manifest, resource('Book')).size).toBe(0)
    expect(outputProperties(manifest, resource('Book')).map(([name]) => name)).toEqual([
      'id',
      'title',
    ])
  })
})

describe('omittedOutputResult', () => {
  it('leaves out an unusable result and keeps a usable or absent one', () => {
    expect(omittedOutputResult(manifest, command('featuredAuthor'))).toEqual({
      target: 'Author',
      reason: 'no-get',
    })
    expect(omittedOutputResult(manifest, command('featuredSeries'))).toEqual({
      target: 'Series',
      reason: 'not-unique',
    })
    expect(omittedOutputResult(manifest, command('featuredBook'))).toBeUndefined()
    expect(omittedOutputResult(manifest, command('shelve'))).toBeUndefined()
  })
})

describe('omittedOutputPositions', () => {
  it('lists every left-out record field, then every left-out result', () => {
    const field = (property: string, target: string, reason: string) => ({
      position: `resources.Library.properties.${property}`,
      resource: 'Library',
      property,
      target,
      reason,
    })
    expect(omittedOutputPositions(manifest)).toEqual([
      field('currentChapter', 'Chapter', 'parent-scoped'),
      field('topAuthor', 'Author', 'no-get'),
      field('authors', 'Author', 'no-get'),
      field('series', 'Series', 'not-unique'),
      field('genre', 'Genre', 'not-unique'),
      {
        position: 'commands.featuredAuthor.returns',
        command: 'featuredAuthor',
        target: 'Author',
        reason: 'no-get',
      },
      {
        position: 'commands.featuredSeries.returns',
        command: 'featuredSeries',
        target: 'Series',
        reason: 'not-unique',
      },
    ])
  })
})

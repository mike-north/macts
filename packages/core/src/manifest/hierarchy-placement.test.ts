/**
 * Tests for reading containment from the manifest hierarchy. Expected sets
 * are written by hand from the Shelf fixture's hierarchies: the base fixture
 * places only libraries, at the application; the variant holds books (with
 * their chapters) and series only within a library.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D10)
 */

import { describe, expect, it } from 'vitest'
import { nestedOnlyResources } from './hierarchy-placement.js'
import {
  shelfManifest,
  shelfManifestWithBooksAlsoAtTheApplication,
  shelfManifestWithBooksInLibraries,
} from './test-support/shelf-output-references.js'

describe('nestedOnlyResources', () => {
  it('lists the resources held only within another resource', () => {
    expect([...nestedOnlyResources(shelfManifestWithBooksInLibraries())].sort()).toEqual([
      'Book',
      'Chapter',
      'Series',
    ])
  })

  it('leaves out a resource the application holds too, and resources placed nowhere', () => {
    expect([...nestedOnlyResources(shelfManifestWithBooksAlsoAtTheApplication())].sort()).toEqual([
      'Chapter',
      'Series',
    ])
    expect([...nestedOnlyResources(shelfManifest())]).toEqual([])
  })

  it('computes the set once per manifest, and separately for another manifest', () => {
    const nested = shelfManifestWithBooksInLibraries()
    const first = nestedOnlyResources(nested)
    expect(nestedOnlyResources(nested)).toBe(first)
    const other = shelfManifestWithBooksAlsoAtTheApplication()
    const otherResult = nestedOnlyResources(other)
    expect(otherResult).not.toBe(first)
    expect(otherResult.has('Book')).toBe(false)
    expect(first.has('Book')).toBe(true)
  })
})

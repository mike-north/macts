/**
 * Tests for deterministic capability search ranking.
 *
 * Expected scores and orderings are derived by hand from the weight table
 * documented in `search.ts`, NOT from program output.
 */

import { describe, expect, it } from 'vitest'
import { buildCapabilityRegistry } from './registry.js'
import { searchCapabilities, scoreCapability, tokenizeIntent, SEARCH_WEIGHTS } from './search.js'
import { notebookManifest } from './test-fixtures.js'

const registry = buildCapabilityRegistry([notebookManifest()])

describe('tokenizeIntent', () => {
  it('lowercases, splits on separators, and drops short tokens', () => {
    expect(tokenizeIntent('Create a Note')).toEqual(['create', 'note'])
    expect(tokenizeIntent('list-events')).toEqual(['list', 'events'])
  })

  it('splits camelCase boundaries', () => {
    expect(tokenizeIntent('createNote')).toEqual(['create', 'note'])
  })

  it('returns no tokens for empty / punctuation-only input', () => {
    expect(tokenizeIntent('')).toEqual([])
    expect(tokenizeIntent('   ... ')).toEqual([])
  })
})

describe('scoreCapability', () => {
  const create = registry.get('notebook.notes.create')
  if (!create) throw new Error('fixture missing notebook.notes.create')

  it('adds operationExact + resourceExact for an intent hitting both', () => {
    // "create" === operation (10), "notes" === resource (8) → 18.
    // App keyword "notebook" is absent from the intent, so no app bonus.
    expect(scoreCapability(create, ['create', 'notes'])).toBe(
      SEARCH_WEIGHTS.operationExact + SEARCH_WEIGHTS.resourceExact
    )
  })

  it('credits a keyword prefix match when there is no exact keyword hit', () => {
    // "crea" is not an exact keyword, but prefixes "create" → keywordPrefix (2).
    expect(scoreCapability(create, ['crea'])).toBe(SEARCH_WEIGHTS.keywordPrefix)
  })

  it('scores zero when nothing matches', () => {
    expect(scoreCapability(create, ['xyzzy'])).toBe(0)
  })
})

describe('searchCapabilities', () => {
  it('ranks the exact operation+resource match first', () => {
    const results = searchCapabilities(registry, 'create a note')
    // "create note": create.notes scores operation(10)+resource? "note" !== "notes"
    // but "note" prefixes "notes" keyword and is a keyword of create → highest.
    expect(results[0]?.capability.name).toBe('notebook.notes.create')
  })

  it('orders results by descending score', () => {
    const results = searchCapabilities(registry, 'create a note')
    const scores = results.map((r) => r.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('ranks the delete capability top for a delete intent', () => {
    const results = searchCapabilities(registry, 'delete note')
    expect(results[0]?.capability.name).toBe('notebook.notes.delete')
  })

  it('ranks the share (send) capability top for a share intent', () => {
    const results = searchCapabilities(registry, 'share note')
    expect(results[0]?.capability.name).toBe('notebook.notes.share')
  })

  it('respects the result limit', () => {
    const results = searchCapabilities(registry, 'note', { limit: 2 })
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('breaks score ties deterministically by capability name', () => {
    // Intent "note" matches the "note" description keyword (keywordExact = 4) on
    // create, delete, and share equally, so those three tie and must order
    // name-ascending: create < delete < share.
    const results = searchCapabilities(registry, 'note')
    const topScore = results[0]?.score
    const tied = results.filter((r) => r.score === topScore).map((r) => r.capability.name)
    expect(tied).toEqual(['notebook.notes.create', 'notebook.notes.delete', 'notebook.notes.share'])
  })

  // Negative: empty / no-match search returns an empty array (drives the
  // CLI/MCP "generate a new capability" next-move guidance).
  it('returns an empty array for an empty intent', () => {
    expect(searchCapabilities(registry, '')).toEqual([])
    expect(searchCapabilities(registry, '   ')).toEqual([])
  })

  it('returns an empty array when no capability matches', () => {
    expect(searchCapabilities(registry, 'frobnicate quux')).toEqual([])
  })

  it('accepts a bare capability array as well as a registry', () => {
    const results = searchCapabilities(registry.capabilities, 'delete note')
    expect(results[0]?.capability.name).toBe('notebook.notes.delete')
  })
})

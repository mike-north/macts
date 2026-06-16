/**
 * Tests for deterministic capability search ranking.
 *
 * Expected scores and orderings are derived by hand from the weight table
 * documented in `search.ts`, NOT from program output.
 *
 * @see packages/core/src/capabilities/search.ts (SEARCH_WEIGHTS table)
 */

import { describe, expect, it } from 'vitest'
import { buildCapabilityRegistry } from './registry.js'
import {
  searchCapabilities,
  searchCapabilitiesHasAnyMatch,
  scoreCapability,
  tokenizeIntent,
  SEARCH_WEIGHTS,
} from './search.js'
import type { GovernanceFilter } from './governance.js'
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

  // -----------------------------------------------------------------------
  // Governance filter (options.filter): govern BEFORE slicing to limit
  // -----------------------------------------------------------------------
  //
  // For intent "note", all 6 fixture capabilities match (hand-derived from
  // SEARCH_WEIGHTS and the manifest keywords):
  //
  //   "note" exact keyword match (keywordExact = 4):
  //     notebook.notes.create  (write)
  //     notebook.notes.delete  (delete)
  //     notebook.notes.share   (send)
  //
  //   "note" prefix-matches "notebook" keyword (keywordPrefix = 2):
  //     notebook.app.doScript  (execute)   — "notebook".startsWith("note")
  //     notebook.app.quit      (system-change)
  //
  //   "note" prefix-matches "notes" keyword (keywordPrefix = 2):
  //     notebook.notes.list    (read)      — "notes".startsWith("note")
  //
  // Tie-breaking at score 2 by name ascending:
  //   notebook.app.doScript < notebook.app.quit < notebook.notes.list
  //
  // Full rank order for "note":
  //   1. notebook.notes.create  (4)
  //   2. notebook.notes.delete  (4)
  //   3. notebook.notes.share   (4)
  //   4. notebook.app.doScript  (2)
  //   5. notebook.app.quit      (2)
  //   6. notebook.notes.list    (2)

  it('applies the governance filter before slicing, backfilling denied top results', () => {
    // Deny "write" → notebook.notes.create (rank 1, score 4) is excluded.
    // With limit=3: governance iterates the full 6-entry ranked list,
    // skips create, and collects the next 3 allowed entries:
    //   delete (rank 2, score 4), share (rank 3, score 4), doScript (rank 4, score 2)
    const denyWrite: GovernanceFilter = {
      evaluate: (c) => (c.risk === 'write' ? { disposition: 'deny' } : { disposition: 'allow' }),
    }
    const results = searchCapabilities(registry, 'note', { limit: 3, filter: denyWrite })
    // Only allowed capabilities are returned (no 'write' risk in results).
    expect(results.map((r) => r.capability.name)).toEqual([
      'notebook.notes.delete', // rank 2, score 4
      'notebook.notes.share', // rank 3, score 4
      'notebook.app.doScript', // rank 4, score 2 — backfilled
    ])
    expect(results.every((r) => r.capability.risk !== 'write')).toBe(true)
  })

  it('returns all allowed capabilities up to limit when filter passes all', () => {
    const allowAll: GovernanceFilter = { evaluate: () => ({ disposition: 'allow' }) }
    const results = searchCapabilities(registry, 'note', { limit: 3, filter: allowAll })
    expect(results).toHaveLength(3)
    expect(results.map((r) => r.capability.name)).toEqual([
      'notebook.notes.create',
      'notebook.notes.delete',
      'notebook.notes.share',
    ])
  })

  it('returns an empty array when the filter denies all matching capabilities', () => {
    const denyAll: GovernanceFilter = { evaluate: () => ({ disposition: 'deny' }) }
    const results = searchCapabilities(registry, 'note', { filter: denyAll })
    expect(results).toEqual([])
  })

  it('without a filter option, slices the full sorted list (pre-fix path unchanged)', () => {
    // Baseline: no filter → default behaviour, top 3 by rank including any risk.
    const results = searchCapabilities(registry, 'note', { limit: 3 })
    expect(results.map((r) => r.capability.name)).toEqual([
      'notebook.notes.create',
      'notebook.notes.delete',
      'notebook.notes.share',
    ])
  })
})

describe('searchCapabilitiesHasAnyMatch', () => {
  it('returns true when at least one capability matches the intent', () => {
    expect(searchCapabilitiesHasAnyMatch(registry, 'create note')).toBe(true)
  })

  it('returns false when no capability matches the intent', () => {
    expect(searchCapabilitiesHasAnyMatch(registry, 'frobnicate quux')).toBe(false)
  })

  it('returns false for an empty intent', () => {
    expect(searchCapabilitiesHasAnyMatch(registry, '')).toBe(false)
    expect(searchCapabilitiesHasAnyMatch(registry, '  ')).toBe(false)
  })

  it('accepts a bare capability array as well as a registry', () => {
    expect(searchCapabilitiesHasAnyMatch(registry.capabilities, 'delete note')).toBe(true)
    expect(searchCapabilitiesHasAnyMatch(registry.capabilities, 'frobnicate')).toBe(false)
  })
})

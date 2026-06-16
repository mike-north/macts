/**
 * Tests for the shared discovery decision logic (limit validation,
 * governance-aware search/inspect outcomes).
 *
 * Expected outcomes are derived by hand from the contract documented in
 * `discovery.ts`, not from program output.
 *
 * @see packages/core/src/capabilities/discovery.ts
 * @see packages/core/src/capabilities/search.ts (ranking weights)
 */

import { describe, expect, it } from 'vitest'
import {
  resolveDiscoveryLimit,
  summarizeDiscoverySearch,
  inspectCapability,
  governedDiscoverySearch,
} from './discovery.js'
import { buildCapabilityRegistry } from './registry.js'
import { parseManifestYaml } from '../manifest/loader.js'
import { notebookManifest } from './test-fixtures.js'
import type { GovernanceFilter } from './governance.js'
import type { CapabilitySearchResult } from './search.js'
import type { Capability } from './types.js'

const yaml = String.raw

const MANIFEST_YAML = yaml`
version: '1.0'
app:
  bundleId: com.example.notebook
  name: Notebook
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    identifiers:
      - property: id
        primary: true
    properties:
      id:
        access: r
        type: string
        description: Note id
      title:
        access: rw
        type: string
        description: Title
hierarchy:
  children:
    notes:
      resource: Note
      access: rw
      description: Notes
commands:
  listNotes:
    name: list
    description: List all notes
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:list
  deleteNote:
    name: delete
    description: Delete a note
    scope: resource
    resourceType: Note
    parameters: []
    permission: notebook:notes:delete
`

const registry = buildCapabilityRegistry([parseManifestYaml(MANIFEST_YAML)])

/** Look up a capability by name, failing the test if it is missing. */
function cap(name: string): Capability {
  const found = registry.get(name)
  if (!found) {
    throw new Error(`fixture capability not found: ${name}`)
  }
  return found
}

/** Wrap capabilities as ranked results (score is irrelevant to these tests). */
function ranked(...names: string[]): CapabilitySearchResult[] {
  return names.map((name) => ({ capability: cap(name), score: 1 }))
}

/** Governance filter that denies a capability whose risk is in the given set. */
function denyRisks(...risks: string[]): GovernanceFilter {
  return {
    evaluate: (c) =>
      risks.includes(c.risk)
        ? { disposition: 'deny', reason: `risk ${c.risk} denied by policy` }
        : { disposition: 'allow' },
  }
}

describe('resolveDiscoveryLimit', () => {
  // Positive cases: valid positive integers (string or number) pass through.
  it('keeps a valid positive integer string', () => {
    expect(resolveDiscoveryLimit('5', 10)).toBe(5)
  })

  it('keeps a valid positive integer number', () => {
    expect(resolveDiscoveryLimit(3, 10)).toBe(3)
  })

  // Negative / invalid cases: each must fall back to the default rather than
  // letting NaN/0/negative reach `slice` and silently empty the results.
  it('falls back to the default for non-numeric input (--limit foo → NaN)', () => {
    expect(resolveDiscoveryLimit('foo', 10)).toBe(10)
  })

  it('falls back to the default for zero', () => {
    expect(resolveDiscoveryLimit('0', 10)).toBe(10)
    expect(resolveDiscoveryLimit(0, 10)).toBe(10)
  })

  it('falls back to the default for negative values', () => {
    expect(resolveDiscoveryLimit('-3', 10)).toBe(10)
    expect(resolveDiscoveryLimit(-3, 10)).toBe(10)
  })

  it('falls back to the default for fractional values', () => {
    expect(resolveDiscoveryLimit(2.5, 10)).toBe(10)
    // String '2.5': Number.parseInt would silently truncate to 2; we must reject it.
    expect(resolveDiscoveryLimit('2.5', 10)).toBe(10)
    // Scientific notation strings are also not plain integer strings.
    expect(resolveDiscoveryLimit('1e3', 10)).toBe(10)
  })

  it('falls back to the default for NaN / Infinity numbers', () => {
    expect(resolveDiscoveryLimit(Number.NaN, 10)).toBe(10)
    expect(resolveDiscoveryLimit(Number.POSITIVE_INFINITY, 10)).toBe(10)
  })

  it('falls back to the default for absent / wrong-typed input', () => {
    expect(resolveDiscoveryLimit(undefined, 10)).toBe(10)
    expect(resolveDiscoveryLimit(null, 10)).toBe(10)
    expect(resolveDiscoveryLimit({}, 10)).toBe(10)
  })
})

describe('summarizeDiscoverySearch', () => {
  it('returns kind=matches with surviving governed capabilities', () => {
    const outcome = summarizeDiscoverySearch(ranked('notebook.notes.list'))
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      expect(outcome.governed.map((g) => g.capability.name)).toEqual(['notebook.notes.list'])
    }
  })

  it('returns kind=no-match when nothing matched the intent', () => {
    const outcome = summarizeDiscoverySearch(ranked())
    expect(outcome.kind).toBe('no-match')
  })

  it('returns kind=governance-blocked when matches existed but all were denied', () => {
    // Both fixture capabilities match, but the policy denies every one of them.
    // This must be distinct from no-match so the surface does NOT suggest
    // generating a new capability.
    const outcome = summarizeDiscoverySearch(
      ranked('notebook.notes.list', 'notebook.notes.delete'),
      denyRisks('read', 'delete')
    )
    expect(outcome.kind).toBe('governance-blocked')
    if (outcome.kind === 'governance-blocked') {
      expect(outcome.deniedCount).toBe(2)
    }
  })

  it('returns kind=matches when only some results are denied', () => {
    const outcome = summarizeDiscoverySearch(
      ranked('notebook.notes.list', 'notebook.notes.delete'),
      denyRisks('delete')
    )
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      expect(outcome.governed.map((g) => g.capability.name)).toEqual(['notebook.notes.list'])
    }
  })
})

// ---------------------------------------------------------------------------
// governedDiscoverySearch — the governance-first entry point
// ---------------------------------------------------------------------------
//
// The Notebook fixture (notebookManifest) provides 6 capabilities with known
// risks. For intent "note", all 6 match (hand-derived from SEARCH_WEIGHTS):
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

const notebookRegistry = buildCapabilityRegistry([notebookManifest()])

/** Deny the given set of risk classes. */
function denyRisk(...risks: string[]): GovernanceFilter {
  return {
    evaluate: (c) =>
      risks.includes(c.risk)
        ? { disposition: 'deny', reason: `${c.risk} denied by test policy` }
        : { disposition: 'allow' },
  }
}

describe('governedDiscoverySearch', () => {
  it('returns kind=no-match when the intent has no matching capabilities', () => {
    const outcome = governedDiscoverySearch(notebookRegistry, 'frobnicate quux', 10)
    expect(outcome.kind).toBe('no-match')
  })

  it('returns kind=no-match for an empty / whitespace-only intent', () => {
    expect(governedDiscoverySearch(notebookRegistry, '', 10).kind).toBe('no-match')
    expect(governedDiscoverySearch(notebookRegistry, '   ', 10).kind).toBe('no-match')
  })

  it('returns kind=matches with all matching capabilities when none are denied (allow-all)', () => {
    // intent "note" matches all 6 fixture capabilities; limit=10 → all 6 returned.
    const outcome = governedDiscoverySearch(notebookRegistry, 'note', 10)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      // Full rank order: create(4), delete(4), share(4), doScript(2), quit(2), list(2).
      expect(outcome.governed.map((g) => g.capability.name)).toEqual([
        'notebook.notes.create',
        'notebook.notes.delete',
        'notebook.notes.share',
        'notebook.app.doScript',
        'notebook.app.quit',
        'notebook.notes.list',
      ])
    }
  })

  it('returns kind=governance-blocked when all matches are denied', () => {
    // Deny all 6 risk classes that the fixture capabilities carry.
    const outcome = governedDiscoverySearch(
      notebookRegistry,
      'note',
      10,
      denyRisk('write', 'delete', 'send', 'execute', 'system-change', 'read')
    )
    expect(outcome.kind).toBe('governance-blocked')
    if (outcome.kind === 'governance-blocked') {
      // All 6 matching capabilities were denied.
      expect(outcome.deniedCount).toBe(6)
    }
  })

  // -----------------------------------------------------------------------
  // Regression: partial-denial-under-limit (the core fix for issue #42)
  // -----------------------------------------------------------------------
  // Before the fix: governance was applied AFTER slicing to limit, so denied
  // capabilities in the top-N left gaps rather than being backfilled.
  //
  // Scenario: limit=3, deny "write" (only notebook.notes.create is write risk).
  //
  // Pre-fix (broken):
  //   slice first → [create, delete, share] → apply gov →
  //   [delete, share] — only 2 results, not 3
  //
  // Post-fix (correct):
  //   govern ALL 6 matches → [delete(4), share(4), doScript(2), quit(2), list(2)] →
  //   slice to 3 → [delete, share, doScript] — 3 results, backfilled

  it('regression #42: backfills denied top results from lower-ranked allowed matches', () => {
    // Deny "write" → notebook.notes.create (rank 1, score 4) is skipped.
    // Governance iterates all 6 matches and collects the first 3 allowed:
    //   notebook.notes.delete (rank 2, score 4)
    //   notebook.notes.share  (rank 3, score 4)
    //   notebook.app.doScript (rank 4, score 2) — backfilled
    const outcome = governedDiscoverySearch(notebookRegistry, 'note', 3, denyRisk('write'))
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      expect(outcome.governed.map((g) => g.capability.name)).toEqual([
        'notebook.notes.delete',
        'notebook.notes.share',
        'notebook.app.doScript', // backfilled — absent in the pre-fix code
      ])
      // All three governance decisions must be 'allow'.
      expect(outcome.governed.map((g) => g.decision.disposition)).toEqual([
        'allow',
        'allow',
        'allow',
      ])
    }
  })

  it('regression #42: returns all allowed when limit > count of allowed results', () => {
    // Deny "write" → 5 capabilities survive governance (all except create).
    // limit=100 → returns all 5, not fewer.
    const outcome = governedDiscoverySearch(notebookRegistry, 'note', 100, denyRisk('write'))
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      expect(outcome.governed).toHaveLength(5)
      expect(outcome.governed.map((g) => g.capability.name)).toEqual([
        'notebook.notes.delete',
        'notebook.notes.share',
        'notebook.app.doScript',
        'notebook.app.quit',
        'notebook.notes.list',
      ])
    }
  })

  it('preserves governance disposition (warn) for capabilities that are not denied', () => {
    const warnDeletes: GovernanceFilter = {
      evaluate: (c) =>
        c.risk === 'delete'
          ? { disposition: 'warn', reason: 'needs approval' }
          : { disposition: 'allow' },
    }
    const outcome = governedDiscoverySearch(notebookRegistry, 'note', 10, warnDeletes)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      const deleteResult = outcome.governed.find(
        (g) => g.capability.name === 'notebook.notes.delete'
      )
      expect(deleteResult?.decision.disposition).toBe('warn')
      expect(deleteResult?.decision.reason).toBe('needs approval')
    }
  })

  it('respects the limit after backfilling', () => {
    // Even with backfilling, must not exceed limit.
    const outcome = governedDiscoverySearch(notebookRegistry, 'note', 2, denyRisk('write'))
    expect(outcome.kind).toBe('matches')
    if (outcome.kind === 'matches') {
      expect(outcome.governed).toHaveLength(2)
      // delete and share are the two highest-scoring allowed results.
      expect(outcome.governed.map((g) => g.capability.name)).toEqual([
        'notebook.notes.delete',
        'notebook.notes.share',
      ])
    }
  })
})

describe('inspectCapability', () => {
  it('returns kind=found with the capability for an allowed name', () => {
    const outcome = inspectCapability(registry, 'notebook.notes.list')
    expect(outcome.kind).toBe('found')
    if (outcome.kind === 'found') {
      expect(outcome.capability.name).toBe('notebook.notes.list')
      expect(outcome.decision.disposition).toBe('allow')
    }
  })

  it('returns kind=not-found for an unknown name', () => {
    const outcome = inspectCapability(registry, 'notebook.notes.frobnicate')
    expect(outcome.kind).toBe('not-found')
  })

  it('returns kind=denied (withholding the descriptor) for a governance-denied name', () => {
    // Regression: inspect-by-name must respect the same `deny` that hides a
    // capability from search, rather than leaking the full descriptor.
    const outcome = inspectCapability(registry, 'notebook.notes.delete', denyRisks('delete'))
    expect(outcome.kind).toBe('denied')
    if (outcome.kind === 'denied') {
      expect(outcome.reason).toBe('risk delete denied by policy')
    }
  })

  it('returns kind=found for a name the policy only warns on (not denied)', () => {
    const warnDeletes: GovernanceFilter = {
      evaluate: (c) =>
        c.risk === 'delete'
          ? { disposition: 'warn', reason: 'needs approval' }
          : { disposition: 'allow' },
    }
    const outcome = inspectCapability(registry, 'notebook.notes.delete', warnDeletes)
    expect(outcome.kind).toBe('found')
    if (outcome.kind === 'found') {
      expect(outcome.decision.disposition).toBe('warn')
    }
  })
})

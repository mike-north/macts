/**
 * Tests for the shared discovery decision logic (limit validation,
 * governance-aware search/inspect outcomes).
 *
 * Expected outcomes are derived by hand from the contract documented in
 * `discovery.ts`, not from program output.
 */

import { describe, expect, it } from 'vitest'
import { resolveDiscoveryLimit, summarizeDiscoverySearch, inspectCapability } from './discovery.js'
import { buildCapabilityRegistry } from './registry.js'
import { parseManifestYaml } from '../manifest/loader.js'
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

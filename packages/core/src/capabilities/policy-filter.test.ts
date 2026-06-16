/**
 * Tests for the policy-backed governance filter.
 *
 * Verifies that {@link createPolicyGovernanceFilter} correctly translates a
 * parsed {@link GovernancePolicy} into {@link GovernanceDecision}s at
 * discovery time, covering:
 *
 *  - disposition mapping: allowed → allow, read-only/confirm-first → warn,
 *    forbidden → deny (AC: a forbidden capability is governance-blocked)
 *  - an allowed capability surfaces (AC: allowed one surfaces)
 *  - default disposition applied when no rule matches
 *  - operation-level overrides take precedence over app-level
 *  - reason propagated to the decision
 *  - end-to-end: governedDiscoverySearch backfills when forbidden caps are
 *    denied (AC: backfilling preserved)
 *
 * @see Issue #55 — filter discovery by the declared policy
 */

import { describe, it, expect } from 'vitest'
import { parsePolicy } from '../governance/policy.js'
import type { GovernancePolicy } from '../governance/policy.js'
import { createPolicyGovernanceFilter, PolicyGovernanceFilter } from './policy-filter.js'
import { governedDiscoverySearch } from './discovery.js'
import { buildCapabilityRegistry } from './registry.js'
import { notebookManifest } from './test-fixtures.js'
import type { Capability } from './types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a valid policy declaration; throws if it fails (test infrastructure). */
function parseValidPolicy(declaration: unknown): GovernancePolicy {
  const result = parsePolicy(declaration)
  if (!result.success) {
    throw new Error(`Policy parse failed: ${JSON.stringify(result.issues)}`)
  }
  return result.data
}

/** Minimal capability stub for unit-level filter tests. */
function makeCapability(app: string, resource: string, operation: string): Capability {
  return {
    name: `${app}.${resource}.${operation}`,
    app,
    appBundleId: `com.example.${app}`,
    resource,
    operation,
    description: `${operation} on ${resource}`,
    permission: `${app}:${resource}:${operation}`,
    risk: 'read',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: undefined,
    keywords: [app, resource, operation],
    cliSnippet: `macts ${app} ${resource} ${operation}`,
    mcpToolName: `macts__${app}__${resource}_${operation}`,
  }
}

// ---------------------------------------------------------------------------
// createPolicyGovernanceFilter — disposition mapping
// ---------------------------------------------------------------------------

describe('createPolicyGovernanceFilter — disposition mapping', () => {
  it('returns a PolicyGovernanceFilter', () => {
    const policy = parseValidPolicy({ version: '1', defaultDisposition: 'allowed', apps: [] })
    const filter = createPolicyGovernanceFilter(policy)
    expect(filter).toBeInstanceOf(PolicyGovernanceFilter)
  })

  it('maps "allowed" disposition to "allow"', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('notebook', 'notes', 'list')
    expect(filter.evaluate(cap).disposition).toBe('allow')
  })

  it('maps "read-only" disposition to "warn" (restricted — surface with flag)', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'read-only' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('notebook', 'notes', 'list')
    expect(filter.evaluate(cap).disposition).toBe('warn')
  })

  it('maps "confirm-first" disposition to "warn" (needs approval — surface with flag)', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'confirm-first' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('notebook', 'notes', 'create')
    expect(filter.evaluate(cap).disposition).toBe('warn')
  })

  it('maps "forbidden" disposition to "deny" — capability is governance-blocked', () => {
    // AC: a forbidden capability is governance-blocked (not silently missing)
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [{ app: 'notebook', disposition: 'forbidden', reason: 'notebook is restricted' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('notebook', 'notes', 'delete')
    const decision = filter.evaluate(cap)
    expect(decision.disposition).toBe('deny')
  })
})

// ---------------------------------------------------------------------------
// createPolicyGovernanceFilter — default disposition
// ---------------------------------------------------------------------------

describe('createPolicyGovernanceFilter — default disposition', () => {
  it('applies defaultDisposition "forbidden" when no rule matches (fail-closed)', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('unknown-app', 'things', 'list')
    expect(filter.evaluate(cap).disposition).toBe('deny')
  })

  it('applies defaultDisposition "allowed" when no rule matches', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const cap = makeCapability('any-app', 'things', 'list')
    expect(filter.evaluate(cap).disposition).toBe('allow')
  })

  it('applies defaultDisposition to an unmatched app even when other apps are listed', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'calendar', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    // 'reminders' has no rule — falls through to defaultDisposition.
    const cap = makeCapability('reminders', 'tasks', 'list')
    expect(filter.evaluate(cap).disposition).toBe('deny')
  })
})

// ---------------------------------------------------------------------------
// createPolicyGovernanceFilter — operation-level overrides
// ---------------------------------------------------------------------------

describe('createPolicyGovernanceFilter — operation-level overrides', () => {
  it('operation-level override wins over app-level disposition', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'notebook',
          disposition: 'allowed',
          operations: [
            { operation: 'delete', disposition: 'forbidden', reason: 'deletes require escalation' },
          ],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)

    // 'list' has no override — inherits app-level 'allowed'
    expect(filter.evaluate(makeCapability('notebook', 'notes', 'list')).disposition).toBe('allow')

    // 'delete' has an operation-level 'forbidden' override
    const deleteDecision = filter.evaluate(makeCapability('notebook', 'notes', 'delete'))
    expect(deleteDecision.disposition).toBe('deny')
    expect(deleteDecision.reason).toBe('deletes require escalation')
  })

  it('operation wildcard "*" applies to all operations in the matching app', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'notebook',
          disposition: 'forbidden',
          operations: [{ operation: '*', disposition: 'allowed' }],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    expect(filter.evaluate(makeCapability('notebook', 'notes', 'list')).disposition).toBe('allow')
    expect(filter.evaluate(makeCapability('notebook', 'notes', 'create')).disposition).toBe('allow')
    expect(filter.evaluate(makeCapability('notebook', 'notes', 'delete')).disposition).toBe('allow')
  })

  it('first matching operation rule wins (declaration order)', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'notebook',
          disposition: 'forbidden',
          operations: [
            { operation: 'create', disposition: 'allowed' },
            { operation: 'create', disposition: 'forbidden' }, // duplicate — should be ignored
          ],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    expect(filter.evaluate(makeCapability('notebook', 'notes', 'create')).disposition).toBe('allow')
  })
})

// ---------------------------------------------------------------------------
// createPolicyGovernanceFilter — reason propagation
// ---------------------------------------------------------------------------

describe('createPolicyGovernanceFilter — reason propagation', () => {
  it('propagates reason from an operation-level rule', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [
        {
          app: 'notebook',
          disposition: 'allowed',
          operations: [
            {
              operation: 'share',
              disposition: 'confirm-first',
              reason: 'sharing requires approval',
            },
          ],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const decision = filter.evaluate(makeCapability('notebook', 'notes', 'share'))
    expect(decision.disposition).toBe('warn')
    expect(decision.reason).toBe('sharing requires approval')
  })

  it('propagates reason from an app-level rule when no operation override', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'notebook',
          disposition: 'read-only',
          reason: 'notebook is read-only in this context',
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const decision = filter.evaluate(makeCapability('notebook', 'notes', 'list'))
    expect(decision.disposition).toBe('warn')
    expect(decision.reason).toBe('notebook is read-only in this context')
  })

  it('omits reason when neither app rule nor operation rule has one', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const decision = filter.evaluate(makeCapability('notebook', 'notes', 'list'))
    expect(decision.reason).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// createPolicyGovernanceFilter — app wildcard "*"
// ---------------------------------------------------------------------------

describe('createPolicyGovernanceFilter — app wildcard "*"', () => {
  it('a "*" app rule applies to any app', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: '*', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    expect(filter.evaluate(makeCapability('calendar', 'events', 'create')).disposition).toBe(
      'allow'
    )
    expect(filter.evaluate(makeCapability('reminders', 'tasks', 'list')).disposition).toBe('allow')
  })

  it('a concrete app rule takes precedence over a later wildcard rule (first-match-wins)', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [
        { app: 'calendar', disposition: 'forbidden' },
        { app: '*', disposition: 'allowed' }, // calendar should not reach this
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    // calendar is explicitly forbidden
    expect(filter.evaluate(makeCapability('calendar', 'events', 'create')).disposition).toBe('deny')
    // reminders falls through to the wildcard
    expect(filter.evaluate(makeCapability('reminders', 'tasks', 'list')).disposition).toBe('allow')
  })
})

// ---------------------------------------------------------------------------
// AC: allowed capability surfaces (integration with notebookManifest fixture)
// ---------------------------------------------------------------------------

describe('policy filter with Notebook fixture — allowed capability surfaces', () => {
  const registry = buildCapabilityRegistry([notebookManifest()])

  it('an allowed capability appears in governedDiscoverySearch results', () => {
    // Policy: notebook app is allowed
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const outcome = governedDiscoverySearch(registry, 'list notes', 10, filter)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind !== 'matches') return
    const names = outcome.governed.map((g) => g.capability.name)
    expect(names).toContain('notebook.notes.list')
  })

  it('all governed results have disposition "allow" when policy allows the app', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'allowed' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const outcome = governedDiscoverySearch(registry, 'note', 10, filter)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind !== 'matches') return
    for (const g of outcome.governed) {
      expect(g.decision.disposition).toBe('allow')
    }
  })
})

// ---------------------------------------------------------------------------
// AC: forbidden capability is governance-blocked (not silently missing)
// ---------------------------------------------------------------------------

describe('policy filter with Notebook fixture — forbidden capability is governance-blocked', () => {
  const registry = buildCapabilityRegistry([notebookManifest()])

  it('returns governance-blocked (not no-match) when all matches are forbidden', () => {
    // Policy: notebook app is forbidden — every notebook capability is denied.
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: 'notebook', disposition: 'forbidden' }],
    })
    const filter = createPolicyGovernanceFilter(policy)
    // The intent clearly matches notebook capabilities ("delete notes").
    const outcome = governedDiscoverySearch(registry, 'delete notes', 10, filter)
    // Must NOT return 'no-match' (which would suggest generating a new capability).
    expect(outcome.kind).toBe('governance-blocked')
    if (outcome.kind !== 'governance-blocked') return
    expect(outcome.deniedCount).toBeGreaterThan(0)
  })

  it('governance-blocked carries the count of denied capabilities', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const outcome = governedDiscoverySearch(registry, 'note', 10, filter)
    expect(outcome.kind).toBe('governance-blocked')
    if (outcome.kind !== 'governance-blocked') return
    expect(typeof outcome.deniedCount).toBe('number')
    expect(outcome.deniedCount).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// AC: backfilling preserved — disallowed caps replaced, limit honored
// ---------------------------------------------------------------------------

describe('policy filter with Notebook fixture — backfilling to limit', () => {
  const registry = buildCapabilityRegistry([notebookManifest()])

  it('allowed capabilities backfill past forbidden ones up to limit', () => {
    // Policy: delete is forbidden, everything else is allowed.
    // This tests that denied capabilities are replaced rather than reducing results.
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [
        {
          app: 'notebook',
          disposition: 'allowed',
          operations: [{ operation: 'delete', disposition: 'forbidden' }],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const outcome = governedDiscoverySearch(registry, 'note', 10, filter)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind !== 'matches') return
    // None of the results should be the forbidden 'delete' operation.
    for (const g of outcome.governed) {
      expect(g.capability.operation).not.toBe('delete')
      expect(g.decision.disposition).not.toBe('deny')
    }
  })

  it('returns at most `limit` results even when more are allowed', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const limit = 2
    const outcome = governedDiscoverySearch(registry, 'note', limit, filter)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind !== 'matches') return
    expect(outcome.governed.length).toBeLessThanOrEqual(limit)
  })
})

// ---------------------------------------------------------------------------
// warn (read-only / confirm-first) capabilities surface with flagged decision
// ---------------------------------------------------------------------------

describe('policy filter — warn capabilities surface with flagged decision', () => {
  const registry = buildCapabilityRegistry([notebookManifest()])

  it('confirm-first operations surface with disposition "warn"', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'allowed',
      apps: [
        {
          app: 'notebook',
          disposition: 'allowed',
          operations: [
            {
              operation: 'share',
              disposition: 'confirm-first',
              reason: 'sharing requires approval',
            },
          ],
        },
      ],
    })
    const filter = createPolicyGovernanceFilter(policy)
    const outcome = governedDiscoverySearch(registry, 'share note', 10, filter)
    expect(outcome.kind).toBe('matches')
    if (outcome.kind !== 'matches') return
    const shareResult = outcome.governed.find((g) => g.capability.operation === 'share')
    expect(shareResult).toBeDefined()
    expect(shareResult?.decision.disposition).toBe('warn')
    expect(shareResult?.decision.reason).toBe('sharing requires approval')
  })
})

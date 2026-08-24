/**
 * Tests for layered governance-policy composition (host policy × per-key policy).
 *
 * Coverage contract (acceptance criteria from issue #108):
 *
 * - The full composition table across host × key dispositions, for a read-class
 *   and a mutating operation.
 * - Canonical negative #1: host `allowed` + key `confirm-first` → held, never
 *   silently allowed.
 * - Canonical negative #2: host `forbidden` + key `allowed` → denied outright,
 *   never escalated to `confirm-first` (nobody is asked to approve something the
 *   host policy already refused).
 * - Restriction composition: union of denies, intersection of allows, one test
 *   per restriction kind.
 * - Absent key policy → the host evaluation verbatim (decision, rule, and reason
 *   string), so existing behavior is unchanged.
 * - The effective decision reports which layer produced it, for approval routing.
 *
 * Expected values are derived from the composition rules stated in the issue and
 * in `composition.ts`, not from program output.
 *
 * @see https://github.com/mike-north/macts/issues/108
 */

import { describe, expect, it } from 'vitest'
import {
  compareDispositionStrictness,
  comparePolicyDecisionStrictness,
  composePolicyEvaluations,
  composeRestrictions,
  composedRestrictionsPermit,
  evaluateLayeredPolicy,
  strictestPolicyDecision,
  type ComposedRestrictions,
} from './composition.js'
import { evaluatePolicy, type PolicyDecision } from './evaluator.js'
import type { AppRule, GovernancePolicy, PolicyDisposition, Restrictions } from './policy.js'
import { makeAppRule, makePolicy } from './policy-test-fixtures.js'
import type { RiskClass } from '../capabilities/risk.js'

/** The capability every composition case is evaluated against. */
const PERMISSION = 'calendar:events:create'

/** A read-class operation on the same app, for the read-only/confirm-first split. */
const READ_PERMISSION = 'calendar:events:list'

/** Build a single-app policy pinning `calendar` to `disposition`. */
function policyFor(disposition: PolicyDisposition): GovernancePolicy {
  return makePolicy([makeAppRule({ app: 'calendar', disposition })])
}

/** Build an app rule carrying explicit path/URL restrictions. */
function ruleWithRestrictions(restrictions: Restrictions): AppRule {
  return { ...makeAppRule({ app: 'calendar', disposition: 'allowed' }), restrictions }
}

/** Fully-defaulted restriction block with the supplied overrides applied. */
function restrictions(overrides: Partial<Restrictions>): Restrictions {
  return { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [], ...overrides }
}

/**
 * Evaluate a host × key disposition pair for one risk class.
 */
function compose(
  host: PolicyDisposition,
  key: PolicyDisposition | undefined,
  risk: RiskClass,
  permission: string = PERMISSION
): ReturnType<typeof evaluateLayeredPolicy> {
  return evaluateLayeredPolicy({
    hostPolicy: policyFor(host),
    ...(key === undefined ? {} : { keyPolicy: policyFor(key) }),
    permission,
    risk,
  })
}

describe('decision strictness lattice', () => {
  // Issue #108: the operative tightening order is denied > confirm-first > allowed.
  it('orders denied stricter than confirm-first, and confirm-first stricter than allowed', () => {
    expect(comparePolicyDecisionStrictness('denied', 'confirm-first')).toBeGreaterThan(0)
    expect(comparePolicyDecisionStrictness('confirm-first', 'allowed')).toBeGreaterThan(0)
    expect(comparePolicyDecisionStrictness('denied', 'allowed')).toBeGreaterThan(0)
  })

  it('treats equal decisions as equally strict', () => {
    expect(comparePolicyDecisionStrictness('denied', 'denied')).toBe(0)
    expect(comparePolicyDecisionStrictness('allowed', 'allowed')).toBe(0)
  })

  it('picks the stricter of two decisions, and returns the first on a tie', () => {
    expect(strictestPolicyDecision('allowed', 'denied')).toBe('denied')
    expect(strictestPolicyDecision('denied', 'allowed')).toBe('denied')
    expect(strictestPolicyDecision('allowed', 'confirm-first')).toBe('confirm-first')
    expect(strictestPolicyDecision('confirm-first', 'denied')).toBe('denied')
    expect(strictestPolicyDecision('confirm-first', 'confirm-first')).toBe('confirm-first')
  })
})

describe('declarative disposition ordering', () => {
  // Declarative only — documented as *not* the composition rule, because
  // read-only and confirm-first swap strictness with the operation's risk class.
  it('orders forbidden > confirm-first > read-only > allowed', () => {
    expect(compareDispositionStrictness('forbidden', 'confirm-first')).toBeGreaterThan(0)
    expect(compareDispositionStrictness('confirm-first', 'read-only')).toBeGreaterThan(0)
    expect(compareDispositionStrictness('read-only', 'allowed')).toBeGreaterThan(0)
    expect(compareDispositionStrictness('allowed', 'allowed')).toBe(0)
  })

  it('does not govern composition: read-only host still denies a mutating call a confirm-first key would hold', () => {
    // The declarative order says confirm-first is stricter than read-only, but
    // composing on that would turn a host denial into an approvable hold.
    expect(compareDispositionStrictness('confirm-first', 'read-only')).toBeGreaterThan(0)
    expect(compose('read-only', 'confirm-first', 'write').decision).toBe('denied')
  })
})

describe('composition table (host × key)', () => {
  // Each expectation is the stricter of the two layers' *decisions* for the
  // given risk class, per the lattice denied > confirm-first > allowed.
  //
  // For a mutating (write-class) operation the per-layer decisions are:
  //   allowed → allowed, read-only → denied, confirm-first → confirm-first,
  //   forbidden → denied.
  const MUTATING_TABLE: readonly {
    host: PolicyDisposition
    key: PolicyDisposition
    decision: PolicyDecision
    layer: 'host' | 'key'
  }[] = [
    { host: 'allowed', key: 'allowed', decision: 'allowed', layer: 'host' },
    { host: 'allowed', key: 'read-only', decision: 'denied', layer: 'key' },
    { host: 'allowed', key: 'confirm-first', decision: 'confirm-first', layer: 'key' },
    { host: 'allowed', key: 'forbidden', decision: 'denied', layer: 'key' },

    { host: 'read-only', key: 'allowed', decision: 'denied', layer: 'host' },
    { host: 'read-only', key: 'read-only', decision: 'denied', layer: 'host' },
    { host: 'read-only', key: 'confirm-first', decision: 'denied', layer: 'host' },
    { host: 'read-only', key: 'forbidden', decision: 'denied', layer: 'host' },

    { host: 'confirm-first', key: 'allowed', decision: 'confirm-first', layer: 'host' },
    { host: 'confirm-first', key: 'read-only', decision: 'denied', layer: 'key' },
    { host: 'confirm-first', key: 'confirm-first', decision: 'confirm-first', layer: 'host' },
    { host: 'confirm-first', key: 'forbidden', decision: 'denied', layer: 'key' },

    { host: 'forbidden', key: 'allowed', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'read-only', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'confirm-first', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'forbidden', decision: 'denied', layer: 'host' },
  ]

  it.each(MUTATING_TABLE)(
    'host=$host key=$key on a mutating op → $decision (from the $layer layer)',
    ({ host, key, decision, layer }) => {
      const result = compose(host, key, 'write')
      expect(result.decision).toBe(decision)
      expect(result.layer).toBe(layer)
    }
  )

  // For a read-class operation the per-layer decisions are:
  //   allowed → allowed, read-only → allowed, confirm-first → confirm-first,
  //   forbidden → denied.
  const READ_TABLE: readonly {
    host: PolicyDisposition
    key: PolicyDisposition
    decision: PolicyDecision
    layer: 'host' | 'key'
  }[] = [
    { host: 'allowed', key: 'allowed', decision: 'allowed', layer: 'host' },
    { host: 'allowed', key: 'read-only', decision: 'allowed', layer: 'host' },
    { host: 'allowed', key: 'confirm-first', decision: 'confirm-first', layer: 'key' },
    { host: 'allowed', key: 'forbidden', decision: 'denied', layer: 'key' },

    { host: 'read-only', key: 'allowed', decision: 'allowed', layer: 'host' },
    { host: 'read-only', key: 'read-only', decision: 'allowed', layer: 'host' },
    { host: 'read-only', key: 'confirm-first', decision: 'confirm-first', layer: 'key' },
    { host: 'read-only', key: 'forbidden', decision: 'denied', layer: 'key' },

    { host: 'confirm-first', key: 'allowed', decision: 'confirm-first', layer: 'host' },
    { host: 'confirm-first', key: 'read-only', decision: 'confirm-first', layer: 'host' },
    { host: 'confirm-first', key: 'confirm-first', decision: 'confirm-first', layer: 'host' },
    { host: 'confirm-first', key: 'forbidden', decision: 'denied', layer: 'key' },

    { host: 'forbidden', key: 'allowed', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'read-only', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'confirm-first', decision: 'denied', layer: 'host' },
    { host: 'forbidden', key: 'forbidden', decision: 'denied', layer: 'host' },
  ]

  it.each(READ_TABLE)(
    'host=$host key=$key on a read op → $decision (from the $layer layer)',
    ({ host, key, decision, layer }) => {
      const result = compose(host, key, 'read', READ_PERMISSION)
      expect(result.decision).toBe(decision)
      expect(result.layer).toBe(layer)
    }
  )

  it('never lets a key policy widen the host decision', () => {
    for (const { host, decision } of MUTATING_TABLE) {
      const hostOnly = compose(host, undefined, 'write').decision
      expect(comparePolicyDecisionStrictness(decision, hostOnly)).toBeGreaterThanOrEqual(0)
    }
    for (const { host, decision } of READ_TABLE) {
      const hostOnly = compose(host, undefined, 'read', READ_PERMISSION).decision
      expect(comparePolicyDecisionStrictness(decision, hostOnly)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('canonical negative #1: host allows, key says confirm-first', () => {
  it('holds the call instead of allowing it', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: policyFor('allowed'),
      keyPolicy: policyFor('confirm-first'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.decision).toBe('confirm-first')
    expect(result.host.decision).toBe('allowed')
    expect(result.key?.decision).toBe('confirm-first')
  })

  it('attributes the hold to the key layer so it can be routed to that key’s approver', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: policyFor('allowed'),
      keyPolicy: policyFor('confirm-first'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.layer).toBe('key')
    expect(result.rule.disposition).toBe('confirm-first')
    expect(result.reason).toContain('per-key policy')
    expect(result.reason).toContain(PERMISSION)
  })

  it('attributes a hold both layers agree on to the host layer', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: policyFor('confirm-first'),
      keyPolicy: policyFor('confirm-first'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.decision).toBe('confirm-first')
    // The key policy did not change the outcome, so the host layer owns it.
    expect(result.layer).toBe('host')
  })
})

describe('canonical negative #2: host forbids, key says allowed', () => {
  it('denies outright and never escalates to confirm-first', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: policyFor('forbidden'),
      keyPolicy: policyFor('allowed'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.decision).toBe('denied')
    // Nothing here may ever become an approval request: a denied decision is
    // terminal, so the approval provider is never consulted.
    expect(result.decision).not.toBe('confirm-first')
    expect(result.layer).toBe('host')
  })

  it('explains that the key policy cannot widen the host policy', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: policyFor('forbidden'),
      keyPolicy: policyFor('allowed'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.reason).toContain('cannot widen the host policy')
    expect(result.reason).toContain(PERMISSION)
  })

  it('holds even when the host default (not an explicit rule) forbids', () => {
    // The fail-closed default disposition is not weaker than an explicit rule.
    const result = evaluateLayeredPolicy({
      hostPolicy: makePolicy([], 'forbidden'),
      keyPolicy: makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })], 'allowed'),
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.decision).toBe('denied')
    expect(result.host.rule.source).toBe('default')
  })
})

describe('absent key policy', () => {
  it('produces the host evaluation verbatim', () => {
    const hostPolicy = policyFor('confirm-first')
    const hostOnly = evaluatePolicy(hostPolicy, PERMISSION, 'write')
    const layered = evaluateLayeredPolicy({ hostPolicy, permission: PERMISSION, risk: 'write' })

    expect(layered.decision).toBe(hostOnly.decision)
    expect(layered.permission).toBe(hostOnly.permission)
    expect(layered.rule).toEqual(hostOnly.rule)
    // Byte-identical reason: clients and audit records see no change at all.
    expect(layered.reason).toBe(hostOnly.reason)
    expect(layered.layer).toBe('host')
    expect(layered.key).toBeUndefined()
  })

  it.each(['allowed', 'read-only', 'confirm-first', 'forbidden'] as const)(
    'matches host-only evaluation for a %s host rule',
    (disposition) => {
      const hostPolicy = policyFor(disposition)
      for (const [permission, risk] of [
        [PERMISSION, 'write'],
        [READ_PERMISSION, 'read'],
      ] as const) {
        const hostOnly = evaluatePolicy(hostPolicy, permission, risk)
        const layered = evaluateLayeredPolicy({ hostPolicy, permission, risk })
        expect(layered.decision).toBe(hostOnly.decision)
        expect(layered.reason).toBe(hostOnly.reason)
      }
    }
  )

  it('treats an explicitly undefined key policy the same as an omitted one', () => {
    const hostPolicy = policyFor('allowed')
    const layered = evaluateLayeredPolicy({
      hostPolicy,
      keyPolicy: undefined,
      permission: PERMISSION,
      risk: 'write',
    })

    expect(layered.key).toBeUndefined()
    expect(layered.reason).toBe(evaluatePolicy(hostPolicy, PERMISSION, 'write').reason)
  })
})

describe('malformed permissions', () => {
  it('stays denied under composition when the permission string is malformed', () => {
    const result = evaluateLayeredPolicy({
      hostPolicy: makePolicy([], 'allowed'),
      keyPolicy: makePolicy([], 'allowed'),
      permission: 'not-a-permission',
      risk: 'read',
    })

    // Both layers fail closed on an unparseable capability; composition keeps it.
    expect(result.decision).toBe('denied')
  })
})

describe('composeRestrictions', () => {
  it('unions path denies across layers, de-duplicated and order-preserving', () => {
    const composed = composeRestrictions(
      restrictions({ pathsDeny: ['/etc/**', '/private/**'] }),
      restrictions({ pathsDeny: ['/private/**', '/Users/*/.ssh/**'] })
    )

    expect(composed.pathsDeny).toEqual(['/etc/**', '/private/**', '/Users/*/.ssh/**'])
  })

  it('unions url denies across layers', () => {
    const composed = composeRestrictions(
      restrictions({ urlsDeny: ['http://**'] }),
      restrictions({ urlsDeny: ['https://internal.example.com/**'] })
    )

    expect(composed.urlsDeny).toEqual(['http://**', 'https://internal.example.com/**'])
  })

  it('keeps each layer’s path allow list as its own conjunctive group', () => {
    const composed = composeRestrictions(
      restrictions({ pathsAllow: ['/Users/me/**'] }),
      restrictions({ pathsAllow: ['/Users/me/projects/**'] })
    )

    // Intersection, not concatenation: flattening these into one list would mean
    // "either", which is wider than either layer alone.
    expect(composed.pathsAllowGroups).toEqual([['/Users/me/**'], ['/Users/me/projects/**']])
  })

  it('keeps each layer’s url allow list as its own conjunctive group', () => {
    const composed = composeRestrictions(
      restrictions({ urlsAllow: ['https://example.com/**'] }),
      restrictions({ urlsAllow: ['https://example.com/api/**'] })
    )

    expect(composed.urlsAllowGroups).toEqual([
      ['https://example.com/**'],
      ['https://example.com/api/**'],
    ])
  })

  it('contributes no group for a layer that declares no allow patterns', () => {
    const composed = composeRestrictions(
      restrictions({ pathsAllow: [] }),
      restrictions({ pathsAllow: ['/Users/me/projects/**'] })
    )

    expect(composed.pathsAllowGroups).toEqual([['/Users/me/projects/**']])
  })

  it('is unconstrained when neither layer restricts', () => {
    const composed = composeRestrictions(undefined, undefined)

    expect(composed).toEqual({
      pathsDeny: [],
      pathsAllowGroups: [],
      urlsDeny: [],
      urlsAllowGroups: [],
    })
  })

  it('composes the restrictions of both layers’ matched app rules', () => {
    const hostPolicy = makePolicy([
      ruleWithRestrictions(restrictions({ pathsDeny: ['/etc/**'], pathsAllow: ['/Users/me/**'] })),
    ])
    const keyPolicy = makePolicy([
      ruleWithRestrictions(
        restrictions({ pathsDeny: ['/tmp/**'], pathsAllow: ['/Users/me/projects/**'] })
      ),
    ])

    const result = evaluateLayeredPolicy({
      hostPolicy,
      keyPolicy,
      permission: PERMISSION,
      risk: 'write',
    })

    expect(result.restrictions.pathsDeny).toEqual(['/etc/**', '/tmp/**'])
    expect(result.restrictions.pathsAllowGroups).toEqual([
      ['/Users/me/**'],
      ['/Users/me/projects/**'],
    ])
  })
})

describe('composedRestrictionsPermit', () => {
  /**
   * Deliberately simple, spec-free matcher: this suite tests *composition*
   * semantics, not pattern-matching semantics (which the enforcement layer owns).
   * `**` is treated as a trailing wildcard, everything else is exact.
   */
  const matches = (pattern: string, candidate: string): boolean =>
    pattern.endsWith('**') ? candidate.startsWith(pattern.slice(0, -2)) : pattern === candidate

  const composed = (overrides: Partial<ComposedRestrictions>): ComposedRestrictions => ({
    pathsDeny: [],
    pathsAllowGroups: [],
    urlsDeny: [],
    urlsAllowGroups: [],
    ...overrides,
  })

  it('permits anything when neither layer restricts', () => {
    expect(composedRestrictionsPermit(composed({}), 'path', '/anywhere/at/all', matches)).toBe(true)
  })

  it('rejects a path denied by either layer (union of denies)', () => {
    const set = composed({ pathsDeny: ['/etc/**', '/tmp/**'] })

    expect(composedRestrictionsPermit(set, 'path', '/etc/hosts', matches)).toBe(false)
    expect(composedRestrictionsPermit(set, 'path', '/tmp/scratch', matches)).toBe(false)
    expect(composedRestrictionsPermit(set, 'path', '/Users/me/notes.txt', matches)).toBe(true)
  })

  it('rejects a url denied by either layer (union of denies)', () => {
    const set = composed({ urlsDeny: ['http://**', 'https://internal.example.com/**'] })

    expect(composedRestrictionsPermit(set, 'url', 'http://example.com/', matches)).toBe(false)
    expect(
      composedRestrictionsPermit(set, 'url', 'https://internal.example.com/admin', matches)
    ).toBe(false)
    expect(composedRestrictionsPermit(set, 'url', 'https://example.com/', matches)).toBe(true)
  })

  it('requires a path to satisfy every allow group (intersection of allows)', () => {
    const set = composed({
      pathsAllowGroups: [['/Users/me/**'], ['/Users/me/projects/**']],
    })

    // In both: permitted.
    expect(composedRestrictionsPermit(set, 'path', '/Users/me/projects/a.txt', matches)).toBe(true)
    // In the host group only: the key layer narrowed it away.
    expect(composedRestrictionsPermit(set, 'path', '/Users/me/private/a.txt', matches)).toBe(false)
    // In neither.
    expect(composedRestrictionsPermit(set, 'path', '/opt/a.txt', matches)).toBe(false)
  })

  it('requires a url to satisfy every allow group (intersection of allows)', () => {
    const set = composed({
      urlsAllowGroups: [['https://example.com/**'], ['https://example.com/api/**']],
    })

    expect(composedRestrictionsPermit(set, 'url', 'https://example.com/api/v1', matches)).toBe(true)
    expect(composedRestrictionsPermit(set, 'url', 'https://example.com/docs', matches)).toBe(false)
    expect(composedRestrictionsPermit(set, 'url', 'https://other.example.org/api', matches)).toBe(
      false
    )
  })

  it('applies denies before allows, so a denied path in every allow group is still rejected', () => {
    const set = composed({
      pathsDeny: ['/Users/me/projects/secrets/**'],
      pathsAllowGroups: [['/Users/me/**'], ['/Users/me/projects/**']],
    })

    expect(
      composedRestrictionsPermit(set, 'path', '/Users/me/projects/secrets/key.pem', matches)
    ).toBe(false)
  })

  it('keeps path and url dimensions independent', () => {
    const set = composed({ pathsDeny: ['/etc/**'], urlsDeny: ['http://**'] })

    expect(composedRestrictionsPermit(set, 'url', '/etc/hosts', matches)).toBe(true)
    expect(composedRestrictionsPermit(set, 'path', 'http://example.com/', matches)).toBe(true)
  })
})

describe('composePolicyEvaluations', () => {
  it('composes pre-computed layer evaluations the same way as evaluateLayeredPolicy', () => {
    const hostPolicy = policyFor('allowed')
    const keyPolicy = policyFor('forbidden')

    const composedDirectly = composePolicyEvaluations(
      evaluatePolicy(hostPolicy, PERMISSION, 'write'),
      evaluatePolicy(keyPolicy, PERMISSION, 'write')
    )
    const viaPolicies = evaluateLayeredPolicy({
      hostPolicy,
      keyPolicy,
      permission: PERMISSION,
      risk: 'write',
    })

    expect(composedDirectly).toEqual(viaPolicies)
  })
})

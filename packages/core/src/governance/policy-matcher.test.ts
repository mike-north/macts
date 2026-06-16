/**
 * Runtime tests for governance-policy wildcard matching.
 *
 * These tests verify that the wildcard semantics used in the governance policy
 * matcher are consistent with the established rules in
 * `../permissions/matcher.ts` (the `matchesWildcard` internal helper). In
 * that module:
 *
 *   1. App must match exactly — no app-level wildcard in fine-grained
 *      permissions (app is always concrete).
 *   2. `resource === '*'` matches any resource.
 *   3. `operation === '*'` matches any operation.
 *
 * The governance policy extends the same rule to the app level: a rule whose
 * `app` is `'*'` governs any concrete app. The tests below verify that both
 * `appPatternMatches` and `operationPatternMatches` apply the "wildcard in
 * pattern position matches any concrete value" rule consistently, and that
 * `findMatchingPolicyRule` composes them correctly.
 *
 * @see `../permissions/matcher.ts` — canonical wildcard logic.
 * @see Issue #52 — governance foundation: wildcard semantics consistency (AC4).
 */

import { describe, it, expect } from 'vitest'
import {
  appPatternMatches,
  operationPatternMatches,
  findMatchingPolicyRule,
} from './policy-matcher.js'
import { parsePolicy } from './policy.js'
import type { GovernancePolicy } from './policy.js'

// ---------------------------------------------------------------------------
// appPatternMatches
// ---------------------------------------------------------------------------

describe('appPatternMatches', () => {
  it('"*" matches any concrete app name (consistent with permissions/* wildcard rule)', () => {
    expect(appPatternMatches('*', 'calendar')).toBe(true)
    expect(appPatternMatches('*', 'reminders')).toBe(true)
    expect(appPatternMatches('*', 'mail')).toBe(true)
  })

  it('a concrete pattern matches its exact app name', () => {
    expect(appPatternMatches('calendar', 'calendar')).toBe(true)
  })

  it('a concrete pattern does NOT match a different app name (no partial match)', () => {
    expect(appPatternMatches('calendar', 'reminders')).toBe(false)
    expect(appPatternMatches('reminders', 'calendar')).toBe(false)
  })

  it('app matching is case-sensitive', () => {
    expect(appPatternMatches('Calendar', 'calendar')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// operationPatternMatches
// ---------------------------------------------------------------------------

describe('operationPatternMatches', () => {
  it('"*" matches any concrete operation (mirrors permissions/matcher operation wildcard)', () => {
    expect(operationPatternMatches('*', 'create')).toBe(true)
    expect(operationPatternMatches('*', 'delete')).toBe(true)
    expect(operationPatternMatches('*', 'list')).toBe(true)
  })

  it('a concrete pattern matches its exact operation', () => {
    expect(operationPatternMatches('create', 'create')).toBe(true)
  })

  it('a concrete pattern does NOT match a different operation', () => {
    expect(operationPatternMatches('create', 'delete')).toBe(false)
    expect(operationPatternMatches('list', 'create')).toBe(false)
  })

  it('operation matching is case-sensitive', () => {
    expect(operationPatternMatches('Create', 'create')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// findMatchingPolicyRule — helpers
// ---------------------------------------------------------------------------

/** Parse a valid policy declaration; throws if it fails (test infrastructure). */
function parseValidPolicy(declaration: unknown): GovernancePolicy {
  const result = parsePolicy(declaration)
  if (!result.success) {
    throw new Error(`Policy parse failed: ${JSON.stringify(result.issues)}`)
  }
  return result.data
}

function basePolicyDeclaration() {
  return {
    version: '1',
    defaultDisposition: 'forbidden',
    apps: [
      {
        app: 'calendar',
        disposition: 'allowed',
        operations: [{ operation: 'delete', disposition: 'forbidden' }],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// findMatchingPolicyRule — concrete app + operation
// ---------------------------------------------------------------------------

describe('findMatchingPolicyRule — concrete app rule', () => {
  it('returns the matching app rule for an exact app match', () => {
    const policy = parseValidPolicy(basePolicyDeclaration())
    const match = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(match).toBeDefined()
    if (!match) return
    expect(match.appRule.app).toBe('calendar')
  })

  it('returns undefined for an app that has no matching rule', () => {
    const policy = parseValidPolicy(basePolicyDeclaration())
    const match = findMatchingPolicyRule(policy, 'reminders', 'lists', 'create')
    expect(match).toBeUndefined()
  })

  it('returns operationRuleIndex -1 when no per-operation override matches', () => {
    const policy = parseValidPolicy(basePolicyDeclaration())
    // 'create' is not overridden in the calendar rule — only 'delete' is.
    const match = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(match).toBeDefined()
    if (!match) return
    expect(match.operationRuleIndex).toBe(-1)
  })

  it('returns the correct operationRuleIndex when a per-operation override matches', () => {
    const policy = parseValidPolicy(basePolicyDeclaration())
    // 'delete' IS overridden (index 0 in operations array).
    const match = findMatchingPolicyRule(policy, 'calendar', 'events', 'delete')
    expect(match).toBeDefined()
    if (!match) return
    expect(match.operationRuleIndex).toBe(0)
    expect(match.appRule.operations[0]?.operation).toBe('delete')
  })
})

// ---------------------------------------------------------------------------
// findMatchingPolicyRule — app wildcard `*`
// ---------------------------------------------------------------------------

describe('findMatchingPolicyRule — app wildcard "*"', () => {
  it('a "*" app rule matches any concrete app', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [{ app: '*', disposition: 'allowed' }],
    })
    expect(findMatchingPolicyRule(policy, 'calendar', 'events', 'create')).toBeDefined()
    expect(findMatchingPolicyRule(policy, 'reminders', 'lists', 'delete')).toBeDefined()
    expect(findMatchingPolicyRule(policy, 'mail', 'messages', 'list')).toBeDefined()
  })

  it('a concrete app rule is NOT matched by a different concrete app even with a wildcard elsewhere', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        { app: 'calendar', disposition: 'allowed' },
        { app: '*', disposition: 'forbidden' },
      ],
    })
    // calendar matches the first rule.
    const calendarMatch = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(calendarMatch).toBeDefined()
    if (!calendarMatch) return
    expect(calendarMatch.appRule.app).toBe('calendar')

    // reminders falls through to the wildcard rule.
    const remindersMatch = findMatchingPolicyRule(policy, 'reminders', 'lists', 'create')
    expect(remindersMatch).toBeDefined()
    if (!remindersMatch) return
    expect(remindersMatch.appRule.app).toBe('*')
  })
})

// ---------------------------------------------------------------------------
// findMatchingPolicyRule — operation wildcard `*`
// ---------------------------------------------------------------------------

describe('findMatchingPolicyRule — operation wildcard "*"', () => {
  it('a "*" operation rule matches any concrete operation within a matching app', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'calendar',
          disposition: 'forbidden',
          operations: [{ operation: '*', disposition: 'allowed' }],
        },
      ],
    })
    const createMatch = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(createMatch).toBeDefined()
    if (!createMatch) return
    expect(createMatch.operationRuleIndex).toBe(0)

    const deleteMatch = findMatchingPolicyRule(policy, 'calendar', 'events', 'delete')
    expect(deleteMatch).toBeDefined()
    if (!deleteMatch) return
    expect(deleteMatch.operationRuleIndex).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// findMatchingPolicyRule — declaration-order / first-match-wins
// ---------------------------------------------------------------------------

describe('findMatchingPolicyRule — first-match-wins (declaration order)', () => {
  it('returns the FIRST matching app rule when multiple rules could match', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        { app: 'calendar', disposition: 'allowed' },
        // A second calendar rule — should never be reached.
        { app: 'calendar', disposition: 'forbidden' },
      ],
    })
    const match = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(match).toBeDefined()
    if (!match) return
    // Must return the first rule (disposition: 'allowed'), not the second.
    expect(match.appRule.disposition).toBe('allowed')
  })

  it('returns the FIRST matching operation override within a rule', () => {
    const policy = parseValidPolicy({
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'calendar',
          disposition: 'forbidden',
          operations: [
            { operation: 'create', disposition: 'allowed' },
            // A duplicate 'create' entry — first should win.
            { operation: 'create', disposition: 'confirm-first' },
          ],
        },
      ],
    })
    const match = findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
    expect(match).toBeDefined()
    if (!match) return
    expect(match.operationRuleIndex).toBe(0)
    expect(match.appRule.operations[0]?.disposition).toBe('allowed')
  })
})

// ---------------------------------------------------------------------------
// Wildcard semantics agreement with permissions/matcher.ts
//
// The tests below make the alignment explicit: we re-test the same logical
// rules using the permission-system's hasPermission / checkPermission
// alongside the governance matcher so it's clear they agree.
// ---------------------------------------------------------------------------

describe('wildcard semantics agreement with permissions/matcher.ts', () => {
  it('operation wildcard "*" in governance matches the same operations that "app:resource:*" grants in the permission system', async () => {
    // permission system: 'calendar:events:*' grants 'calendar:events:create'
    const { checkPermission } = await import('../permissions/matcher.js')
    expect(checkPermission(['calendar:events:*'], 'calendar:events:create')).toBe(true)
    expect(checkPermission(['calendar:events:*'], 'calendar:events:delete')).toBe(true)

    // governance policy: operation '*' should match 'create' and 'delete'
    expect(operationPatternMatches('*', 'create')).toBe(true)
    expect(operationPatternMatches('*', 'delete')).toBe(true)
  })

  it('a concrete operation in governance matches the same way as a concrete operation in the permission system', async () => {
    const { checkPermission } = await import('../permissions/matcher.js')
    // permission system: 'calendar:events:create' grants 'calendar:events:create', not 'delete'
    expect(checkPermission(['calendar:events:create'], 'calendar:events:create')).toBe(true)
    expect(checkPermission(['calendar:events:create'], 'calendar:events:delete')).toBe(false)

    // governance: 'create' matches 'create', not 'delete'
    expect(operationPatternMatches('create', 'create')).toBe(true)
    expect(operationPatternMatches('create', 'delete')).toBe(false)
  })
})

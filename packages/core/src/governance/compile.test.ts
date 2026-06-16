/**
 * Tests for compiling a governance policy to the concrete permissions it grants.
 *
 * Coverage contract (acceptance criteria from issue #53):
 *
 * - An in-policy permission is present in the compiled set.
 * - An out-of-policy permission is absent.
 * - A read-only rule grants read-class permissions but not mutating ones.
 * - confirm-first and forbidden permissions are not granted as standing perms.
 * - The compiled set is consistent with the evaluator (single source of truth).
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { describe, expect, it } from 'vitest'
import {
  compilePolicyToPermissions,
  policyGrantsPermission,
  type PolicyCandidate,
} from './compile.js'
import { makeAppRule, makeOperationRule, makePolicy } from './policy-test-fixtures.js'

/** A representative universe of candidate capabilities. */
const CANDIDATES: readonly PolicyCandidate[] = [
  { permission: 'calendar:events:list', risk: 'read' },
  { permission: 'calendar:events:get', risk: 'read' },
  { permission: 'calendar:events:create', risk: 'write' },
  { permission: 'calendar:events:delete', risk: 'delete' },
  { permission: 'notes:notes:list', risk: 'read' },
  { permission: 'notes:notes:create', risk: 'write' },
  { permission: 'mail:messages:send', risk: 'send' },
]

describe('compilePolicyToPermissions', () => {
  it('grants every candidate under an app "allowed" rule', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    // In-policy permissions present.
    expect(granted).toContain('calendar:events:list')
    expect(granted).toContain('calendar:events:create')
    expect(granted).toContain('calendar:events:delete')
    // Out-of-policy permissions absent (default forbidden).
    expect(granted).not.toContain('notes:notes:list')
    expect(granted).not.toContain('mail:messages:send')
  })

  it('a read-only rule grants only read-class permissions', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    // Read-class granted.
    expect(granted).toContain('calendar:events:list')
    expect(granted).toContain('calendar:events:get')
    // Mutating-class NOT granted.
    expect(granted).not.toContain('calendar:events:create')
    expect(granted).not.toContain('calendar:events:delete')
  })

  it('does not grant confirm-first permissions as standing permissions', () => {
    const policy = makePolicy([makeAppRule({ app: 'mail', disposition: 'confirm-first' })])
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    // confirm-first is gated behind approval, not a standing grant.
    expect(granted).not.toContain('mail:messages:send')
  })

  it('does not grant forbidden permissions (negative)', () => {
    const policy = makePolicy(
      [makeAppRule({ app: 'calendar', disposition: 'forbidden' })],
      'allowed'
    )
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    expect(granted).not.toContain('calendar:events:list')
    expect(granted).not.toContain('calendar:events:create')
    // The wildcard default 'allowed' still grants the non-calendar candidates.
    expect(granted).toContain('notes:notes:list')
  })

  it('respects operation-level overrides', () => {
    const policy = makePolicy([
      makeAppRule({
        app: 'calendar',
        disposition: 'allowed',
        operations: [makeOperationRule('delete', 'forbidden')],
      }),
    ])
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    expect(granted).toContain('calendar:events:create')
    expect(granted).not.toContain('calendar:events:delete')
  })

  it('returns an empty set for the fail-closed empty policy', () => {
    const policy = makePolicy([])
    expect(compilePolicyToPermissions(policy, CANDIDATES)).toEqual([])
  })

  it('preserves candidate order and de-duplicates', () => {
    const policy = makePolicy([makeAppRule({ app: '*', disposition: 'allowed' })])
    const withDupes: PolicyCandidate[] = [
      { permission: 'a:b:list', risk: 'read' },
      { permission: 'a:c:list', risk: 'read' },
      { permission: 'a:b:list', risk: 'read' }, // duplicate
    ]
    expect(compilePolicyToPermissions(policy, withDupes)).toEqual(['a:b:list', 'a:c:list'])
  })

  it('is consistent with the evaluator: granted ⇔ enforcement would allow', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])
    const granted = compilePolicyToPermissions(policy, CANDIDATES)

    for (const candidate of CANDIDATES) {
      const inSet = granted.includes(candidate.permission)
      const grantsIt = policyGrantsPermission(policy, candidate)
      expect(inSet).toBe(grantsIt)
    }
  })
})

describe('policyGrantsPermission', () => {
  it('is true for an in-policy permission', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    expect(
      policyGrantsPermission(policy, { permission: 'calendar:events:create', risk: 'write' })
    ).toBe(true)
  })

  it('is false for an out-of-policy permission (negative)', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    expect(
      policyGrantsPermission(policy, { permission: 'notes:notes:create', risk: 'write' })
    ).toBe(false)
  })

  it('is false for a confirm-first permission (not a standing grant)', () => {
    const policy = makePolicy([makeAppRule({ app: 'mail', disposition: 'confirm-first' })])
    expect(policyGrantsPermission(policy, { permission: 'mail:messages:send', risk: 'send' })).toBe(
      false
    )
  })
})

/**
 * Tests for the governance policy evaluator — the single source of truth for
 * allow / deny / confirm-first decisions.
 *
 * Coverage contract (acceptance criteria from issue #53):
 *
 * - In-policy `allowed` rule → `'allowed'`.
 * - Out-of-policy (no rule, default `forbidden`) → `'denied'` (fail-closed).
 * - `read-only` rule → `'allowed'` for a read op, `'denied'` for a mutating op.
 * - `forbidden` rule → `'denied'`.
 * - `confirm-first` rule → `'confirm-first'` (pending-approval signal).
 * - Every non-allow decision carries a reason naming the rule + exact permission.
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { describe, expect, it } from 'vitest'
import { evaluatePolicy } from './evaluator.js'
import { makeAppRule, makeOperationRule, makePolicy } from './policy-test-fixtures.js'

describe('evaluatePolicy', () => {
  describe('allowed rule', () => {
    it('returns "allowed" for an in-policy capability', () => {
      const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
      const result = evaluatePolicy(policy, 'calendar:events:create', 'write')

      expect(result.decision).toBe('allowed')
      expect(result.rule.source).toBe('app')
      expect(result.rule.disposition).toBe('allowed')
      expect(result.permission).toBe('calendar:events:create')
    })

    it('reason names the governing app rule and the exact permission', () => {
      const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
      const result = evaluatePolicy(policy, 'calendar:events:list', 'read')

      // reason must reference the exact app:resource:operation and the rule.
      expect(result.reason).toContain('calendar:events:list')
      expect(result.reason).toContain('app rule "calendar"')
      expect(result.reason).toContain('allowed')
    })

    it('honors an app-wildcard rule', () => {
      const policy = makePolicy([makeAppRule({ app: '*', disposition: 'allowed' })])
      const result = evaluatePolicy(policy, 'notes:notes:create', 'write')

      expect(result.decision).toBe('allowed')
      expect(result.rule.appRule?.app).toBe('*')
    })
  })

  describe('forbidden rule', () => {
    it('returns "denied" for an explicitly forbidden app', () => {
      const policy = makePolicy(
        [makeAppRule({ app: 'calendar', disposition: 'forbidden' })],
        'allowed'
      )
      const result = evaluatePolicy(policy, 'calendar:events:create', 'write')

      expect(result.decision).toBe('denied')
      expect(result.rule.disposition).toBe('forbidden')
    })

    it('denial reason names the forbidden rule and the exact permission', () => {
      const policy = makePolicy(
        [makeAppRule({ app: 'calendar', disposition: 'forbidden' })],
        'allowed'
      )
      const result = evaluatePolicy(policy, 'calendar:events:delete', 'delete')

      expect(result.reason).toContain('denied')
      expect(result.reason).toContain('calendar:events:delete')
      expect(result.reason).toContain('forbidden')
    })
  })

  describe('read-only rule', () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])

    it('allows a read-class operation', () => {
      const result = evaluatePolicy(policy, 'calendar:events:list', 'read')
      expect(result.decision).toBe('allowed')
      expect(result.rule.disposition).toBe('read-only')
    })

    it('denies a write-class operation (negative)', () => {
      const result = evaluatePolicy(policy, 'calendar:events:create', 'write')
      expect(result.decision).toBe('denied')
    })

    it('denies a delete-class operation (negative)', () => {
      const result = evaluatePolicy(policy, 'calendar:events:delete', 'delete')
      expect(result.decision).toBe('denied')
    })

    it('denies send/execute/system-change operations (negative)', () => {
      for (const risk of ['send', 'execute', 'system-change'] as const) {
        const result = evaluatePolicy(policy, `calendar:app:${risk}`, risk)
        expect(result.decision).toBe('denied')
      }
    })

    it('read-only denial reason explains the read-only constraint', () => {
      const result = evaluatePolicy(policy, 'calendar:events:create', 'write')
      expect(result.reason).toContain('read-only')
      expect(result.reason).toContain('calendar:events:create')
      expect(result.reason.toLowerCase()).toContain('mutates')
    })
  })

  describe('confirm-first rule', () => {
    const policy = makePolicy([makeAppRule({ app: 'mail', disposition: 'confirm-first' })])

    it('returns "confirm-first" (pending-approval signal)', () => {
      const result = evaluatePolicy(policy, 'mail:messages:send', 'send')
      expect(result.decision).toBe('confirm-first')
      expect(result.rule.disposition).toBe('confirm-first')
    })

    it('reason names the gating rule and the exact permission', () => {
      const result = evaluatePolicy(policy, 'mail:messages:send', 'send')
      expect(result.reason).toContain('approval')
      expect(result.reason).toContain('mail:messages:send')
    })

    it('applies confirm-first regardless of risk class', () => {
      // confirm-first gates by declaration, not by read/write split.
      const read = evaluatePolicy(policy, 'mail:messages:list', 'read')
      expect(read.decision).toBe('confirm-first')
    })
  })

  describe('no matching rule → defaultDisposition (fail-closed)', () => {
    it('denies when default is forbidden and no rule matches', () => {
      const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
      const result = evaluatePolicy(policy, 'notes:notes:create', 'write')

      expect(result.decision).toBe('denied')
      expect(result.rule.source).toBe('default')
      expect(result.rule.disposition).toBe('forbidden')
      expect(result.rule.appRule).toBeUndefined()
    })

    it('default-deny reason names the default disposition and the exact permission', () => {
      const policy = makePolicy([])
      const result = evaluatePolicy(policy, 'notes:notes:create', 'write')

      expect(result.reason).toContain('default disposition')
      expect(result.reason).toContain('notes:notes:create')
    })

    it('allows when default is explicitly allowed and no rule matches', () => {
      const policy = makePolicy([], 'allowed')
      const result = evaluatePolicy(policy, 'notes:notes:create', 'write')

      expect(result.decision).toBe('allowed')
      expect(result.rule.source).toBe('default')
    })

    it('empty policy denies everything (fail-closed default)', () => {
      const policy = makePolicy([])
      expect(evaluatePolicy(policy, 'a:b:c', 'read').decision).toBe('denied')
    })
  })

  describe('operation-level overrides', () => {
    it('an operation override wins over the app default', () => {
      const policy = makePolicy([
        makeAppRule({
          app: 'calendar',
          disposition: 'allowed',
          operations: [makeOperationRule('delete', 'forbidden')],
        }),
      ])

      const allowed = evaluatePolicy(policy, 'calendar:events:create', 'write')
      expect(allowed.decision).toBe('allowed')
      expect(allowed.rule.source).toBe('app')

      const denied = evaluatePolicy(policy, 'calendar:events:delete', 'delete')
      expect(denied.decision).toBe('denied')
      expect(denied.rule.source).toBe('operation')
      expect(denied.rule.operationRule?.operation).toBe('delete')
    })

    it('operation override reason names the operation rule', () => {
      const policy = makePolicy([
        makeAppRule({
          app: 'calendar',
          disposition: 'allowed',
          operations: [makeOperationRule('delete', 'forbidden')],
        }),
      ])
      const result = evaluatePolicy(policy, 'calendar:events:delete', 'delete')
      expect(result.reason).toContain('operation rule "calendar:delete"')
    })

    it('an operation wildcard override matches every operation', () => {
      const policy = makePolicy([
        makeAppRule({
          app: 'calendar',
          disposition: 'allowed',
          operations: [makeOperationRule('*', 'read-only')],
        }),
      ])
      // The "*" operation override (read-only) governs every op.
      expect(evaluatePolicy(policy, 'calendar:events:create', 'write').decision).toBe('denied')
      expect(evaluatePolicy(policy, 'calendar:events:list', 'read').decision).toBe('allowed')
    })
  })

  describe('malformed permission strings', () => {
    it.each([
      ['too few segments', 'calendar:events'],
      ['too many segments', 'a:b:c:d'],
      ['empty segment', 'calendar::create'],
      ['empty string', ''],
    ])('denies %s (fail-closed)', (_label, permission) => {
      const policy = makePolicy([makeAppRule({ app: '*', disposition: 'allowed' })], 'allowed')
      const result = evaluatePolicy(policy, permission, 'read')

      expect(result.decision).toBe('denied')
      expect(result.rule.source).toBe('default')
      expect(result.reason).toContain('not a valid')
    })
  })

  describe('rule precedence', () => {
    it('first matching app rule wins (declaration order)', () => {
      const policy = makePolicy([
        makeAppRule({ app: 'calendar', disposition: 'forbidden' }),
        makeAppRule({ app: '*', disposition: 'allowed' }),
      ])
      // calendar matches the first (forbidden) rule, not the later wildcard.
      expect(evaluatePolicy(policy, 'calendar:events:list', 'read').decision).toBe('denied')
      // notes falls through to the wildcard allow.
      expect(evaluatePolicy(policy, 'notes:notes:list', 'read').decision).toBe('allowed')
    })
  })
})

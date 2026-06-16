/**
 * Tests for deterministic risk classification.
 *
 * Expected risk classes are derived by hand from the operation semantics
 * documented in `risk.ts` and VISION.md §7.1 ("Whether it reads, writes,
 * deletes, sends, executes, or changes system state"), NOT from program output.
 *
 * @see ../../../VISION.md (§7.1 Capability registry)
 */

import { describe, expect, it } from 'vitest'
import {
  RISK_CLASSES,
  DEFAULT_RISK,
  classifyRiskFromOperation,
  classifyCommandRisk,
  isRiskClass,
  compareRisk,
  type RiskClass,
} from './risk.js'
import type { Command } from '../manifest/schemas/command.js'

/** Build a minimal resource-scoped command for risk tests. */
function command(name: string, risk?: RiskClass): Command {
  return {
    name,
    description: `${name} operation`,
    scope: 'resource',
    parameters: [],
    ...(risk ? { risk } : {}),
  }
}

describe('classifyRiskFromOperation', () => {
  // Each case below maps an operation name to its spec-mandated risk class.
  const cases: readonly (readonly [operation: string, expected: RiskClass])[] = [
    // read: observation
    ['list', 'read'],
    ['get', 'read'],
    ['show', 'read'],
    ['find', 'read'],
    ['search', 'read'],
    ['listEvents', 'read'],
    ['getEvent', 'read'],
    ['exportNote', 'read'],
    // write: create/mutate persistent state
    ['create', 'write'],
    ['update', 'write'],
    ['createEvent', 'write'],
    ['addAttendee', 'write'],
    ['rename', 'write'],
    ['duplicate', 'write'],
    ['move', 'write'],
    // delete: destruction
    ['delete', 'delete'],
    ['remove', 'delete'],
    ['trash', 'delete'],
    ['purge', 'delete'],
    ['emptyTrash', 'delete'],
    // send: outward transmission
    ['send', 'send'],
    ['sendMessage', 'send'],
    ['email', 'send'],
    ['share', 'send'],
    ['invite', 'send'],
    // `forward` as the leading verb is a genuine outbound transmission
    // (e.g. Mail's `forward` / `forwardMessage` forwards an email outward).
    ['forward', 'send'],
    ['forwardMessage', 'send'],
    // execute: arbitrary code/scripts
    ['doScript', 'execute'],
    ['doJavaScript', 'execute'],
    ['runScript', 'execute'],
    ['evaluate', 'execute'],
    ['compile', 'execute'],
    // system-change: OS / app lifecycle / device state
    ['quit', 'system-change'],
    ['restart', 'system-change'],
    ['relaunch', 'system-change'],
    ['reloadCalendars', 'system-change'],
    ['mount', 'system-change'],
    ['eject', 'system-change'],
    ['sleep', 'system-change'],
    ['setVolume', 'system-change'],
  ]

  it.each(cases)('classifies %s as %s', (operation, expected) => {
    expect(classifyRiskFromOperation(operation)).toBe(expected)
  })

  it('resolves more sensitive intent first when both tokens are present', () => {
    // "createInvite" contains both a write token (create) and a send token
    // (invite). Resolution order ranks `send` ahead of `write`, so the more
    // sensitive intent wins (risk.ts RESOLUTION_ORDER).
    expect(classifyRiskFromOperation('createInvite')).toBe('send')
  })

  it('handles separators and casing identically (do-script === doScript)', () => {
    expect(classifyRiskFromOperation('do-script')).toBe('execute')
    expect(classifyRiskFromOperation('DO_SCRIPT')).toBe('execute')
  })

  // Negative / edge: unknown or ambiguous operations must fail safe.
  it('returns the safe default for an unknown operation', () => {
    expect(classifyRiskFromOperation('frobnicate')).toBe(DEFAULT_RISK)
    expect(DEFAULT_RISK).toBe('execute')
  })

  it('returns the safe default for an empty / symbol-only operation name', () => {
    expect(classifyRiskFromOperation('')).toBe(DEFAULT_RISK)
    expect(classifyRiskFromOperation('---')).toBe(DEFAULT_RISK)
  })
})

describe('classifyRiskFromOperation — navigation verbs are not outbound `send`', () => {
  // Regression for PR #29: a naive substring match treated any operation
  // containing "forward" as `send`, misclassifying navigation verbs. `forward`
  // is meaningful as a leading verb (Mail forwards an email) but as a *direction
  // word* inside a navigation verb it must not imply outbound transmission.
  // `forward` is not a read/write/etc. token, so these fall to the safe default
  // (DEFAULT_RISK = 'execute') rather than being mis-gated as exfiltration.
  const navigationCases: readonly (readonly [operation: string, expected: RiskClass])[] = [
    ['goForward', DEFAULT_RISK], // Arc / Chrome / Edge tab navigation
    ['stepForward', DEFAULT_RISK], // QuickTime Player frame navigation
    ['go-forward', DEFAULT_RISK], // separator-style spelling
    ['GoForward', DEFAULT_RISK], // PascalCase spelling
  ]

  it.each(navigationCases)('classifies %s as %s (NOT send)', (operation, expected) => {
    expect(classifyRiskFromOperation(operation)).toBe(expected)
    expect(classifyRiskFromOperation(operation)).not.toBe('send')
  })
})

describe('classifyRiskFromOperation — predicate-style queries classify as read', () => {
  // Regression for PR #29: predicate-prefixed operations are boolean *queries*
  // (they observe state), so they must classify as `read`, not be mis-gated as
  // `system-change` (via tokens like `enable`/`disable`) or `delete`/`write`.
  const predicateCases: readonly (readonly [operation: string, expected: RiskClass])[] = [
    ['shouldEnableAction', 'read'], // Contacts — boolean query, contains `enable`
    ['canDelete', 'read'], // contains the `delete` token
    ['isRunning', 'read'],
    ['hasUpdate', 'read'], // contains the `update` write token
    ['willSend', 'read'], // contains the `send` token
    ['needsReload', 'read'], // contains the `reload` system-change token
  ]

  it.each(predicateCases)('classifies %s as read', (operation, expected) => {
    expect(classifyRiskFromOperation(operation)).toBe(expected)
  })

  it('does not treat a non-predicate leading token as a predicate (cancel ≠ can)', () => {
    // `cancel` shares the prefix `can` but tokenizes to a single token `cancel`,
    // which is not the predicate `can`. It must not be forced to `read`.
    expect(classifyRiskFromOperation('cancel')).not.toBe('read')
  })

  it('still classifies genuine enable/disable lifecycle ops as system-change', () => {
    // The predicate guard must not weaken real `enableX` / `disableX` ops.
    expect(classifyRiskFromOperation('enableExtension')).toBe('system-change')
    expect(classifyRiskFromOperation('disableNotifications')).toBe('system-change')
  })
})

describe('classifyCommandRisk', () => {
  it('derives risk from the operation name when no override is present', () => {
    expect(classifyCommandRisk(command('createEvent'))).toBe('write')
    expect(classifyCommandRisk(command('list'))).toBe('read')
  })

  it('honors a valid manifest-level override over the derived value', () => {
    // `list` would derive to `read`, but the manifest pins it to `system-change`.
    const overridden = command('list', 'system-change')
    expect(classifyCommandRisk(overridden)).toBe('system-change')
  })

  it('falls back to derivation when the override field is absent', () => {
    expect(classifyCommandRisk(command('deleteEvent'))).toBe('delete')
  })
})

describe('isRiskClass', () => {
  it('accepts every canonical risk class', () => {
    for (const cls of RISK_CLASSES) {
      expect(isRiskClass(cls)).toBe(true)
    }
  })

  it('rejects non-risk values', () => {
    expect(isRiskClass('purge')).toBe(false)
    expect(isRiskClass('READ')).toBe(false)
    expect(isRiskClass(undefined)).toBe(false)
    expect(isRiskClass(42)).toBe(false)
    expect(isRiskClass(null)).toBe(false)
  })
})

describe('compareRisk', () => {
  it('orders read as least sensitive and system-change as most sensitive', () => {
    expect(compareRisk('read', 'system-change')).toBeLessThan(0)
    expect(compareRisk('system-change', 'read')).toBeGreaterThan(0)
    expect(compareRisk('delete', 'delete')).toBe(0)
  })
})

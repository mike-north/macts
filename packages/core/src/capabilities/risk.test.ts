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
    ['forward', 'send'],
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

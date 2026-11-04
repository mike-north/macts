/**
 * Runtime tests for structured audit records.
 *
 * Expected values are derived by hand from issue #7 ("Every capability call is
 * audit-logged and attributable" — capability, args summary, app, API key,
 * timestamp, decision) and the VISION.md §5.4 audit-log example — never from
 * program output.
 *
 * @see Issue #7 — Trust & Governance: boundaries, permissions, audit.
 * @see VISION.md §5.4 "Stronger auditability".
 * @see phases/13-sdk-value-and-execution-contracts.md (D5: `invalid-input` records)
 */

import { describe, it, expect } from 'vitest'
import {
  createAuditRecord,
  serializeAuditRecord,
  AUDIT_DECISIONS,
  type AuditRecord,
  type AuditRecordInput,
  type GovernedAuditDecision,
  type GovernedAuditRecordInput,
  type InvalidInputAuditRecord,
  type InvalidInputAuditRecordInput,
  type SerializedAuditRecord,
} from './audit.js'

// Fixed, deterministic timestamp (no Date.now()/new Date() without an argument).
const TIMESTAMP = new Date('2026-06-14T10:42:12.000Z')

/** Every decision reached by governance, whose records carry an argument summary. */
const GOVERNED_DECISIONS: readonly GovernedAuditDecision[] = [
  'allowed',
  'denied',
  'pending',
  'approved',
  'rejected',
  'cancelled',
]

/** A fully-specified record input for a call rejected by input validation. */
function invalidInput(
  overrides: Partial<InvalidInputAuditRecordInput> = {}
): InvalidInputAuditRecordInput {
  return {
    capability: 'calendar:events:create',
    app: 'calendar',
    apiKeyId: 'assistant-calendar-writer',
    decision: 'invalid-input',
    timestamp: TIMESTAMP,
    issueCount: 2,
    ...overrides,
  }
}

/**
 * A reusable, fully-specified record input. Individual tests override single
 * fields rather than re-specifying the whole object.
 */
function baseInput(overrides: Partial<GovernedAuditRecordInput> = {}): GovernedAuditRecordInput {
  return {
    capability: 'calendar:events:create',
    app: 'calendar',
    argsSummary: 'Calendar: Work; Summary: Team Meeting; Attendees: 3',
    apiKeyId: 'assistant-calendar-writer',
    decision: 'allowed',
    timestamp: TIMESTAMP,
    ...overrides,
  }
}

describe('createAuditRecord', () => {
  it('captures every spec-required field', () => {
    const record: AuditRecord = createAuditRecord(baseInput())
    // spec (issue #7): capability, args summary, app, API key, timestamp, decision.
    expect(record.capability).toBe('calendar:events:create')
    expect(record.app).toBe('calendar')
    expect(record.argsSummary).toBe('Calendar: Work; Summary: Team Meeting; Attendees: 3')
    expect(record.apiKeyId).toBe('assistant-calendar-writer')
    expect(record.decision).toBe('allowed')
    expect(record.timestamp).toEqual(TIMESTAMP)
  })

  it('omits reason when not provided (exactOptionalPropertyTypes)', () => {
    const record = createAuditRecord(baseInput())
    expect('reason' in record).toBe(false)
  })

  it('includes reason when provided', () => {
    const record = createAuditRecord(
      baseInput({ decision: 'denied', reason: 'out of policy: send forbidden' })
    )
    expect(record.reason).toBe('out of policy: send forbidden')
  })

  it('is deterministic: same input yields equal records', () => {
    const a = createAuditRecord(baseInput())
    const b = createAuditRecord(baseInput())
    expect(a).toEqual(b)
  })

  it('defensively copies the timestamp so later caller mutation cannot affect the record', () => {
    const mutable = new Date('2026-06-14T10:42:12.000Z')
    const record = createAuditRecord(baseInput({ timestamp: mutable }))
    // Mutate the caller's Date after construction.
    mutable.setFullYear(1999)
    // The record must retain the original instant.
    expect(record.timestamp.toISOString()).toBe('2026-06-14T10:42:12.000Z')
  })

  it.each(GOVERNED_DECISIONS)('records the "%s" decision', (decision) => {
    const record = createAuditRecord(baseInput({ decision }))
    expect(record.decision).toBe(decision)
  })
})

describe('serializeAuditRecord', () => {
  it('serializes to a JSON-safe shape with an ISO-8601 timestamp', () => {
    const record = createAuditRecord(baseInput())
    const serialized: SerializedAuditRecord = serializeAuditRecord(record)
    expect(serialized).toEqual({
      capability: 'calendar:events:create',
      app: 'calendar',
      argsSummary: 'Calendar: Work; Summary: Team Meeting; Attendees: 3',
      apiKeyId: 'assistant-calendar-writer',
      decision: 'allowed',
      timestamp: '2026-06-14T10:42:12.000Z',
    } satisfies SerializedAuditRecord)
  })

  it('omits reason from the serialized form when absent', () => {
    const serialized = serializeAuditRecord(createAuditRecord(baseInput()))
    expect('reason' in serialized).toBe(false)
  })

  it('includes reason in the serialized form when present', () => {
    const serialized = serializeAuditRecord(
      createAuditRecord(baseInput({ decision: 'rejected', reason: 'user declined' }))
    )
    expect(serialized.reason).toBe('user declined')
    expect(serialized.decision).toBe('rejected')
  })

  it('round-trips losslessly through JSON', () => {
    const record = createAuditRecord(baseInput({ reason: 'approved by operator' }))
    const json = JSON.stringify(serializeAuditRecord(record))
    const parsed = JSON.parse(json) as SerializedAuditRecord
    expect(parsed).toEqual({
      capability: 'calendar:events:create',
      app: 'calendar',
      argsSummary: 'Calendar: Work; Summary: Team Meeting; Attendees: 3',
      apiKeyId: 'assistant-calendar-writer',
      decision: 'allowed',
      timestamp: '2026-06-14T10:42:12.000Z',
      reason: 'approved by operator',
    })
  })

  it('exposes the canonical decision set', () => {
    // spec: allowed (ran), denied (policy), pending (confirm-first, withheld),
    // approved (human ok), rejected (human no), cancelled (the caller abandoned
    // a held call before any decision), invalid-input (rejected by input
    // validation before governance).
    expect(AUDIT_DECISIONS).toEqual([
      'allowed',
      'denied',
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'invalid-input',
    ])
  })
})

describe('invalid-input records', () => {
  // phases/13 D5: a call rejected by input validation is audited with its
  // operation, key, time, and the number of validation issues, and with no
  // argument values, argument summary, or issue messages.
  it('carries attribution and the issue count, and nothing else', () => {
    const record: InvalidInputAuditRecord = createAuditRecord(invalidInput())
    expect(record).toEqual({
      capability: 'calendar:events:create',
      app: 'calendar',
      apiKeyId: 'assistant-calendar-writer',
      decision: 'invalid-input',
      timestamp: TIMESTAMP,
      issueCount: 2,
    })
    expect('argsSummary' in record).toBe(false)
  })

  it('serializes without a summary, reason, or correlation id', () => {
    expect(serializeAuditRecord(createAuditRecord(invalidInput()))).toEqual({
      capability: 'calendar:events:create',
      app: 'calendar',
      apiKeyId: 'assistant-calendar-writer',
      decision: 'invalid-input',
      timestamp: '2026-06-14T10:42:12.000Z',
      issueCount: 2,
    } satisfies SerializedAuditRecord)
  })

  it('round-trips losslessly through JSON', () => {
    const json = JSON.stringify(serializeAuditRecord(createAuditRecord(invalidInput())))
    expect(JSON.parse(json)).toEqual({
      capability: 'calendar:events:create',
      app: 'calendar',
      apiKeyId: 'assistant-calendar-writer',
      decision: 'invalid-input',
      timestamp: '2026-06-14T10:42:12.000Z',
      issueCount: 2,
    })
  })

  it.each([
    ['an argument summary', { argsSummary: 'title: Groceries' }],
    ['a reason', { reason: 'title: Expected string, received number' }],
    ['a correlation id', { approvalId: 'approval-1' }],
  ])('refuses to construct a record carrying %s', (_label, extra) => {
    // A cast stands in for a caller outside the type system (plain JavaScript,
    // or data that was never checked).
    const input = { ...invalidInput(), ...extra } as unknown as AuditRecordInput
    expect(() => createAuditRecord(input)).toThrow(TypeError)
  })

  it.each([
    ['an argument summary', { argsSummary: 'title: Groceries' }],
    ['a reason', { reason: 'title: Expected string, received number' }],
    ['a correlation id', { approvalId: 'approval-1' }],
  ])('refuses to serialize a record carrying %s', (_label, extra) => {
    const record = { ...createAuditRecord(invalidInput()), ...extra } as unknown as AuditRecord
    expect(() => serializeAuditRecord(record)).toThrow(TypeError)
  })

  it.each([
    ['a negative count', -1],
    ['a fractional count', 1.5],
    ['a non-finite count', Number.POSITIVE_INFINITY],
  ])('refuses %s of issues', (_label, issueCount) => {
    expect(() => createAuditRecord(invalidInput({ issueCount }))).toThrow(TypeError)
  })

  it('leaves the governed decisions unchanged', () => {
    for (const decision of GOVERNED_DECISIONS) {
      expect(serializeAuditRecord(createAuditRecord(baseInput({ decision })))).toEqual({
        capability: 'calendar:events:create',
        app: 'calendar',
        argsSummary: 'Calendar: Work; Summary: Team Meeting; Attendees: 3',
        apiKeyId: 'assistant-calendar-writer',
        decision,
        timestamp: '2026-06-14T10:42:12.000Z',
      })
    }
  })
})

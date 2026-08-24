/**
 * Tests for call-time governance enforcement (the audit-writing wrapper around
 * the evaluator).
 *
 * The decision semantics (allow/deny/confirm-first, read-only, fail-closed,
 * malformed-permission handling) are covered exhaustively in
 * `./evaluator.test.ts`. This suite focuses on enforcement-specific behavior:
 *
 * AC3: confirm-first surfaces a `'pending-approval'` outcome.
 * AC4: every decision (allow / deny / pending) writes exactly one audit record,
 *      with the correct decision, attribution, redacted args, fixed timestamp,
 *      and reason.
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { describe, expect, it } from 'vitest'
import { enforceCall, recordApprovalDecision } from './enforcement.js'
import type { EnforceCallOptions, CallAuditContext } from './enforcement.js'
import type { ApprovalOutcome } from './approval.js'
import type { AuditRecord } from './audit.js'
import type { AuditWriter } from './writer.js'
import {
  FIXED_TIMESTAMP,
  makeAppRule,
  makeOperationRule,
  makePolicy,
} from './policy-test-fixtures.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** An audit context with fixed, deterministic values. */
const baseAudit: CallAuditContext = {
  apiKeyId: 'test-key-001',
  argsSummary: 'calendar: Work; summary: Team standup',
  timestamp: FIXED_TIMESTAMP,
}

/** A human approval, as the gate would normalize it. */
const APPROVED_OUTCOME: ApprovalOutcome = {
  approved: true,
  state: 'approved',
  reason: 'Approved by a human.',
  auditReason: 'Approved by a human.',
}

/** Capture written audit records for assertion, without real I/O. */
function makeCapturingWriter(): { writer: AuditWriter; records: AuditRecord[] } {
  const records: AuditRecord[] = []
  const writer: AuditWriter = {
    append(record: AuditRecord): Promise<void> {
      records.push(record)
      return Promise.resolve()
    },
  }
  return { writer, records }
}

/** Build the minimal options for enforceCall. */
function makeOpts(
  overrides: Partial<EnforceCallOptions> & Pick<EnforceCallOptions, 'policy' | 'permission'>
): EnforceCallOptions {
  return {
    risk: 'read',
    audit: baseAudit,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Outcome mapping
// ---------------------------------------------------------------------------

describe('enforceCall outcome mapping', () => {
  it('allows an in-policy call', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write' })
    )
    expect(decision.outcome).toBe('allowed')
    expect(decision.evaluation.decision).toBe('allowed')
  })

  it('denies an out-of-policy call with a reason naming the permission', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'notes:notes:create', risk: 'write' })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.reason).toContain('notes:notes:create')
    expect(decision.reason).toContain('denied')
  })

  it('denies a mutating call under a read-only rule (negative)', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write' })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.reason).toContain('read-only')
  })

  it('allows a read call under a read-only rule', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:list', risk: 'read' })
    )
    expect(decision.outcome).toBe('allowed')
  })

  it('surfaces pending-approval for a confirm-first rule', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'confirm-first' })])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write' })
    )
    expect(decision.outcome).toBe('pending-approval')
    expect(decision.reason).toContain('approval')
  })

  it('denies via the fail-closed default when no rule matches', async () => {
    const policy = makePolicy([])
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:list', risk: 'read' })
    )
    expect(decision.outcome).toBe('denied')
  })

  it('denies a malformed permission (fail-closed)', async () => {
    const policy = makePolicy([makeAppRule({ app: '*', disposition: 'allowed' })], 'allowed')
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'not-a-permission', risk: 'read' })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.reason).toContain('not a valid')
  })

  it('honors an operation-level override (delete forbidden under an allowed app)', async () => {
    const policy = makePolicy([
      makeAppRule({
        app: '*',
        disposition: 'allowed',
        operations: [makeOperationRule('delete', 'forbidden')],
      }),
    ])
    const allowed = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write' })
    )
    expect(allowed.outcome).toBe('allowed')

    const denied = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:delete', risk: 'delete' })
    )
    expect(denied.outcome).toBe('denied')
  })
})

// ---------------------------------------------------------------------------
// Audit writing
// ---------------------------------------------------------------------------

describe('enforceCall audit writing', () => {
  it('writes exactly one audit record per call', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:list', risk: 'read', writer })
    )

    expect(records).toHaveLength(1)
  })

  it('records an "allowed" decision with attribution, args, and fixed timestamp', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write', writer })
    )

    const record = records[0]
    expect(record).toBeDefined()
    expect(record?.decision).toBe('allowed')
    expect(record?.capability).toBe('calendar:events:create')
    expect(record?.app).toBe('calendar')
    expect(record?.apiKeyId).toBe('test-key-001')
    expect(record?.argsSummary).toBe('calendar: Work; summary: Team standup')
    expect(record?.timestamp).toEqual(FIXED_TIMESTAMP)
    expect(record?.reason).toContain('allowed')
  })

  it('records a "denied" decision with the denial reason', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'read-only' })])
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write', writer })
    )

    const record = records[0]
    expect(record?.decision).toBe('denied')
    expect(record?.reason).toContain('read-only')
    expect(record?.reason).toContain('calendar:events:create')
  })

  it('records a pending-approval (confirm-first) decision', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'confirm-first' })])
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:create', risk: 'write', writer })
    )

    const record = records[0]
    expect(record).toBeDefined()
    // A confirm-first call records the dedicated 'pending' decision — NOT
    // 'denied' (it is a deferral, not a policy block) and NOT 'approved' (no
    // human has approved it yet).
    expect(record?.decision).toBe('pending')
    // The pending call did not proceed; the reason marks it as awaiting approval.
    expect(record?.reason).toContain('approval')
  })

  it('does not write any record when no writer is supplied', async () => {
    const policy = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])
    // No writer → returns a decision without throwing; nothing to capture.
    const decision = await enforceCall(
      makeOpts({ policy, permission: 'calendar:events:list', risk: 'read' })
    )
    expect(decision.outcome).toBe('allowed')
  })

  it('derives the app segment for the audit record even on a malformed permission', async () => {
    const policy = makePolicy([], 'forbidden')
    const { writer, records } = makeCapturingWriter()

    await enforceCall(makeOpts({ policy, permission: 'weird', risk: 'read', writer }))

    const record = records[0]
    expect(record?.capability).toBe('weird')
    expect(record?.app).toBe('weird')
    expect(record?.decision).toBe('denied')
  })

  // Regression: a permission whose first segment is empty (e.g. ':a:b') must not
  // produce an empty `app` in the audit record — an empty app is ambiguous and
  // loses attribution. Fall back to the full permission string.
  it('falls back to the full permission when the first segment is empty (":a:b")', async () => {
    const policy = makePolicy([], 'forbidden')
    const { writer, records } = makeCapturingWriter()

    await enforceCall(makeOpts({ policy, permission: ':a:b', risk: 'read', writer }))

    const record = records[0]
    expect(record?.capability).toBe(':a:b')
    expect(record?.app).toBe(':a:b')
    expect(record?.app).not.toBe('')
  })

  // Regression: an empty permission string must not yield an empty `app`; it
  // records the explicit '<unknown>' sentinel instead of a blank field.
  it('marks the app "<unknown>" for an empty permission string ("")', async () => {
    const policy = makePolicy([], 'forbidden')
    const { writer, records } = makeCapturingWriter()

    await enforceCall(makeOpts({ policy, permission: '', risk: 'read', writer }))

    const record = records[0]
    expect(record?.capability).toBe('')
    expect(record?.app).toBe('<unknown>')
    expect(record?.app).not.toBe('')
  })
})

// ---------------------------------------------------------------------------
// Two-record approval protocol
// ---------------------------------------------------------------------------

describe('approval correlation id', () => {
  const CONFIRM_FIRST = makePolicy([makeAppRule({ app: 'calendar', disposition: 'confirm-first' })])
  const ALLOWED = makePolicy([makeAppRule({ app: 'calendar', disposition: 'allowed' })])

  it('records the correlation id on a withheld (pending) call', async () => {
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({
        policy: CONFIRM_FIRST,
        permission: 'calendar:events:create',
        risk: 'write',
        writer,
        audit: { ...baseAudit, approvalId: 'req-abc' },
      })
    )

    expect(records[0]?.decision).toBe('pending')
    expect(records[0]?.approvalId).toBe('req-abc')
  })

  it('omits the correlation id on a call that never raises an approval request', async () => {
    const { writer, records } = makeCapturingWriter()

    await enforceCall(
      makeOpts({
        policy: ALLOWED,
        permission: 'calendar:events:list',
        risk: 'read',
        writer,
        audit: { ...baseAudit, approvalId: 'req-abc' },
      })
    )

    expect(records[0]?.decision).toBe('allowed')
    expect(records[0]?.approvalId).toBeUndefined()
  })

  it('pairs the pending and terminal records of one held call', async () => {
    const { writer, records } = makeCapturingWriter()
    const audit = { ...baseAudit, approvalId: 'req-abc' }

    await enforceCall(
      makeOpts({
        policy: CONFIRM_FIRST,
        permission: 'calendar:events:create',
        risk: 'write',
        writer,
        audit,
      })
    )
    await recordApprovalDecision({
      permission: 'calendar:events:create',
      outcome: APPROVED_OUTCOME,
      audit,
      writer,
    })

    expect(records.map((r) => r.decision)).toEqual(['pending', 'approved'])
    expect(records[0]?.approvalId).toBe('req-abc')
    expect(records[1]?.approvalId).toBe('req-abc')
  })

  // Two identical overlapping calls from the same key are otherwise
  // indistinguishable: same capability, requester, args summary, and (at this
  // resolution) timestamp.
  it('keeps overlapping identical calls distinguishable', async () => {
    const { writer, records } = makeCapturingWriter()
    const first = { ...baseAudit, approvalId: 'req-1' }
    const second = { ...baseAudit, approvalId: 'req-2' }

    await Promise.all([
      enforceCall(
        makeOpts({
          policy: CONFIRM_FIRST,
          permission: 'calendar:events:create',
          risk: 'write',
          writer,
          audit: first,
        })
      ),
      enforceCall(
        makeOpts({
          policy: CONFIRM_FIRST,
          permission: 'calendar:events:create',
          risk: 'write',
          writer,
          audit: second,
        })
      ),
    ])
    await recordApprovalDecision({
      permission: 'calendar:events:create',
      outcome: APPROVED_OUTCOME,
      audit: second,
      writer,
    })

    const terminal = records.find((r) => r.decision === 'approved')
    expect(terminal?.approvalId).toBe('req-2')
    expect(
      records
        .filter((r) => r.decision === 'pending')
        .map((r) => r.approvalId)
        .sort()
    ).toEqual(['req-1', 'req-2'])
  })
})

describe('recordApprovalDecision', () => {
  it('records an approval as "approved"', async () => {
    const { writer, records } = makeCapturingWriter()

    const decision = await recordApprovalDecision({
      permission: 'calendar:events:create',
      outcome: APPROVED_OUTCOME,
      audit: baseAudit,
      writer,
    })

    expect(decision).toBe('approved')
    expect(records[0]?.decision).toBe('approved')
    expect(records[0]?.app).toBe('calendar')
    expect(records[0]?.apiKeyId).toBe('test-key-001')
    expect(records[0]?.timestamp).toEqual(FIXED_TIMESTAMP)
  })

  it.each([
    ['a human declined', 'rejected'],
    ['nobody answered', 'timeout'],
  ] as const)('records %s as "rejected"', async (_label, state) => {
    const { writer, records } = makeCapturingWriter()

    const decision = await recordApprovalDecision({
      permission: 'calendar:events:create',
      outcome: {
        approved: false,
        state,
        reason: 'client-safe',
        auditReason: 'operator-only detail',
      },
      audit: baseAudit,
      writer,
    })

    expect(decision).toBe('rejected')
    expect(records[0]?.decision).toBe('rejected')
  })

  // The trail is the place for full detail; the client-safe reason is what a
  // caller sees and would hide the cause from an operator.
  it('records the operator-only audit reason, not the client-safe one', async () => {
    const { writer, records } = makeCapturingWriter()

    await recordApprovalDecision({
      permission: 'calendar:events:create',
      outcome: {
        approved: false,
        state: 'rejected',
        reason: 'Approval could not be obtained (provider-error).',
        auditReason: 'Approval provider "acme" failed: ECONNREFUSED relay.example:443',
        failure: 'provider-error',
      },
      audit: baseAudit,
      writer,
    })

    expect(records[0]?.reason).toContain('ECONNREFUSED')
    expect(records[0]?.reason).not.toContain('client-safe')
  })

  // A writer that throws must propagate: the caller has to be able to deny a
  // call whose approval it could not durably record.
  it('propagates a writer failure instead of reporting success', async () => {
    const writer: AuditWriter = {
      append: () => Promise.reject(new Error('audit disk full')),
    }

    await expect(
      recordApprovalDecision({
        permission: 'calendar:events:create',
        outcome: APPROVED_OUTCOME,
        audit: baseAudit,
        writer,
      })
    ).rejects.toThrow('audit disk full')
  })
})

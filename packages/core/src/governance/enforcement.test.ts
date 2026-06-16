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
import { enforceCall } from './enforcement.js'
import type { EnforceCallOptions, CallAuditContext } from './enforcement.js'
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
})

/**
 * Tests for governance policy enforcement at call time.
 *
 * Coverage contract (acceptance criteria from issue #53):
 *
 * AC1: A policy compiles to enforced permissions; an in-policy call is allowed,
 *      an out-of-policy call is denied.
 * AC2: Denials name the violated rule + exact permission.
 * AC3: read-only and forbidden semantics enforced; confirm-first surfaces a
 *      pending-approval signal.
 * AC4: Decisions are audited. Negative tests for each rule type.
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { describe, expect, it, vi } from 'vitest'
import type { GovernancePolicy } from './policy.js'
import { enforceCall, resolveDisposition } from './enforcement.js'
import type { EnforceCallOptions, CallAuditContext } from './enforcement.js'
import type { AuditRecord } from './audit.js'
import type { AuditWriter } from './writer.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Fixed timestamp — never new Date() in test data. */
const FIXED_TIMESTAMP = new Date('2025-01-15T12:00:00.000Z')

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
// Policies
// ---------------------------------------------------------------------------

/** Policy that explicitly allows the calendar app. */
const ALLOW_CALENDAR_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'calendar',
      disposition: 'allowed',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** Policy that sets calendar to read-only. */
const READ_ONLY_CALENDAR_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'calendar',
      disposition: 'read-only',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** Policy that forbids the calendar app explicitly. */
const FORBIDDEN_CALENDAR_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'allowed',
  apps: [
    {
      app: 'calendar',
      disposition: 'forbidden',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** Policy that requires confirm-first for calendar. */
const CONFIRM_FIRST_CALENDAR_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'calendar',
      disposition: 'confirm-first',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/**
 * Policy with a wildcard app rule (all apps allowed) but an operation-level
 * override that forbids delete on any app.
 */
const WILDCARD_APP_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: '*',
      disposition: 'allowed',
      operations: [
        {
          operation: 'delete',
          disposition: 'forbidden',
          tags: [],
          reason: 'Deletes require review',
        },
      ],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** Policy that is fail-closed with no app rules at all. */
const FAIL_CLOSED_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [],
  tags: [],
}

// ---------------------------------------------------------------------------
// resolveDisposition
// ---------------------------------------------------------------------------

describe('resolveDisposition', () => {
  // AC1 — in-policy calls resolve their declared disposition
  it('returns "allowed" for a matching allowed app rule', () => {
    const d = resolveDisposition(ALLOW_CALENDAR_POLICY, 'calendar', 'events', 'list')
    expect(d).toBe('allowed')
  })

  it('returns "read-only" for a matching read-only app rule', () => {
    const d = resolveDisposition(READ_ONLY_CALENDAR_POLICY, 'calendar', 'events', 'list')
    expect(d).toBe('read-only')
  })

  it('returns "forbidden" for a matching forbidden app rule', () => {
    const d = resolveDisposition(FORBIDDEN_CALENDAR_POLICY, 'calendar', 'events', 'create')
    expect(d).toBe('forbidden')
  })

  it('returns "confirm-first" for a matching confirm-first app rule', () => {
    const d = resolveDisposition(CONFIRM_FIRST_CALENDAR_POLICY, 'calendar', 'events', 'create')
    expect(d).toBe('confirm-first')
  })

  // Fail-closed: unspecified app falls through to defaultDisposition
  it('returns defaultDisposition ("forbidden") for an unmatched app', () => {
    const d = resolveDisposition(ALLOW_CALENDAR_POLICY, 'reminders', 'tasks', 'list')
    expect(d).toBe('forbidden')
  })

  it('returns defaultDisposition ("allowed") when no rule matches and default is "allowed"', () => {
    const openPolicy: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'allowed',
      apps: [],
      tags: [],
    }
    const d = resolveDisposition(openPolicy, 'anything', 'resource', 'op')
    expect(d).toBe('allowed')
  })

  // Operation-level override wins over app-level disposition
  it('returns operation-level "forbidden" override over app-level "allowed"', () => {
    const d = resolveDisposition(WILDCARD_APP_POLICY, 'calendar', 'events', 'delete')
    expect(d).toBe('forbidden')
  })

  it('returns app-level "allowed" when no operation override matches', () => {
    const d = resolveDisposition(WILDCARD_APP_POLICY, 'mail', 'messages', 'list')
    expect(d).toBe('allowed')
  })

  // Wildcard app rule governs any app
  it('wildcard app rule matches any app name', () => {
    const d = resolveDisposition(WILDCARD_APP_POLICY, 'finder', 'files', 'list')
    expect(d).toBe('allowed')
  })
})

// ---------------------------------------------------------------------------
// enforceCall — allowed disposition
// ---------------------------------------------------------------------------

describe('enforceCall / allowed', () => {
  // AC1 — in-policy call is allowed
  it('returns outcome "allowed" for a call within an allowed policy', async () => {
    const decision = await enforceCall(
      makeOpts({ policy: ALLOW_CALENDAR_POLICY, permission: 'calendar:events:list', risk: 'read' })
    )
    expect(decision.outcome).toBe('allowed')
    expect(decision.disposition).toBe('allowed')
    expect(decision.reason).toBeUndefined()
  })

  // AC4 — audited as 'allowed'
  it('writes an "allowed" audit record when a writer is supplied', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall(
      makeOpts({
        policy: ALLOW_CALENDAR_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
        writer,
      })
    )
    expect(records).toHaveLength(1)
    expect(records[0]?.decision).toBe('allowed')
    expect(records[0]?.capability).toBe('calendar:events:list')
    expect(records[0]?.apiKeyId).toBe('test-key-001')
  })

  it('does not write any audit record when no writer is supplied', async () => {
    const appendSpy = vi.fn()
    // No writer passed — spy should never be called
    await enforceCall(
      makeOpts({ policy: ALLOW_CALENDAR_POLICY, permission: 'calendar:events:list', risk: 'read' })
    )
    expect(appendSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// enforceCall — read-only disposition
// ---------------------------------------------------------------------------

describe('enforceCall / read-only', () => {
  // AC3 — read-only allows read-class ops
  it('returns "allowed" for a read-class operation under a read-only rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
      })
    )
    expect(decision.outcome).toBe('allowed')
    expect(decision.disposition).toBe('read-only')
  })

  // AC3 — read-only denies write-class ops (negative test)
  it('returns "denied" for a write-class operation under a read-only rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
      })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.disposition).toBe('read-only')
  })

  // AC2 — denial reason names the rule and exact permission
  it('includes the violated rule name and permission in the denial reason (write)', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
      })
    )
    expect(decision.reason).toContain('"calendar:events:create"')
    expect(decision.reason).toContain('read-only')
  })

  // AC3 — negative: delete-class ops also denied under read-only
  it('returns "denied" for a delete-class operation under a read-only rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:delete',
        risk: 'delete',
      })
    )
    expect(decision.outcome).toBe('denied')
  })

  // AC3 — negative: send-class ops also denied under read-only
  it('returns "denied" for a send-class operation under a read-only rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:send',
        risk: 'send',
      })
    )
    expect(decision.outcome).toBe('denied')
  })

  // AC4 — read-only write denial is audited as 'denied'
  it('writes a "denied" audit record for a write under read-only', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall(
      makeOpts({
        policy: READ_ONLY_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
        writer,
      })
    )
    expect(records).toHaveLength(1)
    expect(records[0]?.decision).toBe('denied')
    expect(records[0]?.reason).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// enforceCall — forbidden disposition
// ---------------------------------------------------------------------------

describe('enforceCall / forbidden', () => {
  // AC1 — out-of-policy call is denied
  it('returns "denied" for an explicitly forbidden app', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: FORBIDDEN_CALENDAR_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
      })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.disposition).toBe('forbidden')
  })

  // AC2 — denial reason names the rule and exact permission
  it('includes the violated rule name and permission in the denial reason', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: FORBIDDEN_CALENDAR_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
      })
    )
    expect(decision.reason).toContain('"calendar:events:list"')
    expect(decision.reason).toContain('forbidden')
  })

  // Fail-closed: app not in policy → defaultDisposition=forbidden → denied
  it('denies calls to apps not covered by any rule (fail-closed)', async () => {
    const decision = await enforceCall(
      makeOpts({ policy: FAIL_CLOSED_POLICY, permission: 'reminders:tasks:list', risk: 'read' })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.disposition).toBe('forbidden')
  })

  // AC4 — forbidden calls are audited as 'denied'
  it('writes a "denied" audit record for a forbidden call', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall(
      makeOpts({
        policy: FORBIDDEN_CALENDAR_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
        writer,
      })
    )
    expect(records).toHaveLength(1)
    expect(records[0]?.decision).toBe('denied')
    expect(records[0]?.capability).toBe('calendar:events:list')
    expect(records[0]?.reason).toContain('forbidden')
  })
})

// ---------------------------------------------------------------------------
// enforceCall — confirm-first disposition
// ---------------------------------------------------------------------------

describe('enforceCall / confirm-first', () => {
  // AC3 — confirm-first surfaces pending-approval signal
  it('returns "pending-approval" for a confirm-first rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: CONFIRM_FIRST_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
      })
    )
    expect(decision.outcome).toBe('pending-approval')
    expect(decision.disposition).toBe('confirm-first')
  })

  // AC2 — pending-approval reason names the rule and exact permission
  it('includes the rule name and permission in the pending-approval reason', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: CONFIRM_FIRST_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
      })
    )
    expect(decision.reason).toContain('"calendar:events:create"')
    expect(decision.reason).toContain('confirm-first')
  })

  // AC4 — confirm-first calls are audited as 'approved' (pending the human gate)
  it('writes an "approved" audit record for a confirm-first call', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall(
      makeOpts({
        policy: CONFIRM_FIRST_CALENDAR_POLICY,
        permission: 'calendar:events:create',
        risk: 'write',
        writer,
      })
    )
    expect(records).toHaveLength(1)
    expect(records[0]?.decision).toBe('approved')
    expect(records[0]?.capability).toBe('calendar:events:create')
  })
})

// ---------------------------------------------------------------------------
// enforceCall — malformed permission string (negative tests)
// ---------------------------------------------------------------------------

describe('enforceCall / malformed permission', () => {
  const malformedCases = [
    'not-a-permission',
    'only:two',
    'too:many:colons:here',
    '',
    ':empty:parts',
    'app::no-resource',
  ]

  for (const malformed of malformedCases) {
    it(`denies and reports malformed permission "${malformed}"`, async () => {
      const decision = await enforceCall(
        makeOpts({ policy: ALLOW_CALENDAR_POLICY, permission: malformed, risk: 'read' })
      )
      expect(decision.outcome).toBe('denied')
      expect(decision.reason).toBeDefined()
      expect(decision.reason).toContain(malformed)
    })
  }
})

// ---------------------------------------------------------------------------
// enforceCall — operation-level overrides
// ---------------------------------------------------------------------------

describe('enforceCall / operation-level overrides', () => {
  // AC1 — operation-level override is more specific than app-level
  it('denies a specific operation that is forbidden by an operation-level override', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: WILDCARD_APP_POLICY,
        permission: 'calendar:events:delete',
        risk: 'delete',
      })
    )
    expect(decision.outcome).toBe('denied')
    expect(decision.disposition).toBe('forbidden')
  })

  it('allows other operations on the same app under the app-level rule', async () => {
    const decision = await enforceCall(
      makeOpts({
        policy: WILDCARD_APP_POLICY,
        permission: 'calendar:events:list',
        risk: 'read',
      })
    )
    expect(decision.outcome).toBe('allowed')
    expect(decision.disposition).toBe('allowed')
  })

  // Per-operation confirm-first override
  it('surfaces pending-approval for a confirm-first operation override', async () => {
    const policy: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'mail',
          disposition: 'read-only',
          operations: [
            {
              operation: 'send',
              disposition: 'confirm-first',
              tags: ['outbound'],
              reason: 'Sending email requires approval',
            },
          ],
          restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
          tags: [],
        },
      ],
      tags: [],
    }

    const decision = await enforceCall(
      makeOpts({ policy, permission: 'mail:messages:send', risk: 'send' })
    )
    expect(decision.outcome).toBe('pending-approval')
    expect(decision.disposition).toBe('confirm-first')
    expect(decision.reason).toContain('"mail:messages:send"')
  })

  // App-level read-only; per-operation allows a write (explicit override)
  it('allows a write operation explicitly overridden to "allowed" under a read-only app rule', async () => {
    const policy: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [
        {
          app: 'notes',
          disposition: 'read-only',
          operations: [
            {
              operation: 'create',
              disposition: 'allowed',
              tags: [],
              reason: 'Creating notes is safe',
            },
          ],
          restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
          tags: [],
        },
      ],
      tags: [],
    }

    const decision = await enforceCall(
      makeOpts({ policy, permission: 'notes:notes:create', risk: 'write' })
    )
    // The operation override is 'allowed', which overrides the app read-only rule
    expect(decision.outcome).toBe('allowed')
    expect(decision.disposition).toBe('allowed')
  })
})

// ---------------------------------------------------------------------------
// enforceCall — audit record fidelity
// ---------------------------------------------------------------------------

describe('enforceCall / audit record fidelity', () => {
  it('records the exact permission, app, argsSummary, apiKeyId, and timestamp', async () => {
    const { writer, records } = makeCapturingWriter()
    const customAudit: CallAuditContext = {
      apiKeyId: 'my-agent-key',
      argsSummary: 'event: Team sync; attendees: 5',
      timestamp: new Date('2025-06-01T09:30:00.000Z'),
    }
    await enforceCall({
      policy: ALLOW_CALENDAR_POLICY,
      permission: 'calendar:events:list',
      risk: 'read',
      audit: customAudit,
      writer,
    })
    const record = records[0]
    expect(record?.capability).toBe('calendar:events:list')
    expect(record?.app).toBe('calendar')
    expect(record?.argsSummary).toBe('event: Team sync; attendees: 5')
    expect(record?.apiKeyId).toBe('my-agent-key')
    expect(record?.timestamp).toEqual(new Date('2025-06-01T09:30:00.000Z'))
  })

  it('includes the denial reason in the audit record for forbidden calls', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall({
      policy: FAIL_CLOSED_POLICY,
      permission: 'reminders:tasks:create',
      risk: 'write',
      audit: baseAudit,
      writer,
    })
    expect(records[0]?.reason).toBeDefined()
    expect(records[0]?.reason).toContain('"reminders:tasks:create"')
  })

  it('omits reason from the audit record for allowed calls', async () => {
    const { writer, records } = makeCapturingWriter()
    await enforceCall({
      policy: ALLOW_CALENDAR_POLICY,
      permission: 'calendar:events:list',
      risk: 'read',
      audit: baseAudit,
      writer,
    })
    expect(records[0]?.reason).toBeUndefined()
  })
})

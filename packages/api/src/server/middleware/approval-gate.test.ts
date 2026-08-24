/**
 * Integration tests for the human-in-the-loop approval gate inside the
 * governance-enforcement middleware.
 *
 * Drives `requirePolicy` through a real Hono router with a real
 * `confirm-first` {@link GovernancePolicy}, a real file-based `AuditWriter`
 * pointed at a temp directory, and real approval providers — so the assertions
 * cover the actual HTTP contract (status codes and bodies), the actual audit
 * records written to disk, and the actual request payload a provider receives.
 *
 * Every branch that must *not* execute the operation is asserted with a handler
 * spy, so "denied" always means "the underlying operation did not run", not just
 * "the status code looked right".
 *
 * @see https://github.com/mike-north/macts/issues/107
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import type {
  ApiKeyPayload,
  ApprovalDecision,
  ApprovalProvider,
  ApprovalProviderCapabilities,
  ApprovalRequest,
  GovernancePolicy,
} from '@macts/core'
import { createFileAuditWriter, createStaticApprovalProvider } from '@macts/core'
import { requirePolicy, type GovernanceContext } from './governance.js'
import type { GovernanceApprovalDeniedResponse, GovernancePendingResponse } from './governance.js'
import type { AuthVariables } from './auth.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PAYLOAD: ApiKeyPayload = {
  iss: 'macts',
  sub: 'integration-key-001',
  iat: 1_700_000_000,
  name: 'Assistant (calendar)',
  permissions: ['calendar:events:create'],
}

const NO_CAPABILITIES: ApprovalProviderCapabilities = {
  supportsPolicySuggestions: false,
  supportsDistinctRouting: false,
}

/**
 * Short, real approval bound used by the timeout test. The provider under test
 * never resolves, so the only thing racing the bound is the bound itself.
 */
const TIMEOUT_BOUND_MS = 50

/** Policy requiring human confirmation for every calendar operation. */
const CONFIRM_FIRST_CALENDAR: GovernancePolicy = {
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

interface AppHarness {
  readonly app: Hono<{ Variables: AuthVariables }>
  /** True once the underlying operation actually executed. */
  handlerRan(): boolean
}

/**
 * Build a Hono app that stubs auth then mounts the governance middleware for
 * `calendar:events:create` with a spy-able handler.
 */
function makeApp(governance: GovernanceContext): AppHarness {
  let ran = false
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/*', async (c, next) => {
    c.set('apiKeyPayload', PAYLOAD)
    await next()
  })
  app.post(
    '/rpc/call',
    requirePolicy({ permission: 'calendar:events:create', risk: 'write', governance }),
    (c) => {
      ran = true
      return c.json({ ok: true })
    }
  )
  return { app, handlerRan: () => ran }
}

async function call(harness: AppHarness): Promise<Response> {
  return await harness.app.request('/rpc/call', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ summary: 'Standup', password: 'hunter2' }),
  })
}

/** Build a provider from a bare `requestApproval` implementation. */
function makeProvider(
  requestApproval: ApprovalProvider['requestApproval'],
  name = 'test-provider'
): ApprovalProvider {
  return { name, capabilities: NO_CAPABILITIES, requestApproval }
}

/** Read the audit log as a list of decision records. */
async function readAudit(path: string): Promise<Record<string, unknown>[]> {
  const log = await readFile(path, 'utf8')
  return log
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requirePolicy approval gate', () => {
  let dir: string
  let auditPath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-approval-'))
    auditPath = join(dir, 'audit.jsonl')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('hold → approve → execute: releases the call and audits "approved"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer,
      approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
    })

    const res = await call(harness)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(harness.handlerRan()).toBe(true)

    // Two records: the hold, then the human decision that resolved it.
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'approved'])
    expect(records[1]?.['capability']).toBe('calendar:events:create')
    expect(records[1]?.['apiKeyId']).toBe('integration-key-001')
    expect(records[1]?.['argsSummary']).toContain('password: [redacted]')
  })

  it('hold → reject → no-op: 403 with the rejection reason, audits "rejected"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer,
      approvals: {
        provider: createStaticApprovalProvider({ state: 'rejected', reason: 'Not this one' }),
      },
    })

    const res = await call(harness)

    expect(res.status).toBe(403)
    expect(harness.handlerRan()).toBe(false)

    const body = (await res.json()) as GovernanceApprovalDeniedResponse
    expect(body.error.code).toBe('GOVERNANCE_APPROVAL_DENIED')
    expect(body.error.permission).toBe('calendar:events:create')
    expect(body.error.approval).toBe('rejected')
    expect(body.error.message).toBe('Not this one')

    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
    expect(records[1]?.['reason']).toBe('Not this one')
  })

  it('hold → timeout → no-op: 403 reported as a timeout, audited "rejected"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer,
      approvals: {
        // A human who never answers.
        provider: makeProvider(() => new Promise<ApprovalDecision>(() => undefined)),
        // A real (short) bound rather than a faked clock: the audit writer does
        // real file I/O, which a faked `setImmediate` would stall.
        timeoutMs: TIMEOUT_BOUND_MS,
      },
    })

    const res = await call(harness)

    expect(res.status).toBe(403)
    expect(harness.handlerRan()).toBe(false)

    const body = (await res.json()) as GovernanceApprovalDeniedResponse
    // The client learns nobody answered...
    expect(body.error.approval).toBe('timeout')
    expect(body.error.message).toContain('fail-closed')

    // ...while the audit trail uses the existing rejected vocabulary.
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
    expect(String(records[1]?.['reason'])).toContain(`${String(TIMEOUT_BOUND_MS)}ms`)
  })

  it('hold → provider error → no-op: 403 and audits "rejected"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer,
      approvals: {
        provider: makeProvider(() => Promise.reject(new Error('approval relay unreachable'))),
      },
    })

    const res = await call(harness)

    expect(res.status).toBe(403)
    expect(harness.handlerRan()).toBe(false)

    const body = (await res.json()) as GovernanceApprovalDeniedResponse
    expect(body.error.code).toBe('GOVERNANCE_APPROVAL_DENIED')
    expect(body.error.approval).toBe('rejected')
    expect(body.error.message).toContain('approval relay unreachable')

    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
  })

  it('hold → provider returns a malformed decision → no-op: 403 and audits "rejected"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer,
      approvals: {
        // A provider from a newer/incompatible version answering with a state
        // this build does not understand must never be read as approval.
        provider: makeProvider(() =>
          Promise.resolve({ state: 'escalated' } as unknown as ApprovalDecision)
        ),
      },
    })

    const res = await call(harness)

    expect(res.status).toBe(403)
    expect(harness.handlerRan()).toBe(false)

    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
  })

  it('no provider configured → 202 pending, handler withheld, audits only "pending"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const harness = makeApp({ policy: CONFIRM_FIRST_CALENDAR, writer })

    const res = await call(harness)

    expect(res.status).toBe(202)
    expect(harness.handlerRan()).toBe(false)

    const body = (await res.json()) as GovernancePendingResponse
    expect(body.pendingApproval.permission).toBe('calendar:events:create')
    expect(body.pendingApproval.message).toContain('approval')

    // No human was asked, so there is no approved/rejected record to write.
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending'])
  })

  it('fails closed with a 500 when the approval decision cannot be audited', async () => {
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      writer: {
        append: (record) => {
          // The hold is recorded; the human decision is not.
          if (record.decision === 'pending') return Promise.resolve()
          return Promise.reject(new Error('audit disk full'))
        },
      },
      approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
    })

    const res = await call(harness)

    // An approved call with no record of the approval must not execute.
    expect(res.status).toBe(500)
    expect(harness.handlerRan()).toBe(false)
  })

  it('sends the provider a decision-grade request with redacted arguments', async () => {
    let seen: ApprovalRequest | undefined
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      approvals: {
        provider: makeProvider((request) => {
          seen = request
          return Promise.resolve<ApprovalDecision>({ state: 'approved' })
        }),
        timeoutMs: 30_000,
      },
    })

    await call(harness)

    expect(seen).toBeDefined()
    expect(seen?.permission).toBe('calendar:events:create')
    expect(seen?.risk).toBe('write')
    expect(seen?.identity).toEqual({
      apiKeyId: 'integration-key-001',
      apiKeyName: 'Assistant (calendar)',
    })
    // Raw secrets never leave the host: the provider sees the redacted summary.
    expect(seen?.argsSummary).toContain('password: [redacted]')
    expect(seen?.argsSummary).not.toContain('hunter2')
    expect(seen?.reason).toContain('calendar:events:create')
    expect(seen?.rule.disposition).toBe('confirm-first')
    expect(seen?.rule.appRule?.app).toBe('calendar')
    expect(seen?.timeoutMs).toBe(30_000)
    expect(seen?.layer).toBe('host')
    expect(typeof seen?.id).toBe('string')
    expect(seen?.id.length).toBeGreaterThan(0)
  })

  it('defaults the approval timeout when the gate does not set one', async () => {
    let seen: ApprovalRequest | undefined
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      approvals: {
        provider: makeProvider((request) => {
          seen = request
          return Promise.resolve<ApprovalDecision>({ state: 'approved' })
        }),
      },
    })

    await call(harness)

    expect(seen?.timeoutMs).toBe(120_000)
  })

  it('gives each held call its own approval request id', async () => {
    const ids: string[] = []
    const harness = makeApp({
      policy: CONFIRM_FIRST_CALENDAR,
      approvals: {
        provider: makeProvider((request) => {
          ids.push(request.id)
          return Promise.resolve<ApprovalDecision>({ state: 'rejected' })
        }),
      },
    })

    await call(harness)
    await call(harness)

    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('never asks the provider for a call the policy allows outright', async () => {
    let asked = false
    const allowAll: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'allowed',
      apps: [],
      tags: [],
    }
    const harness = makeApp({
      policy: allowAll,
      approvals: {
        provider: makeProvider(() => {
          asked = true
          return Promise.resolve<ApprovalDecision>({ state: 'rejected' })
        }),
      },
    })

    const res = await call(harness)

    expect(res.status).toBe(200)
    expect(asked).toBe(false)
  })

  it('never asks the provider for a call the policy forbids', async () => {
    let asked = false
    const forbidAll: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [],
      tags: [],
    }
    const harness = makeApp({
      policy: forbidAll,
      approvals: {
        provider: makeProvider(() => {
          asked = true
          return Promise.resolve<ApprovalDecision>({ state: 'approved' })
        }),
      },
    })

    const res = await call(harness)

    // A provider must never be able to widen what policy already denied.
    expect(res.status).toBe(403)
    expect(harness.handlerRan()).toBe(false)
    expect(asked).toBe(false)
  })
})

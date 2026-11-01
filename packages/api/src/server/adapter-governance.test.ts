/**
 * HTTP-level tests for governance through the adapter: host policy, the
 * human-in-the-loop approval gate, and per-API-key policies.
 *
 * Each request runs through the assembled server with a real
 * `GovernancePolicy`, a real file-based audit writer in a temp directory (or an
 * in-memory one where only decisions matter), real approval providers, and a
 * real key-policy resolver. The executor is a recording stub, so "denied"
 * always means "the operation did not run". Expected statuses and codes are
 * hand-written from the D5 governance step and the D6 table:
 *
 * - policy denies → 403 `POLICY_DENIED` (`permission`, `layer`)
 * - held with no approval gate → 409 `APPROVAL_PENDING` (`permission`, `layer`)
 * - held and not approved (rejected, timed out, provider failure, unauditable)
 *   → 403 `APPROVAL_REJECTED` (`permission`, `layer`, `state`)
 * - approved → 200
 * - governance cannot be evaluated (unreadable key policy) → 500 `INTERNAL`
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 * @see https://github.com/mike-north/macts/issues/53
 * @see https://github.com/mike-north/macts/issues/107
 * @see https://github.com/mike-north/macts/issues/108
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  ApprovalDecision,
  ApprovalProvider,
  ApprovalRequest,
  AuditRecord,
  AuditWriter,
} from '@macts/core'
import { createFileAuditWriter, createStaticApprovalProvider } from '@macts/core'
import type { Authority } from '@macts/contracts'
import { createKeyPolicyResolver, type GovernanceContext } from '@macts/runtime'
import {
  ALLOW_ALL,
  FORBID_ALL,
  calendarPolicy,
  createFakeVerifier,
  createTestServer,
  errorBody,
  post,
  type TestServer,
} from './test-helpers.js'

const CREATE = 'calendar.events.create'
const LIST = 'calendar.events.list'
const CREATE_BODY = { summary: 'Standup', password: 'hunter2' }

const INTEGRATION_TOKEN = 'macts_sk_integration-token'
const STRICT_TOKEN = 'macts_sk_strict-token'
const PLAIN_TOKEN = 'macts_sk_plain-token'

/** The caller in the host-policy and approval-gate tests. */
const INTEGRATION_KEY: Authority = {
  subject: 'integration-key-001',
  displayName: 'Assistant (calendar)',
  permissions: [
    'calendar:events:list',
    'calendar:events:create',
    'calendar:events:delete',
    'notes:notes:create',
  ],
}
/** A key whose own policy is deliberately stricter than the host policy. */
const STRICT_KEY: Authority = {
  subject: 'key_strict',
  permissions: ['calendar:events:create', 'notes:notes:create'],
}
/** A key with no policy of its own: governed by the host policy alone. */
const PLAIN_KEY: Authority = { subject: 'key_plain', permissions: ['calendar:events:create'] }

/** A server whose fake verifier knows the three governance test keys. */
function server(governance: GovernanceContext): TestServer {
  return createTestServer({
    governance,
    rateLimit: false,
    verifier: createFakeVerifier({
      [INTEGRATION_TOKEN]: INTEGRATION_KEY,
      [STRICT_TOKEN]: STRICT_KEY,
      [PLAIN_TOKEN]: PLAIN_KEY,
    }),
  })
}

/** Read the audit log as a list of decision records. */
async function readAudit(path: string): Promise<Record<string, unknown>[]> {
  const log = await readFile(path, 'utf8')
  return log
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

/** An audit writer that keeps records in memory. */
function memoryWriter(): { writer: AuditWriter; records: AuditRecord[] } {
  const records: AuditRecord[] = []
  return {
    records,
    writer: {
      append: (record) => {
        records.push(record)
        return Promise.resolve()
      },
    },
  }
}

/**
 * A writer that discards records. An approval gate cannot exist without an
 * audit writer, so tests that assert something else still supply one.
 */
const DISCARDING_WRITER: AuditWriter = { append: () => Promise.resolve() }

/** A provider from a bare `requestApproval`. */
function provider(
  requestApproval: ApprovalProvider['requestApproval'],
  supportsDistinctRouting = false
): ApprovalProvider {
  return {
    name: 'test-provider',
    capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting },
    requestApproval,
  }
}

/** A provider that records each request and answers with `decision`. */
function capturingProvider(decision: ApprovalDecision): {
  provider: ApprovalProvider
  requests: ApprovalRequest[]
} {
  const requests: ApprovalRequest[] = []
  return {
    requests,
    provider: provider((request) => {
      requests.push(request)
      return Promise.resolve(decision)
    }, true),
  }
}

let dir: string
let auditPath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'macts-adapter-gov-'))
  auditPath = join(dir, 'audit.jsonl')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('host policy', () => {
  it('runs an in-policy call and audits "allowed" with redacted arguments', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('allowed'),
      writer: createFileAuditWriter(auditPath),
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
    const [record] = await readAudit(auditPath)
    expect(record?.['decision']).toBe('allowed')
    expect(record?.['capability']).toBe('calendar:events:create')
    expect(record?.['apiKeyId']).toBe('integration-key-001')
    expect(record?.['argsSummary']).toContain('password: [redacted]')
  })

  it('denies an out-of-policy call with 403 POLICY_DENIED naming the permission', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('allowed'),
      writer: createFileAuditWriter(auditPath),
    })

    // notes is not covered → default forbidden → denied.
    const res = await post(app, 'notes.notes.create', { title: 'x' }, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('POLICY_DENIED')
    expect(body.error.details).toEqual({ permission: 'notes:notes:create', layer: 'host' })
    expect(body.error.message).toContain('notes:notes:create')
    expect(body.error.message).toContain('denied')
    expect(executor.requests).toHaveLength(0)
    const [record] = await readAudit(auditPath)
    expect(record?.['decision']).toBe('denied')
  })

  it('denies a mutating call under a read-only policy', async () => {
    const { app, executor } = server({ policy: calendarPolicy('read-only') })

    const res = await post(app, CREATE, { summary: 'x' }, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    const body = await errorBody(res)
    expect(body.error.code).toBe('POLICY_DENIED')
    expect(body.error.message).toContain('read-only')
    expect(executor.requests).toHaveLength(0)
  })

  it('allows a read call under a read-only policy', async () => {
    const { app } = server({ policy: calendarPolicy('read-only') })

    expect((await post(app, LIST, {}, INTEGRATION_TOKEN)).status).toBe(200)
  })

  it('withholds a confirm-first call with no approval gate: 409 APPROVAL_PENDING, audited "pending"', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
    })

    const res = await post(app, CREATE, { summary: 'x' }, INTEGRATION_TOKEN)

    expect(res.status).toBe(409)
    const body = await errorBody(res)
    expect(body.error.code).toBe('APPROVAL_PENDING')
    expect(body.error.details).toEqual({ permission: 'calendar:events:create', layer: 'host' })
    expect(body.error.message).toContain('approval')
    expect(executor.requests).toHaveLength(0)
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending'])
    expect(records[0]?.['capability']).toBe('calendar:events:create')
  })

  it('allows a delete under the allow-all policy (no-policy default)', async () => {
    const { app } = server({ policy: ALLOW_ALL })

    expect((await post(app, 'calendar.events.delete', {}, INTEGRATION_TOKEN)).status).toBe(200)
  })
})

describe('approval gate', () => {
  it('hold → approve → execute: 200, audits "pending" then "approved"', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'approved'])
    expect(records[1]?.['capability']).toBe('calendar:events:create')
    expect(records[1]?.['apiKeyId']).toBe('integration-key-001')
    expect(records[1]?.['argsSummary']).toContain('password: [redacted]')
  })

  it('hold → reject: 403 APPROVAL_REJECTED with the rejection reason, audits "rejected"', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: {
        provider: createStaticApprovalProvider({ state: 'rejected', reason: 'Not this one' }),
      },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    expect(await res.json()).toEqual({
      error: {
        code: 'APPROVAL_REJECTED',
        message: 'Not this one',
        details: { permission: 'calendar:events:create', layer: 'host', state: 'rejected' },
      },
    })
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
    expect(records[1]?.['reason']).toBe('Not this one')
  })

  it('hold → timeout: 403 APPROVAL_REJECTED with state "timeout", audited "rejected"', async () => {
    const timeoutMs = 50
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      // A human who never answers, under a real short bound (the file writer
      // does real I/O, which faked timers would stall).
      approvals: {
        provider: provider(() => new Promise<ApprovalDecision>(() => undefined)),
        timeoutMs,
      },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    const body = await errorBody(res)
    expect(body.error.code).toBe('APPROVAL_REJECTED')
    expect(body.error.details).toMatchObject({ state: 'timeout' })
    expect(body.error.message).toContain('fail-closed')
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
    expect(String(records[1]?.['reason'])).toContain(`${String(timeoutMs)}ms`)
  })

  it('hold → provider error: 403 rejected, naming only the failure category', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: {
        provider: provider(() => Promise.reject(new Error('approval relay unreachable'))),
      },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    const body = await errorBody(res)
    expect(body.error.code).toBe('APPROVAL_REJECTED')
    expect(body.error.details).toMatchObject({ state: 'rejected' })
    expect(body.error.message).toContain('provider-error')
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
  })

  it('hold → malformed decision: 403 and audited "rejected", never read as approval', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: {
        provider: provider(() =>
          Promise.resolve({ state: 'escalated' } as unknown as ApprovalDecision)
        ),
      },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['pending', 'rejected'])
  })

  it('denies an approved call whose decision cannot be audited', async () => {
    const { app, executor } = server({
      policy: calendarPolicy('confirm-first'),
      writer: {
        append: (record) =>
          record.decision === 'pending'
            ? Promise.resolve()
            : Promise.reject(new Error('audit disk full')),
      },
      approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    const body = await errorBody(res)
    expect(body.error.code).toBe('APPROVAL_REJECTED')
    expect(body.error.details).toMatchObject({ state: 'rejected' })
    expect(body.error.message).toContain('durably recorded')
  })

  it('pairs the pending and terminal audit records with one correlation id', async () => {
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: { provider: createStaticApprovalProvider({ state: 'approved' }) },
    })

    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    const records = await readAudit(auditPath)
    expect(records[0]?.['approvalId']).toBeTypeOf('string')
    expect(records[0]?.['approvalId']).toBe(records[1]?.['approvalId'])
  })

  it('gives overlapping identical held calls distinct correlation ids', async () => {
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: { provider: createStaticApprovalProvider({ state: 'rejected' }) },
    })

    await Promise.all([
      post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN),
      post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN),
    ])

    const records = await readAudit(auditPath)
    expect(records).toHaveLength(4)
    expect(new Set(records.map((r) => r['approvalId'])).size).toBe(2)
  })

  it('gives the provider the same id that correlates the audit records', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: { provider: gate.provider },
    })

    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    const records = await readAudit(auditPath)
    const seenId = gate.requests[0]?.id
    expect(seenId).toBeDefined()
    expect(records[0]?.['approvalId']).toBe(seenId)
    expect(records[1]?.['approvalId']).toBe(seenId)
  })

  it('keeps provider exception detail out of the response but in the audit trail', async () => {
    const leaky =
      'POST https://relay.internal.example/approvals failed: 401 (authorization: Bearer sk-live-abc123)'
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: createFileAuditWriter(auditPath),
      approvals: { provider: provider(() => Promise.reject(new Error(leaky))) },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)
    const text = await res.text()

    expect(text).not.toContain('relay.internal.example')
    expect(text).not.toContain('sk-live-abc123')
    expect(text).toContain('provider-error')
    const records = await readAudit(auditPath)
    expect(String(records[1]?.['reason'])).toContain('relay.internal.example')
  })

  it('sends the provider a decision-grade request with redacted arguments', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: DISCARDING_WRITER,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    const seen = gate.requests[0]
    expect(seen?.permission).toBe('calendar:events:create')
    expect(seen?.risk).toBe('write')
    expect(seen?.identity).toEqual({
      apiKeyId: 'integration-key-001',
      apiKeyName: 'Assistant (calendar)',
    })
    expect(seen?.argsSummary).toContain('password: [redacted]')
    expect(seen?.argsSummary).not.toContain('hunter2')
    expect(seen?.reason).toContain('calendar:events:create')
    expect(seen?.rule.disposition).toBe('confirm-first')
    expect(seen?.rule.appRule?.app).toBe('calendar')
    expect(seen?.timeoutMs).toBe(30_000)
    expect(seen?.layer).toBe('host')
    expect(seen?.id.length).toBeGreaterThan(0)
  })

  it('defaults the approval timeout to two minutes when the gate does not set one', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: DISCARDING_WRITER,
      approvals: { provider: gate.provider },
    })

    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(gate.requests[0]?.timeoutMs).toBe(120_000)
  })

  it('gives each held call its own approval request id', async () => {
    const gate = capturingProvider({ state: 'rejected' })
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: DISCARDING_WRITER,
      approvals: { provider: gate.provider },
    })

    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)
    await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    expect(gate.requests).toHaveLength(2)
    expect(gate.requests[0]?.id).not.toBe(gate.requests[1]?.id)
  })

  it('never asks the provider for a call the policy allows outright', async () => {
    const gate = capturingProvider({ state: 'rejected' })
    const { app } = server({
      policy: ALLOW_ALL,
      writer: DISCARDING_WRITER,
      approvals: { provider: gate.provider },
    })

    expect((await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)).status).toBe(200)
    expect(gate.requests).toHaveLength(0)
  })

  it('never asks the provider for a call the policy forbids', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const { app, executor } = server({
      policy: FORBID_ALL,
      writer: DISCARDING_WRITER,
      approvals: { provider: gate.provider },
    })

    const res = await post(app, CREATE, CREATE_BODY, INTEGRATION_TOKEN)

    // A provider can never widen what policy already denied.
    expect(res.status).toBe(403)
    expect((await errorBody(res)).error.code).toBe('POLICY_DENIED')
    expect(executor.requests).toHaveLength(0)
    expect(gate.requests).toHaveLength(0)
  })
})

describe('per-key policies', () => {
  it('resolves the policy for the key that authenticated this request', async () => {
    const resolved: string[] = []
    const keyPolicies = createKeyPolicyResolver({
      load: (apiKeyId) => {
        resolved.push(apiKeyId)
        return apiKeyId === STRICT_KEY.subject ? calendarPolicy('forbidden') : undefined
      },
    })
    const { app } = server({ policy: calendarPolicy('allowed'), keyPolicies })

    expect((await post(app, CREATE, CREATE_BODY, PLAIN_TOKEN)).status).toBe(200)
    expect((await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)).status).toBe(403)
    expect(resolved).toEqual(['key_plain', 'key_strict'])
  })

  it('does not leak one key’s policy to another through the shared resolver', async () => {
    const keyPolicies = createKeyPolicyResolver({
      load: (apiKeyId) =>
        apiKeyId === STRICT_KEY.subject ? calendarPolicy('forbidden') : calendarPolicy('allowed'),
    })
    const { app } = server({ policy: calendarPolicy('allowed'), keyPolicies })

    // Interleaved and repeated, so a stale single-slot cache would show up.
    expect((await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)).status).toBe(403)
    expect((await post(app, CREATE, CREATE_BODY, PLAIN_TOKEN)).status).toBe(200)
    expect((await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)).status).toBe(403)
    expect((await post(app, CREATE, CREATE_BODY, PLAIN_TOKEN)).status).toBe(200)

    const [strict, plain] = await Promise.all([
      post(app, CREATE, CREATE_BODY, STRICT_TOKEN),
      post(app, CREATE, CREATE_BODY, PLAIN_TOKEN),
    ])
    expect(strict.status).toBe(403)
    expect(plain.status).toBe(200)
  })

  it('host allows, key says confirm-first: 409 from the key layer, never executing', async () => {
    const keyPolicies = createKeyPolicyResolver({
      load: (apiKeyId) =>
        apiKeyId === STRICT_KEY.subject ? calendarPolicy('confirm-first') : undefined,
    })
    const { app, executor } = server({
      policy: calendarPolicy('allowed'),
      writer: createFileAuditWriter(auditPath),
      keyPolicies,
    })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(res.status).toBe(409)
    expect(executor.requests).toHaveLength(0)
    const body = await errorBody(res)
    expect(body.error.code).toBe('APPROVAL_PENDING')
    expect(body.error.details).toEqual({ permission: 'calendar:events:create', layer: 'key' })
    const [record] = await readAudit(auditPath)
    expect(record?.['decision']).toBe('pending')
    expect(record?.['apiKeyId']).toBe('key_strict')
  })

  it('attributes a hold declared by the host policy to the host layer', async () => {
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('allowed') })
    const { app } = server({ policy: calendarPolicy('confirm-first'), keyPolicies })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(res.status).toBe(409)
    expect((await errorBody(res)).error.details).toMatchObject({ layer: 'host' })
  })

  it('host forbids, key says allowed: 403 POLICY_DENIED, never escalated to a hold', async () => {
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('allowed') })
    const { app, executor } = server({
      policy: calendarPolicy('forbidden'),
      writer: createFileAuditWriter(auditPath),
      keyPolicies,
    })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(res.status).toBe(403)
    expect(executor.requests).toHaveLength(0)
    const body = await errorBody(res)
    expect(body.error.code).toBe('POLICY_DENIED')
    expect(body.error.message).toContain('cannot widen the host policy')
    const records = await readAudit(auditPath)
    expect(records.map((r) => r['decision'])).toEqual(['denied'])
  })

  it('denies when the host policy has no matching rule (fail-closed default)', async () => {
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('allowed') })
    const { app } = server({ policy: calendarPolicy('allowed'), keyPolicies })

    // The host policy covers calendar only; notes falls to defaultDisposition.
    const res = await post(app, 'notes.notes.create', {}, STRICT_TOKEN)

    expect(res.status).toBe(403)
    expect((await errorBody(res)).error.code).toBe('POLICY_DENIED')
  })

  it('behaves as host-policy-only enforcement with no key resolver configured', async () => {
    const { app } = server({ policy: calendarPolicy('allowed') })

    expect((await post(app, CREATE, CREATE_BODY, PLAIN_TOKEN)).status).toBe(200)
  })

  it('answers byte-identically for a key with no policy, with or without a resolver', async () => {
    const keyPolicies = createKeyPolicyResolver({ load: () => undefined })
    const withResolver = server({ policy: calendarPolicy('confirm-first'), keyPolicies })
    const withoutResolver = server({ policy: calendarPolicy('confirm-first') })

    const withRes = await post(withResolver.app, CREATE, CREATE_BODY, PLAIN_TOKEN)
    const withoutRes = await post(withoutResolver.app, CREATE, CREATE_BODY, PLAIN_TOKEN)

    expect(withRes.status).toBe(409)
    expect(withRes.status).toBe(withoutRes.status)
    expect(await withRes.text()).toBe(await withoutRes.text())
  })

  it('fails closed with 500 INTERNAL when the key policy cannot be read', async () => {
    const keyPolicies = createKeyPolicyResolver({
      load: () => {
        throw new Error('policy blob is corrupt')
      },
    })
    const { app, executor } = server({ policy: calendarPolicy('allowed'), keyPolicies })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    // The host policy alone would allow this; an unreadable key policy must not
    // silently widen the boundary back to it.
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('policy blob is corrupt')
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe('INTERNAL')
    expect(executor.requests).toHaveLength(0)
  })

  it('routes a key-layer hold to the provider carrying layer "key"', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const keyPolicies = createKeyPolicyResolver({
      load: (apiKeyId) =>
        apiKeyId === STRICT_KEY.subject ? calendarPolicy('confirm-first') : undefined,
    })
    const { app, executor } = server({
      policy: calendarPolicy('allowed'),
      writer: memoryWriter().writer,
      keyPolicies,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(gate.requests).toHaveLength(1)
    expect(gate.requests[0]?.layer).toBe('key')
    expect(gate.requests[0]?.identity.apiKeyId).toBe('key_strict')
    expect(gate.requests[0]?.permission).toBe('calendar:events:create')
    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
  })

  it('routes a host-layer hold to the same provider carrying layer "host"', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('confirm-first') })
    const { app } = server({
      policy: calendarPolicy('confirm-first'),
      writer: memoryWriter().writer,
      keyPolicies,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(gate.requests[0]?.layer).toBe('host')
  })

  it('denies a key-layer hold the human rejected, without running the operation', async () => {
    const gate = capturingProvider({ state: 'rejected', reason: 'not now' })
    const audit = memoryWriter()
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('confirm-first') })
    const { app, executor } = server({
      policy: calendarPolicy('allowed'),
      writer: audit.writer,
      keyPolicies,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(gate.requests[0]?.layer).toBe('key')
    expect(res.status).toBe(403)
    expect((await errorBody(res)).error.details).toEqual({
      permission: 'calendar:events:create',
      layer: 'key',
      state: 'rejected',
    })
    expect(executor.requests).toHaveLength(0)
    expect(audit.records.map((r) => r.decision)).toEqual(['pending', 'rejected'])
  })

  it('never asks the provider when the host policy forbids and the key allows', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const audit = memoryWriter()
    const keyPolicies = createKeyPolicyResolver({ load: () => calendarPolicy('allowed') })
    const { app, executor } = server({
      policy: calendarPolicy('forbidden'),
      writer: audit.writer,
      keyPolicies,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    const res = await post(app, CREATE, CREATE_BODY, STRICT_TOKEN)

    expect(gate.requests).toHaveLength(0)
    expect(res.status).toBe(403)
    expect((await errorBody(res)).error.code).toBe('POLICY_DENIED')
    expect(executor.requests).toHaveLength(0)
    expect(audit.records.map((r) => r.decision)).toEqual(['denied'])
  })

  it('does not ask the provider for a key that has no policy and no host hold', async () => {
    const gate = capturingProvider({ state: 'approved' })
    const keyPolicies = createKeyPolicyResolver({ load: () => undefined })
    const { app } = server({
      policy: calendarPolicy('allowed'),
      writer: memoryWriter().writer,
      keyPolicies,
      approvals: { provider: gate.provider, timeoutMs: 30_000 },
    })

    expect((await post(app, CREATE, CREATE_BODY, PLAIN_TOKEN)).status).toBe(200)
    expect(gate.requests).toHaveLength(0)
  })
})

/**
 * Integration tests for the governance-policy enforcement middleware.
 *
 * Drives the middleware through a real Hono router (as the RPC router wires it),
 * with a real {@link GovernancePolicy} and a real file-based {@link AuditWriter}
 * pointed at a temp directory. Verifies that:
 *
 * - an in-policy call passes through to the handler,
 * - an out-of-policy call is rejected (403) with the human-readable reason,
 * - read-only semantics gate mutating calls,
 * - confirm-first surfaces a pending-approval signal without blocking,
 * - every decision is recorded in the audit log.
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import type { ApiKeyPayload, GovernancePolicy } from '@macts/core'
import { createFileAuditWriter } from '@macts/core'
import { requirePolicy, type GovernanceContext } from './governance.js'
import type { GovernanceDeniedResponse } from './governance.js'
import type { AuthVariables } from './auth.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const PAYLOAD: ApiKeyPayload = {
  iss: 'macts',
  sub: 'integration-key-001',
  iat: 1_700_000_000,
  permissions: ['calendar:events:list', 'calendar:events:create'],
}

/**
 * Build a Hono app that stubs auth (sets the payload) then mounts the
 * governance middleware for a single permission/risk, with a trivial handler.
 */
function makeApp(
  permission: string,
  risk: Parameters<typeof requirePolicy>[0]['risk'],
  governance: GovernanceContext
): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/*', async (c, next) => {
    c.set('apiKeyPayload', PAYLOAD)
    await next()
  })
  app.post('/rpc/call', requirePolicy({ permission, risk, governance }), (c) =>
    c.json({ ok: true })
  )
  return app
}

/** Policy that allows the calendar app outright. */
const ALLOW_CALENDAR: GovernancePolicy = {
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

/** Policy that makes the calendar app read-only. */
const READ_ONLY_CALENDAR: GovernancePolicy = {
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

/** Policy requiring confirmation for the calendar app. */
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requirePolicy integration', () => {
  let dir: string
  let auditPath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-gov-'))
    auditPath = join(dir, 'audit.jsonl')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('passes an in-policy call through to the handler and audits "allowed"', async () => {
    const writer = createFileAuditWriter(auditPath)
    const app = makeApp('calendar:events:create', 'write', { policy: ALLOW_CALENDAR, writer })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary: 'Standup', password: 'hunter2' }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const log = await readFile(auditPath, 'utf8')
    const record = JSON.parse(log.trim()) as Record<string, unknown>
    expect(record['decision']).toBe('allowed')
    expect(record['capability']).toBe('calendar:events:create')
    expect(record['apiKeyId']).toBe('integration-key-001')
    // Sensitive arg redacted in the audit summary.
    expect(record['argsSummary']).toContain('password: [redacted]')
  })

  it('rejects an out-of-policy call with 403 and a reason naming the permission', async () => {
    const writer = createFileAuditWriter(auditPath)
    // notes is not covered → default forbidden → denied.
    const app = makeApp('notes:notes:create', 'write', { policy: ALLOW_CALENDAR, writer })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as GovernanceDeniedResponse
    expect(body.error.code).toBe('GOVERNANCE_DENIED')
    expect(body.error.permission).toBe('notes:notes:create')
    expect(body.error.message).toContain('notes:notes:create')
    expect(body.error.message).toContain('denied')

    const log = await readFile(auditPath, 'utf8')
    const record = JSON.parse(log.trim()) as Record<string, unknown>
    expect(record['decision']).toBe('denied')
  })

  it('denies a mutating call under a read-only policy (read-only semantics)', async () => {
    const app = makeApp('calendar:events:create', 'write', { policy: READ_ONLY_CALENDAR })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary: 'x' }),
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as GovernanceDeniedResponse
    expect(body.error.message).toContain('read-only')
  })

  it('allows a read call under a read-only policy', async () => {
    const app = makeApp('calendar:events:list', 'read', { policy: READ_ONLY_CALENDAR })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
  })

  it('surfaces a pending-approval signal for confirm-first without blocking', async () => {
    const app = makeApp('calendar:events:create', 'write', { policy: CONFIRM_FIRST_CALENDAR })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary: 'x' }),
    })

    // confirm-first does not block today (issue #54 owns the gate); it surfaces
    // a header so the pending state is observable.
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Macts-Governance')).toBe('pending-approval')
  })

  it('defaults to allow-all when given the empty/allow-all policy (no-policy default)', async () => {
    const allowAll: GovernancePolicy = {
      version: '1',
      defaultDisposition: 'allowed',
      apps: [],
      tags: [],
    }
    const app = makeApp('anything:goes:here', 'delete', { policy: allowAll })

    const res = await app.request('/rpc/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
  })
})

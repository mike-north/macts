/**
 * Integration tests for per-API-key governance policy in the enforcement
 * middleware.
 *
 * Drives the real middleware through a real Hono router with a real
 * {@link KeyPolicyResolver} and a real file-based audit writer, so the whole
 * per-request path is exercised: authenticate → resolve *this key's* policy →
 * compose with the host policy → enforce.
 *
 * Coverage contract (acceptance criteria from issue #108):
 *
 * - The governance context is resolved per request from `apiKeyPayload.sub`, and
 *   two keys with different policies handled by the same router (and the same
 *   resolver) never see each other's policy.
 * - Canonical negative #1: host allows, key says `confirm-first` → 202, the
 *   handler never runs.
 * - Canonical negative #2: host forbids, key says `allowed` → 403, never 202 —
 *   the call is denied outright rather than escalated to an approval request.
 * - A key with no policy behaves exactly as before per-key policies existed.
 * - A confirm-first hold reports which layer produced it.
 * - An unreadable key policy fails the request closed rather than falling back
 *   to the host policy alone.
 *
 * @see https://github.com/mike-north/macts/issues/108
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import type { ApiKeyPayload, GovernancePolicy, PolicyDisposition } from '@macts/core'
import { createFileAuditWriter } from '@macts/core'
import { requirePolicy, type GovernanceContext } from './governance.js'
import type { GovernanceDeniedResponse, GovernancePendingResponse } from './governance.js'
import { createKeyPolicyResolver } from '../governance/key-policy.js'
import type { AuthVariables } from './auth.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A key whose policy is deliberately stricter than the host policy. */
const STRICT_KEY: ApiKeyPayload = {
  iss: 'macts',
  sub: 'key_strict',
  iat: 1_700_000_000,
  permissions: ['calendar:events:create'],
}

/** A key with no policy of its own — governed by the host policy alone. */
const PLAIN_KEY: ApiKeyPayload = {
  iss: 'macts',
  sub: 'key_plain',
  iat: 1_700_000_000,
  permissions: ['calendar:events:create'],
}

/** Build a single-app policy pinning `calendar` to `disposition`. */
function policyFor(disposition: PolicyDisposition): GovernancePolicy {
  return {
    version: '1',
    defaultDisposition: 'forbidden',
    apps: [
      {
        app: 'calendar',
        disposition,
        operations: [],
        restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
        tags: [],
      },
    ],
    tags: [],
  }
}

/**
 * Build a Hono app whose "authenticated key" is chosen per request by an
 * `x-test-key` header, so one router can serve several keys — which is what
 * makes cross-key bleed observable.
 */
function makeApp(
  permission: string,
  risk: Parameters<typeof requirePolicy>[0]['risk'],
  governance: GovernanceContext,
  payloads: readonly ApiKeyPayload[],
  onHandlerRun?: (apiKeyId: string) => void
): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/*', async (c, next) => {
    const requested = c.req.header('x-test-key') ?? payloads[0]?.sub
    const payload = payloads.find((p) => p.sub === requested)
    if (payload === undefined) throw new Error(`No test payload for key "${String(requested)}"`)
    c.set('apiKeyPayload', payload)
    await next()
  })
  app.post('/rpc/call', requirePolicy({ permission, risk, governance }), (c) => {
    onHandlerRun?.(c.get('apiKeyPayload').sub)
    return c.json({ ok: true })
  })
  return app
}

/** POST the endpoint as a given key. */
async function callAs(
  app: Hono<{ Variables: AuthVariables }>,
  apiKeyId: string
): Promise<Response> {
  return app.request('/rpc/call', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-key': apiKeyId },
    body: JSON.stringify({ summary: 'Standup' }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requirePolicy with per-key policies', () => {
  let dir: string
  let auditPath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-gov-key-'))
    auditPath = join(dir, 'audit.jsonl')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  describe('per-request resolution', () => {
    it('resolves the policy for the key that authenticated this request', async () => {
      const resolved: string[] = []
      const keyPolicies = createKeyPolicyResolver({
        load: (apiKeyId) => {
          resolved.push(apiKeyId)
          return apiKeyId === STRICT_KEY.sub ? policyFor('forbidden') : undefined
        },
      })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('allowed'), keyPolicies },
        [STRICT_KEY, PLAIN_KEY]
      )

      expect((await callAs(app, PLAIN_KEY.sub)).status).toBe(200)
      expect((await callAs(app, STRICT_KEY.sub)).status).toBe(403)

      expect(resolved).toEqual([PLAIN_KEY.sub, STRICT_KEY.sub])
    })

    it('does not leak one key’s policy to another through the shared resolver', async () => {
      // Both keys go through the same router and the same (caching) resolver.
      const keyPolicies = createKeyPolicyResolver({
        load: (apiKeyId) =>
          apiKeyId === STRICT_KEY.sub ? policyFor('forbidden') : policyFor('allowed'),
      })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('allowed'), keyPolicies },
        [STRICT_KEY, PLAIN_KEY]
      )

      // Interleaved, and repeated, so a stale single-slot cache would show up.
      expect((await callAs(app, STRICT_KEY.sub)).status).toBe(403)
      expect((await callAs(app, PLAIN_KEY.sub)).status).toBe(200)
      expect((await callAs(app, STRICT_KEY.sub)).status).toBe(403)
      expect((await callAs(app, PLAIN_KEY.sub)).status).toBe(200)

      // And concurrently.
      const [strict, plain] = await Promise.all([
        callAs(app, STRICT_KEY.sub),
        callAs(app, PLAIN_KEY.sub),
      ])
      expect(strict.status).toBe(403)
      expect(plain.status).toBe(200)
    })
  })

  describe('canonical negative #1: host allows, key says confirm-first', () => {
    it('withholds the call with 202 and never runs the handler', async () => {
      const writer = createFileAuditWriter(auditPath)
      const ran: string[] = []
      const keyPolicies = createKeyPolicyResolver({
        load: (apiKeyId) => (apiKeyId === STRICT_KEY.sub ? policyFor('confirm-first') : undefined),
      })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('allowed'), writer, keyPolicies },
        [STRICT_KEY, PLAIN_KEY],
        (id) => ran.push(id)
      )

      const res = await callAs(app, STRICT_KEY.sub)

      expect(res.status).toBe(202)
      expect(ran).toEqual([])

      const body = (await res.json()) as GovernancePendingResponse
      expect(body.pendingApproval.permission).toBe('calendar:events:create')
      // The hold came from the key's own policy, not the machine-wide one.
      expect(body.pendingApproval.layer).toBe('key')

      const record = JSON.parse((await readFile(auditPath, 'utf8')).trim()) as Record<
        string,
        unknown
      >
      expect(record['decision']).toBe('pending')
      expect(record['apiKeyId']).toBe(STRICT_KEY.sub)
    })

    it('attributes a hold declared by the host policy to the host layer', async () => {
      const keyPolicies = createKeyPolicyResolver({ load: () => policyFor('allowed') })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('confirm-first'), keyPolicies },
        [STRICT_KEY]
      )

      const res = await callAs(app, STRICT_KEY.sub)

      expect(res.status).toBe(202)
      const body = (await res.json()) as GovernancePendingResponse
      expect(body.pendingApproval.layer).toBe('host')
    })
  })

  describe('canonical negative #2: host forbids, key says allowed', () => {
    it('denies with 403 and never escalates to a pending approval', async () => {
      const writer = createFileAuditWriter(auditPath)
      const ran: string[] = []
      const keyPolicies = createKeyPolicyResolver({ load: () => policyFor('allowed') })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('forbidden'), writer, keyPolicies },
        [STRICT_KEY],
        (id) => ran.push(id)
      )

      const res = await callAs(app, STRICT_KEY.sub)

      // 403, not 202: a host denial is terminal, so nothing downstream is ever
      // asked to approve it.
      expect(res.status).toBe(403)
      expect(res.status).not.toBe(202)
      expect(ran).toEqual([])

      const body = (await res.json()) as GovernanceDeniedResponse
      expect(body.error.code).toBe('GOVERNANCE_DENIED')
      expect(body.error.message).toContain('cannot widen the host policy')

      const record = JSON.parse((await readFile(auditPath, 'utf8')).trim()) as Record<
        string,
        unknown
      >
      // Recorded as a denial, never as 'pending' — nobody was asked.
      expect(record['decision']).toBe('denied')
    })

    it('denies even when the host policy has no matching rule (fail-closed default)', async () => {
      const keyPolicies = createKeyPolicyResolver({ load: () => policyFor('allowed') })
      const app = makeApp(
        'notes:notes:create',
        'write',
        { policy: policyFor('allowed'), keyPolicies },
        [STRICT_KEY]
      )

      // Host policy covers calendar only; notes falls to defaultDisposition.
      expect((await callAs(app, STRICT_KEY.sub)).status).toBe(403)
    })
  })

  describe('absent key policy', () => {
    it('behaves exactly as host-policy-only enforcement, with no key resolver configured', async () => {
      const app = makeApp('calendar:events:create', 'write', { policy: policyFor('allowed') }, [
        PLAIN_KEY,
      ])

      expect((await callAs(app, PLAIN_KEY.sub)).status).toBe(200)
    })

    it('behaves exactly as host-policy-only enforcement when the key has no policy', async () => {
      const keyPolicies = createKeyPolicyResolver({ load: () => undefined })
      const withResolver = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('confirm-first'), keyPolicies },
        [PLAIN_KEY]
      )
      const withoutResolver = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('confirm-first') },
        [PLAIN_KEY]
      )

      const withRes = await callAs(withResolver, PLAIN_KEY.sub)
      const withoutRes = await callAs(withoutResolver, PLAIN_KEY.sub)

      expect(withRes.status).toBe(withoutRes.status)
      // Byte-identical body: clients see no difference at all.
      expect(await withRes.text()).toBe(await withoutRes.text())
    })
  })

  describe('unreadable key policy', () => {
    it('fails the request closed rather than falling back to the host policy alone', async () => {
      const ran: string[] = []
      const keyPolicies = createKeyPolicyResolver({
        load: () => {
          throw new Error('policy blob is corrupt')
        },
      })
      const app = makeApp(
        'calendar:events:create',
        'write',
        { policy: policyFor('allowed'), keyPolicies },
        [STRICT_KEY],
        (id) => ran.push(id)
      )

      const res = await callAs(app, STRICT_KEY.sub)

      // The host policy alone would have allowed this call; an unreadable key
      // policy must not silently widen the boundary back to it.
      expect(res.status).toBe(500)
      expect(ran).toEqual([])
    })
  })
})

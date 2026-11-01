/**
 * Unit tests for per-caller governance context resolution.
 *
 * The contract under test: the host policy and everything else on the context
 * pass through unchanged, the authenticated key's own policy is attached when
 * a resolver is configured, and a resolver failure propagates (so callers fail
 * closed) instead of degrading to "no key policy".
 */

import { describe, expect, it, vi } from 'vitest'
import type { AuditWriter, GovernancePolicy } from '@macts/core'
import { createStaticApprovalProvider } from '@macts/core'
import { createKeyPolicyResolver } from './key-policy.js'
import { resolveGovernanceForRequest, type GovernanceContext } from './context.js'

const HOST_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'allowed',
  apps: [],
  tags: [],
}

const KEY_POLICY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [],
  tags: [],
}

/** An audit sink that records nothing; only its identity matters here. */
const NULL_WRITER: AuditWriter = { append: () => Promise.resolve() }

describe('resolveGovernanceForRequest', () => {
  it('returns the context unchanged when no key-policy resolver is configured', async () => {
    const governance: GovernanceContext = { policy: HOST_POLICY }

    const resolved = await resolveGovernanceForRequest(governance, 'key_a')

    expect(resolved).toBe(governance)
    expect(resolved.keyPolicy).toBeUndefined()
  })

  it("attaches the authenticated key's own policy", async () => {
    const load = vi.fn((apiKeyId: string) => (apiKeyId === 'key_a' ? KEY_POLICY : undefined))
    const governance: GovernanceContext = {
      policy: HOST_POLICY,
      keyPolicies: createKeyPolicyResolver({ load }),
    }

    const resolved = await resolveGovernanceForRequest(governance, 'key_a')

    expect(resolved.policy).toBe(HOST_POLICY)
    expect(resolved.keyPolicy).toEqual(KEY_POLICY)
    expect(load).toHaveBeenCalledWith('key_a')
  })

  it('leaves keyPolicy undefined for a key with no policy of its own', async () => {
    const governance: GovernanceContext = {
      policy: HOST_POLICY,
      keyPolicies: createKeyPolicyResolver({ load: () => undefined }),
    }

    const resolved = await resolveGovernanceForRequest(governance, 'key_without_policy')

    expect(resolved.keyPolicy).toBeUndefined()
  })

  it('carries an approval gate and its writer through resolution', async () => {
    const provider = createStaticApprovalProvider({ state: 'approved' })
    const governance: GovernanceContext = {
      policy: HOST_POLICY,
      writer: NULL_WRITER,
      approvals: { provider, timeoutMs: 1_000 },
      keyPolicies: createKeyPolicyResolver({ load: () => KEY_POLICY }),
    }

    const resolved = await resolveGovernanceForRequest(governance, 'key_a')

    expect(resolved.approvals).toEqual({ provider, timeoutMs: 1_000 })
    expect(resolved.writer).toBe(NULL_WRITER)
  })

  it('propagates a resolver failure instead of treating it as "no key policy"', async () => {
    const governance: GovernanceContext = {
      policy: HOST_POLICY,
      keyPolicies: {
        resolve: () => Promise.reject(new Error('key policy unreadable')),
        invalidate: () => undefined,
      },
    }

    await expect(resolveGovernanceForRequest(governance, 'key_a')).rejects.toThrow(
      'key policy unreadable'
    )
  })
})

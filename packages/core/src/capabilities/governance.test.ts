/**
 * Tests for the governance filter seam.
 *
 * Verifies the default no-op pass-through and the deny/warn/allow filtering
 * contract that the governance workstream will plug a real policy into.
 */

import { describe, expect, it } from 'vitest'
import { buildCapabilityRegistry } from './registry.js'
import { ALLOW_ALL_GOVERNANCE, applyGovernance, type GovernanceFilter } from './governance.js'
import { notebookManifest } from './test-fixtures.js'

const registry = buildCapabilityRegistry([notebookManifest()])
const caps = registry.capabilities

describe('ALLOW_ALL_GOVERNANCE', () => {
  it('allows every capability (no-op pass-through)', () => {
    for (const cap of caps) {
      expect(ALLOW_ALL_GOVERNANCE.evaluate(cap).disposition).toBe('allow')
    }
  })
})

describe('applyGovernance', () => {
  it('defaults to allow-all, preserving order and count', () => {
    const governed = applyGovernance(caps)
    expect(governed).toHaveLength(caps.length)
    expect(governed.map((g) => g.capability.name)).toEqual(caps.map((c) => c.name))
    for (const g of governed) {
      expect(g.decision.disposition).toBe('allow')
    }
  })

  it('drops capabilities a policy denies', () => {
    // Policy: deny anything more sensitive than read.
    const denyMutations: GovernanceFilter = {
      evaluate: (cap) =>
        cap.risk === 'read'
          ? { disposition: 'allow' }
          : { disposition: 'deny', reason: 'non-read operations are blocked' },
    }
    const governed = applyGovernance(caps, denyMutations)
    expect(governed.every((g) => g.capability.risk === 'read')).toBe(true)
    expect(governed.length).toBeLessThan(caps.length)
  })

  it('keeps warned capabilities and surfaces their reason', () => {
    const warnSends: GovernanceFilter = {
      evaluate: (cap) =>
        cap.risk === 'send'
          ? { disposition: 'warn', reason: 'send requires approval' }
          : { disposition: 'allow' },
    }
    const governed = applyGovernance(caps, warnSends)
    const warned = governed.filter((g) => g.decision.disposition === 'warn')
    expect(warned).toHaveLength(1)
    expect(warned[0]?.capability.risk).toBe('send')
    expect(warned[0]?.decision.reason).toBe('send requires approval')
    // Nothing is dropped — warn keeps the capability visible.
    expect(governed).toHaveLength(caps.length)
  })

  it('returns an empty list when a policy denies everything', () => {
    const denyAll: GovernanceFilter = {
      evaluate: () => ({ disposition: 'deny' }),
    }
    expect(applyGovernance(caps, denyAll)).toEqual([])
  })
})

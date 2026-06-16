/**
 * Tests for the shared governance policy path definition.
 *
 * This single definition is the source of truth that prevents a split-brain
 * where API call-time enforcement and CLI/MCP discovery read the policy from
 * different files. The tests pin the canonical relative location and verify
 * the resolver composes it against a home directory.
 *
 * @see Issue #55 — discovery and enforcement must read the SAME policy file
 */

import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { GOVERNANCE_POLICY_RELATIVE_PATH, governancePolicyPath } from './policy-path.js'

describe('GOVERNANCE_POLICY_RELATIVE_PATH', () => {
  it('groups the policy under a governance/ directory', () => {
    // Canonical: governance artifacts live under governance/; the policy is
    // governance/policy.json. Asserted explicitly so a careless edit that moves
    // it back to a bare policy.json (the split-brain bug) fails here.
    expect(GOVERNANCE_POLICY_RELATIVE_PATH).toBe('governance/policy.json')
  })
})

describe('governancePolicyPath', () => {
  it('resolves <home>/governance/policy.json', () => {
    const home = '/tmp/macts-home'
    expect(governancePolicyPath(home)).toBe(join(home, 'governance', 'policy.json'))
  })

  it('composes the relative path against the home directory', () => {
    // The resolved path must be exactly home joined with the shared relative
    // constant — so every surface that uses this helper agrees on the file.
    const home = '/var/lib/example'
    expect(governancePolicyPath(home)).toBe(join(home, GOVERNANCE_POLICY_RELATIVE_PATH))
  })

  it('is deterministic for the same input', () => {
    const home = '/home/agent/.macts'
    expect(governancePolicyPath(home)).toBe(governancePolicyPath(home))
  })
})

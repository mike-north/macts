/**
 * Tests for the canonical active-policy path resolver.
 *
 * @see https://github.com/mike-north/macts/issues/79
 */

import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { resolveActivePolicyPath } from './policy-path.js'

describe('resolveActivePolicyPath', () => {
  it('returns <home>/governance/policy.json for a given home directory', () => {
    const home = '/home/user/.macts'
    expect(resolveActivePolicyPath(home)).toBe(join(home, 'governance', 'policy.json'))
  })

  it('is deterministic — same home always yields the same path', () => {
    const home = '/custom/macts-home'
    expect(resolveActivePolicyPath(home)).toBe(resolveActivePolicyPath(home))
  })

  it('handles the default ~/.macts home', () => {
    const home = `${process.env['HOME'] ?? '/root'}/.macts`
    const result = resolveActivePolicyPath(home)
    expect(result).toContain(join('governance', 'policy.json'))
    expect(result.startsWith(home)).toBe(true)
  })

  it('does not include policy.json at the home root (regression #79: old CLI path)', () => {
    const home = '/home/user/.macts'
    const result = resolveActivePolicyPath(home)
    // Must NOT be <home>/policy.json — that was the broken CLI path.
    expect(result).not.toBe(join(home, 'policy.json'))
  })
})

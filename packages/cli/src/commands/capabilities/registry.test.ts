/**
 * Unit tests for `manifestsDirCandidates`.
 *
 * Verifies that the user home directory candidate uses `os.homedir()` rather
 * than `process.env['HOME']`, so the path is always absolute even when HOME is
 * unset in the environment.
 */

import * as os from 'node:os'
import { describe, expect, it } from 'vitest'
import { manifestsDirCandidates } from './registry.js'

describe('manifestsDirCandidates', () => {
  it('includes a candidate rooted at os.homedir() for the user config dir', () => {
    const candidates = manifestsDirCandidates()
    const homeDir = os.homedir()
    const userConfigCandidate = candidates.find((c) => c.includes('.macts'))
    expect(userConfigCandidate).toBeDefined()
    // Must be absolute and rooted at the real home dir — never an empty-string
    // relative path that arises when HOME is unset.
    expect(userConfigCandidate).toMatch(/^\//)
    expect(userConfigCandidate).toContain(homeDir)
    expect(userConfigCandidate).toContain('.macts/manifests')
  })

  it('prepends the explicit override when provided', () => {
    const candidates = manifestsDirCandidates('/custom/manifests')
    expect(candidates[0]).toBe('/custom/manifests')
  })

  it('includes the cwd-relative manifests/ as the first non-explicit candidate', () => {
    const candidates = manifestsDirCandidates()
    // Without an explicit override, first candidate is <cwd>/manifests
    expect(candidates[0]).toContain('manifests')
    expect(candidates[0]).toMatch(/^\//) // always absolute
  })
})

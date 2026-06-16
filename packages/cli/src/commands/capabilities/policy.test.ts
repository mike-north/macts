/**
 * Tests for the CLI/discovery active-policy path resolution.
 *
 * The discovery surfaces (`capabilities search` / `inspect`, and the MCP
 * discovery tool wired in `root.ts`) must read the policy from the exact same
 * file the API server's call-time enforcement reads. Both resolve it via the
 * single shared `governancePolicyPath` definition in `@macts/core`; this test
 * guards against a regression where they drift to different paths (a
 * split-brain where a user's policy is honoured by one surface and ignored by
 * another).
 *
 * @see Issue #55 — discovery and enforcement must read the SAME policy file
 */

import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { governancePolicyPath } from '@macts/core'
import { getMactsHome } from '../../plugin/paths.js'
import { getPolicyFilePath } from './policy.js'

describe('getPolicyFilePath (discovery)', () => {
  it('resolves the SAME path API enforcement uses via the shared definition', () => {
    // Both surfaces compose getMactsHome() with the shared governancePolicyPath
    // helper. If the CLI loader hardcoded a different relative path (e.g. a bare
    // policy.json), this assertion would fail — catching the split-brain bug.
    expect(getPolicyFilePath()).toBe(governancePolicyPath(getMactsHome()))
  })

  it('points at <macts-home>/governance/policy.json', () => {
    expect(getPolicyFilePath()).toBe(join(getMactsHome(), 'governance', 'policy.json'))
  })
})

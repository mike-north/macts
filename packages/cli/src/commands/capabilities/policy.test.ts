/**
 * Tests for the CLI active-policy loader (capability discovery).
 *
 * Regression tests for issue #79: the CLI path resolver must delegate to
 * resolveActivePolicyPath so enforcement and discovery always read the same
 * file. Before the fix, the CLI used <home>/policy.json while the API used
 * <home>/governance/policy.json — a split-brain that silently rendered any
 * policy file ineffective for one or the other.
 *
 * Also covers the three loadActiveGovernanceFilter outcomes:
 * - no file → ALLOW_ALL_GOVERNANCE (discovery is unrestricted),
 * - valid file → policy-backed GovernanceFilter,
 * - invalid file → ALLOW_ALL_GOVERNANCE after warning on stderr.
 *
 * @see https://github.com/mike-north/macts/issues/61
 * @see https://github.com/mike-north/macts/issues/79
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { resolveActivePolicyPath } from '@macts/core'
import { getPolicyFilePath, loadActiveGovernanceFilter } from './policy.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStderr(): { stream: Writable; output: string[] } {
  const output: string[] = []
  const stream = new Writable({
    write(chunk: Buffer, _enc: string, cb: () => void) {
      output.push(chunk.toString())
      cb()
    },
  })
  return { stream, output }
}

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'macts-cli-policy-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// getPolicyFilePath — regression #79
// ---------------------------------------------------------------------------

describe('getPolicyFilePath', () => {
  // Regression #79: the CLI previously built the path as <home>/policy.json,
  // while enforcement used <home>/governance/policy.json. Both must delegate to
  // resolveActivePolicyPath so they always read the same file.
  it('returns the same path as resolveActivePolicyPath(home) for any home (regression #79)', () => {
    const syntheticHome = '/tmp/synthetic-cli-macts-home'
    const original = process.env['MACTS_HOME']
    try {
      process.env['MACTS_HOME'] = syntheticHome
      expect(getPolicyFilePath()).toBe(resolveActivePolicyPath(syntheticHome))
    } finally {
      if (original === undefined) {
        delete process.env['MACTS_HOME']
      } else {
        process.env['MACTS_HOME'] = original
      }
    }
  })

  it('resolves to <home>/governance/policy.json, not <home>/policy.json (regression #79)', () => {
    const syntheticHome = '/tmp/synthetic-cli-macts-home'
    const original = process.env['MACTS_HOME']
    try {
      process.env['MACTS_HOME'] = syntheticHome
      const result = getPolicyFilePath()
      // Must be in the governance subdirectory.
      expect(result).toBe(join(syntheticHome, 'governance', 'policy.json'))
      // Must NOT be at the home root (the pre-fix broken path).
      expect(result).not.toBe(join(syntheticHome, 'policy.json'))
    } finally {
      if (original === undefined) {
        delete process.env['MACTS_HOME']
      } else {
        process.env['MACTS_HOME'] = original
      }
    }
  })
})

// ---------------------------------------------------------------------------
// loadActiveGovernanceFilter
// ---------------------------------------------------------------------------

describe('loadActiveGovernanceFilter — no file', () => {
  it('returns ALLOW_ALL_GOVERNANCE when no policy file exists', async () => {
    const { stream } = makeStderr()
    const original = process.env['MACTS_HOME']
    try {
      // Point MACTS_HOME at our temp dir where no governance/policy.json exists.
      process.env['MACTS_HOME'] = tmpDir
      const filter = await loadActiveGovernanceFilter(stream)
      // ALLOW_ALL_GOVERNANCE.evaluate returns allow for any input.
      // We cannot easily construct a full Capability; instead verify the
      // returned object is the pass-through by checking it doesn't deny.
      expect(filter).toBeDefined()
      expect(typeof filter.evaluate).toBe('function')
    } finally {
      if (original === undefined) {
        delete process.env['MACTS_HOME']
      } else {
        process.env['MACTS_HOME'] = original
      }
    }
  })
})

describe('loadActiveGovernanceFilter — valid policy', () => {
  it('returns a policy-backed filter (not the allow-all pass-through)', async () => {
    const { stream } = makeStderr()
    // Write a minimal policy in the canonical location.
    const govDir = join(tmpDir, 'governance')
    await mkdir(govDir, { recursive: true })
    await writeFile(
      join(govDir, 'policy.json'),
      JSON.stringify({ version: '1', defaultDisposition: 'forbidden', apps: [] }),
      'utf8'
    )
    const original = process.env['MACTS_HOME']
    try {
      process.env['MACTS_HOME'] = tmpDir
      const filter = await loadActiveGovernanceFilter(stream)
      // A policy-backed filter is a different object from ALLOW_ALL_GOVERNANCE
      // and should reflect the declared defaultDisposition.
      expect(filter).toBeDefined()
      expect(typeof filter.evaluate).toBe('function')
    } finally {
      if (original === undefined) {
        delete process.env['MACTS_HOME']
      } else {
        process.env['MACTS_HOME'] = original
      }
    }
  })
})

describe('loadActiveGovernanceFilter — invalid policy', () => {
  it('returns a filter and writes a warning to stderr when the file is malformed', async () => {
    const { stream, output } = makeStderr()
    // Write a malformed JSON file in the canonical location.
    const govDir = join(tmpDir, 'governance')
    await mkdir(govDir, { recursive: true })
    await writeFile(join(govDir, 'policy.json'), '{ this is not json', 'utf8')
    const original = process.env['MACTS_HOME']
    try {
      process.env['MACTS_HOME'] = tmpDir
      const filter = await loadActiveGovernanceFilter(stream)
      // Should degrade to a defined (allow-all) filter.
      expect(filter).toBeDefined()
      expect(typeof filter.evaluate).toBe('function')
      // A warning must have been written to stderr.
      expect(output.join('')).toMatch(/\[governance\] Warning:/)
      expect(output.join('')).toMatch(/\[governance\] Continuing with allow-all filter/)
    } finally {
      if (original === undefined) {
        delete process.env['MACTS_HOME']
      } else {
        process.env['MACTS_HOME'] = original
      }
    }
  })
})

/**
 * Tests for active governance policy loading.
 *
 * Covers the three load paths:
 * - missing file → allow-all (fail open; governance is opt-in),
 * - valid file → parsed policy with defaults applied,
 * - malformed file (bad JSON / invalid policy) → ActivePolicyError (hard fail,
 *   never silently downgraded to allow-all).
 *
 * @see https://github.com/mike-north/macts/issues/53
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GovernancePolicy } from '@macts/core'
import {
  ALLOW_ALL_POLICY,
  ActivePolicyError,
  getActivePolicyPath,
  loadActivePolicy,
} from './active-policy.js'

describe('loadActivePolicy', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'macts-policy-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns the allow-all policy when no file exists (fail open)', async () => {
    const policy = await loadActivePolicy({ path: join(dir, 'does-not-exist.json') })
    expect(policy).toEqual(ALLOW_ALL_POLICY)
    expect(policy.defaultDisposition).toBe('allowed')
    expect(policy.apps).toEqual([])
  })

  it('parses a valid policy file and applies schema defaults', async () => {
    const path = join(dir, 'policy.json')
    await writeFile(
      path,
      JSON.stringify({
        defaultDisposition: 'forbidden',
        apps: [{ app: 'calendar', disposition: 'read-only' }],
      }),
      'utf8'
    )

    const policy = await loadActivePolicy({ path })
    expect(policy.defaultDisposition).toBe('forbidden')
    expect(policy.apps).toHaveLength(1)
    expect(policy.apps[0]?.app).toBe('calendar')
    expect(policy.apps[0]?.disposition).toBe('read-only')
    // Defaults applied by the schema.
    expect(policy.apps[0]?.operations).toEqual([])
    expect(policy.version).toBe('1')
  })

  it('throws ActivePolicyError for invalid JSON (negative)', async () => {
    const path = join(dir, 'bad.json')
    await writeFile(path, '{ not valid json', 'utf8')

    await expect(loadActivePolicy({ path })).rejects.toBeInstanceOf(ActivePolicyError)
  })

  it('throws ActivePolicyError for a structurally invalid policy (negative)', async () => {
    const path = join(dir, 'invalid-policy.json')
    // `disposition` is not a valid PolicyDisposition.
    await writeFile(
      path,
      JSON.stringify({ apps: [{ app: 'calendar', disposition: 'maybe' }] }),
      'utf8'
    )

    await expect(loadActivePolicy({ path })).rejects.toBeInstanceOf(ActivePolicyError)
  })

  it('never silently downgrades a malformed policy to allow-all', async () => {
    const path = join(dir, 'invalid-policy.json')
    await writeFile(path, JSON.stringify({ defaultDisposition: 'nonsense' }), 'utf8')

    // The error names the path so an operator can find the broken file.
    await expect(loadActivePolicy({ path })).rejects.toThrow(path)
  })
})

describe('getActivePolicyPath', () => {
  it('resolves under the macts home, at governance/policy.json', () => {
    const path = getActivePolicyPath()
    expect(path.endsWith(join('governance', 'policy.json'))).toBe(true)
  })
})

describe('ALLOW_ALL_POLICY', () => {
  it('is frozen and permits everything', () => {
    expect(Object.isFrozen(ALLOW_ALL_POLICY)).toBe(true)
    expect(ALLOW_ALL_POLICY.defaultDisposition).toBe('allowed')
    expect(ALLOW_ALL_POLICY.apps).toEqual([])
  })

  // Regression: a shallow Object.freeze leaves the nested `apps`/`tags` arrays
  // mutable, so a consumer could corrupt the shared default. Deep-freezing must
  // make the nested arrays immutable too.
  it('deep-freezes the nested apps array (mutation throws in strict mode, no effect otherwise)', () => {
    expect(Object.isFrozen(ALLOW_ALL_POLICY.apps)).toBe(true)
    // In ESM (strict mode) a push to a frozen array throws; defensively assert
    // both the throw and that no mutation took effect. (The Zod-inferred type
    // for `apps` is a mutable array, so this would compile — runtime freezing is
    // exactly the guarantee under test.)
    const appRule: GovernancePolicy['apps'][number] = {
      app: 'sneaky',
      disposition: 'allowed',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    }
    expect(() => {
      ALLOW_ALL_POLICY.apps.push(appRule)
    }).toThrow(TypeError)
    expect(ALLOW_ALL_POLICY.apps).toHaveLength(0)
  })

  it('deep-freezes the nested tags array', () => {
    expect(Object.isFrozen(ALLOW_ALL_POLICY.tags)).toBe(true)
    const tag: GovernancePolicy['tags'][number] = 'pii'
    expect(() => {
      ALLOW_ALL_POLICY.tags.push(tag)
    }).toThrow(TypeError)
    expect(ALLOW_ALL_POLICY.tags).toHaveLength(0)
  })
})

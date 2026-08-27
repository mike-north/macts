/**
 * Tests for per-request resolution of the policy attached to an API key.
 *
 * Two layers:
 *
 * - Unit tests over {@link createKeyPolicyResolver} with an injected loader and
 *   an injected clock: caching, invalidation, error propagation, and — the
 *   acceptance criterion that matters most — no cross-key cache bleed.
 * - An integration test over {@link createStoredKeyPolicyResolver} against the
 *   real SQLite key store in a temp `HOME`, so the production wiring is
 *   exercised rather than assumed.
 *
 * @see https://github.com/mike-north/macts/issues/108
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { AppRule, GovernancePolicy, PolicyDisposition } from '@macts/core'
import {
  createKeyPolicyResolver,
  DEFAULT_KEY_POLICY_CACHE_TTL_MS,
  type KeyPolicyResolver,
} from './key-policy.js'

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

/** A controllable clock for cache-expiry assertions (never the wall clock). */
function makeClock(start = 1_000): { now: () => number; advance: (ms: number) => void } {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

describe('createKeyPolicyResolver', () => {
  it('returns the policy the loader produced for that key', async () => {
    const resolver = createKeyPolicyResolver({ load: () => policyFor('confirm-first') })

    const policy = await resolver.resolve('key_a')

    expect(policy?.apps[0]?.disposition).toBe('confirm-first')
  })

  it('returns undefined — not a placeholder policy — when the key has no policy', async () => {
    const resolver = createKeyPolicyResolver({ load: () => undefined })

    await expect(resolver.resolve('key_a')).resolves.toBeUndefined()
  })

  it('accepts an async loader', async () => {
    const resolver = createKeyPolicyResolver({
      load: () => Promise.resolve(policyFor('forbidden')),
    })

    await expect(resolver.resolve('key_a')).resolves.toEqual(policyFor('forbidden'))
  })

  describe('cache isolation', () => {
    it('never serves one key’s policy to another', async () => {
      const byKey: Record<string, PolicyDisposition> = {
        key_a: 'forbidden',
        key_b: 'allowed',
        key_c: 'confirm-first',
      }
      const resolver = createKeyPolicyResolver({
        load: (id) => {
          const disposition = byKey[id]
          return disposition === undefined ? undefined : policyFor(disposition)
        },
      })

      // Interleaved and repeated: a single-slot or last-write-wins cache fails here.
      for (const id of ['key_a', 'key_b', 'key_c', 'key_a', 'key_c', 'key_b']) {
        const policy = await resolver.resolve(id)
        expect(policy?.apps[0]?.disposition).toBe(byKey[id])
      }
    })

    it('keeps keys isolated when resolved concurrently', async () => {
      const resolver = createKeyPolicyResolver({
        load: async (id) => {
          // Stagger completion so a shared mutable slot would be observable.
          await new Promise((resolve) => setTimeout(resolve, id === 'key_a' ? 10 : 0))
          return policyFor(id === 'key_a' ? 'forbidden' : 'allowed')
        },
      })

      const [a, b] = await Promise.all([resolver.resolve('key_a'), resolver.resolve('key_b')])

      expect(a?.apps[0]?.disposition).toBe('forbidden')
      expect(b?.apps[0]?.disposition).toBe('allowed')
    })

    it('caches the absence of a policy per key, without affecting other keys', async () => {
      const calls: string[] = []
      const resolver = createKeyPolicyResolver({
        load: (id) => {
          calls.push(id)
          return id === 'key_a' ? undefined : policyFor('forbidden')
        },
      })

      await resolver.resolve('key_a')
      await resolver.resolve('key_a')
      const b = await resolver.resolve('key_b')

      // 'key_a' loaded once (its absence is cached), 'key_b' unaffected.
      expect(calls).toEqual(['key_a', 'key_b'])
      expect(b?.apps[0]?.disposition).toBe('forbidden')
    })
  })

  describe('cache lifetime', () => {
    it('serves a cached policy until the TTL elapses, then reloads', async () => {
      const clock = makeClock()
      const dispositions: PolicyDisposition[] = ['allowed', 'forbidden']
      let call = 0
      const resolver = createKeyPolicyResolver({
        load: () => policyFor(dispositions[call++] ?? 'forbidden'),
        cacheTtlMs: 1_000,
        now: clock.now,
      })

      expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('allowed')
      clock.advance(999)
      expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('allowed')
      clock.advance(2)
      expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('forbidden')
    })

    it('reloads on every call when caching is disabled', async () => {
      let calls = 0
      const resolver = createKeyPolicyResolver({
        load: () => {
          calls += 1
          return policyFor('allowed')
        },
        cacheTtlMs: 0,
      })

      await resolver.resolve('key_a')
      await resolver.resolve('key_a')

      expect(calls).toBe(2)
    })

    it('defaults to a short cache lifetime so a tightened policy takes effect quickly', async () => {
      const clock = makeClock()
      let calls = 0
      const resolver = createKeyPolicyResolver({
        load: () => {
          calls += 1
          return policyFor('allowed')
        },
        now: clock.now,
      })

      await resolver.resolve('key_a')
      clock.advance(DEFAULT_KEY_POLICY_CACHE_TTL_MS + 1)
      await resolver.resolve('key_a')

      expect(calls).toBe(2)
    })
  })

  describe('invalidation', () => {
    it('drops the cached entry for one key only', async () => {
      const calls: string[] = []
      const resolver = createKeyPolicyResolver({
        load: (id) => {
          calls.push(id)
          return policyFor('allowed')
        },
      })

      await resolver.resolve('key_a')
      await resolver.resolve('key_b')
      resolver.invalidate('key_a')
      await resolver.resolve('key_a')
      await resolver.resolve('key_b')

      expect(calls).toEqual(['key_a', 'key_b', 'key_a'])
    })

    /**
     * Regression: an invalidation that lands while a load is in flight was
     * erased when that load completed and wrote its (pre-update) result into the
     * cache, so every later request ran under the stale — potentially wider —
     * policy for a full TTL. This is exactly backwards for a layer whose whole
     * job is tightening: an operator narrowing a key would see the narrower
     * policy silently fail to take effect.
     */
    describe('a load that races an invalidation', () => {
      /** A loader whose completion the test controls, one deferral per call. */
      function deferredLoader(): {
        load: (id: string) => Promise<GovernancePolicy | undefined>
        settle: (value: GovernancePolicy | undefined) => void
        callCount: () => number
      } {
        let resolveCurrent: ((value: GovernancePolicy | undefined) => void) | undefined
        let calls = 0
        return {
          load: () => {
            calls += 1
            return new Promise<GovernancePolicy | undefined>((res) => {
              resolveCurrent = res
            })
          },
          settle: (value) => {
            resolveCurrent?.(value)
          },
          callCount: () => calls,
        }
      }

      it('does not cache the stale result when the policy was updated mid-flight', async () => {
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        // Request A starts while the key still has the wide policy.
        const inFlight = resolver.resolve('key_a')

        // Operator tightens the key and invalidates.
        resolver.invalidate('key_a')

        // A's load now completes with the pre-update (wider) policy.
        deferred.settle(policyFor('allowed'))
        await inFlight

        // The next request must NOT be served the stale entry.
        const next = resolver.resolve('key_a')
        expect(deferred.callCount()).toBe(2)
        deferred.settle(policyFor('forbidden'))
        expect((await next)?.apps[0]?.disposition).toBe('forbidden')
      })

      it('does not cache a stale absence when the policy was deleted mid-flight', async () => {
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        const inFlight = resolver.resolve('key_a')
        resolver.invalidate('key_a')
        // The in-flight load completes with the policy as it was before deletion.
        deferred.settle(policyFor('allowed'))
        await inFlight

        const next = resolver.resolve('key_a')
        expect(deferred.callCount()).toBe(2)
        deferred.settle(undefined)
        await expect(next).resolves.toBeUndefined()
      })

      it('does not cache a stale absence that a mid-flight write superseded', async () => {
        // The negative (absence) case in the other direction: the racing load
        // resolved "no policy", but a policy was written before it completed.
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        const inFlight = resolver.resolve('key_a')
        resolver.invalidate('key_a')
        deferred.settle(undefined)
        await inFlight

        const next = resolver.resolve('key_a')
        expect(deferred.callCount()).toBe(2)
        deferred.settle(policyFor('forbidden'))
        expect((await next)?.apps[0]?.disposition).toBe('forbidden')
      })

      it('honors a global invalidation that lands mid-flight', async () => {
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        const inFlight = resolver.resolve('key_a')
        resolver.invalidate()
        deferred.settle(policyFor('allowed'))
        await inFlight

        const next = resolver.resolve('key_a')
        expect(deferred.callCount()).toBe(2)
        deferred.settle(policyFor('forbidden'))
        expect((await next)?.apps[0]?.disposition).toBe('forbidden')
      })

      it('still caches an in-flight load that no invalidation raced', async () => {
        // The guard must not defeat caching in the ordinary case.
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        const inFlight = resolver.resolve('key_a')
        deferred.settle(policyFor('allowed'))
        await inFlight

        expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('allowed')
        expect(deferred.callCount()).toBe(1)
      })

      it('leaves other keys’ cached entries alone', async () => {
        const deferred = deferredLoader()
        const resolver = createKeyPolicyResolver({ load: deferred.load })

        const cachedB = resolver.resolve('key_b')
        deferred.settle(policyFor('allowed'))
        await cachedB

        const inFlight = resolver.resolve('key_a')
        resolver.invalidate('key_a')
        deferred.settle(policyFor('allowed'))
        await inFlight

        // key_b was never invalidated, so it is still served from cache.
        expect((await resolver.resolve('key_b'))?.apps[0]?.disposition).toBe('allowed')
        expect(deferred.callCount()).toBe(2)
      })
    })

    it('drops every cached entry when called with no key', async () => {
      const calls: string[] = []
      const resolver = createKeyPolicyResolver({
        load: (id) => {
          calls.push(id)
          return policyFor('allowed')
        },
      })

      await resolver.resolve('key_a')
      await resolver.resolve('key_b')
      resolver.invalidate()
      await resolver.resolve('key_a')
      await resolver.resolve('key_b')

      expect(calls).toEqual(['key_a', 'key_b', 'key_a', 'key_b'])
    })
  })

  describe('failure handling', () => {
    it('propagates a loader failure instead of reporting "no policy"', async () => {
      const resolver = createKeyPolicyResolver({
        load: () => {
          throw new Error('policy blob is corrupt')
        },
      })

      // Reporting undefined here would silently widen the key back to the host
      // policy alone; callers must be able to fail the request closed.
      await expect(resolver.resolve('key_a')).rejects.toThrow('policy blob is corrupt')
    })

    it('does not cache a failure', async () => {
      let calls = 0
      const resolver = createKeyPolicyResolver({
        load: () => {
          calls += 1
          if (calls === 1) throw new Error('transient')
          return policyFor('allowed')
        },
      })

      await expect(resolver.resolve('key_a')).rejects.toThrow('transient')
      await expect(resolver.resolve('key_a')).resolves.toEqual(policyFor('allowed'))
    })
  })

  it('freezes the resolved policy so one request cannot mutate the cached document', async () => {
    const resolver = createKeyPolicyResolver({ load: () => policyFor('allowed') })

    const policy = await resolver.resolve('key_a')

    expect(Object.isFrozen(policy)).toBe(true)
    expect(Object.isFrozen(policy?.apps)).toBe(true)
    const extraRule = policyFor('allowed').apps[0]
    expect(extraRule).toBeDefined()
    expect(() => {
      policy?.apps.push(extraRule as AppRule)
    }).toThrow()
  })
})

describe('createStoredKeyPolicyResolver (real key store)', () => {
  let tempDir: string
  let originalHome: string | undefined
  let originalEnvSecret: string | undefined
  let storage: typeof import('../../keys/storage.js')
  let keyPolicy: typeof import('./key-policy.js')

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-key-policy-test-'))
    originalHome = process.env['HOME']
    originalEnvSecret = process.env['MACTS_API_KEY_SECRET']
    process.env['HOME'] = tempDir
    delete process.env['MACTS_API_KEY_SECRET']

    // Reset modules so the storage singleton picks up the temp HOME.
    vi.resetModules()
    storage = await import('../../keys/storage.js')
    keyPolicy = await import('./key-policy.js')
  })

  afterEach(() => {
    storage.closeDatabase()
    process.env['HOME'] = originalHome
    if (originalEnvSecret) {
      process.env['MACTS_API_KEY_SECRET'] = originalEnvSecret
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('reads a stored per-key policy back through the resolver', async () => {
    storage.setKeyPolicy('key_stored', policyFor('confirm-first'))
    const resolver: KeyPolicyResolver = keyPolicy.createStoredKeyPolicyResolver({ cacheTtlMs: 0 })

    const resolved = await resolver.resolve('key_stored')

    expect(resolved?.apps[0]?.disposition).toBe('confirm-first')
  })

  it('resolves undefined for a key with no stored policy', async () => {
    const resolver: KeyPolicyResolver = keyPolicy.createStoredKeyPolicyResolver({ cacheTtlMs: 0 })

    await expect(resolver.resolve('key_without_policy')).resolves.toBeUndefined()
  })

  it('keeps two stored keys’ policies distinct', async () => {
    storage.setKeyPolicy('key_a', policyFor('forbidden'))
    storage.setKeyPolicy('key_b', policyFor('allowed'))
    const resolver: KeyPolicyResolver = keyPolicy.createStoredKeyPolicyResolver()

    expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('forbidden')
    expect((await resolver.resolve('key_b'))?.apps[0]?.disposition).toBe('allowed')
    expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('forbidden')
  })

  it('picks up a policy change after invalidation', async () => {
    storage.setKeyPolicy('key_a', policyFor('allowed'))
    const resolver: KeyPolicyResolver = keyPolicy.createStoredKeyPolicyResolver()

    expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('allowed')
    storage.setKeyPolicy('key_a', policyFor('forbidden'))
    resolver.invalidate('key_a')

    expect((await resolver.resolve('key_a'))?.apps[0]?.disposition).toBe('forbidden')
  })
})

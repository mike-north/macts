/**
 * Per-request resolution of the governance policy attached to an API key.
 *
 * The host policy is a machine-wide constant: it is loaded once and bound to the
 * router. A per-key policy is not — which policy applies depends on *which key
 * authenticated this request*, so it has to be resolved per request, from
 * `apiKeyPayload.sub`, after auth has run.
 *
 * This module owns that seam:
 *
 * - {@link KeyPolicyResolver} — the interface the governance middleware calls
 *   once per request.
 * - {@link createKeyPolicyResolver} — a resolver over any loader, with a small
 *   per-key TTL cache so a busy key does not hit the store on every call.
 * - {@link createStoredKeyPolicyResolver} — the production wiring, over the
 *   SQLite key store.
 *
 * ## Cache correctness
 *
 * The cache is keyed by API key id and every entry stores the policy *it was
 * loaded for*. There is deliberately no "current policy" slot, no last-resolved
 * memo, and no module-level mutable state: two keys with different policies
 * resolving in the same process (or concurrently) can never see each other's
 * policy. A resolved policy is also frozen before it is cached, so a caller
 * cannot mutate the shared entry out from under the next request.
 *
 * ## Failure handling
 *
 * A loader failure propagates. It is never converted into "this key has no
 * policy", because that would silently fall back to the host policy alone —
 * *wider* than what the operator declared for that key. Callers fail the request
 * closed instead.
 *
 * @packageDocumentation
 */

import type { GovernancePolicy } from '@macts/core'
import { getKeyPolicy } from '../../keys/storage.js'

/**
 * Resolves the governance policy attached to an API key, per request.
 *
 * Implementations must return `undefined` — never a permissive placeholder
 * policy — when a key has no policy of its own, so the caller can apply the host
 * policy alone and preserve pre-per-key behavior exactly.
 */
export interface KeyPolicyResolver {
  /**
   * Resolve the policy for one API key.
   *
   * @param apiKeyId - The authenticated key's id (`ApiKeyPayload.sub`).
   * @returns The key's policy, or `undefined` when it has none.
   */
  resolve(apiKeyId: string): Promise<GovernancePolicy | undefined>
  /**
   * Drop cached state for one key, or for every key when `apiKeyId` is omitted.
   * Call this after a key's policy is written or removed so the change takes
   * effect immediately rather than at the next TTL expiry.
   */
  invalidate(apiKeyId?: string): void
}

/**
 * Loads a key's policy from wherever it is stored. May be sync or async.
 */
export type KeyPolicyLoader = (
  apiKeyId: string
) => GovernancePolicy | undefined | Promise<GovernancePolicy | undefined>

/**
 * Options for {@link createKeyPolicyResolver}.
 */
export interface CreateKeyPolicyResolverOptions {
  /** How to load a key's policy. */
  readonly load: KeyPolicyLoader
  /**
   * How long a resolved policy (including a resolved *absence*) stays cached, in
   * milliseconds. `0` disables caching entirely — every request re-reads.
   * Defaults to {@link DEFAULT_KEY_POLICY_CACHE_TTL_MS}.
   */
  readonly cacheTtlMs?: number
  /**
   * Clock used for cache expiry. Injected so tests can advance time without
   * waiting; defaults to `Date.now`.
   */
  readonly now?: () => number
}

/**
 * Default lifetime of a cached per-key policy.
 *
 * Short on purpose: a policy edit is a security-relevant change, and an operator
 * tightening a key's policy should not have to wait long (or restart the server)
 * for it to bite. {@link KeyPolicyResolver.invalidate} makes it immediate.
 */
export const DEFAULT_KEY_POLICY_CACHE_TTL_MS = 5_000

/**
 * A cached resolution for one key. `policy: undefined` is a real, cacheable
 * answer ("this key has no policy"), which is why absence is stored explicitly
 * rather than as a missing map entry.
 */
interface CacheEntry {
  readonly policy: GovernancePolicy | undefined
  readonly expiresAt: number
}

/**
 * Recursively freeze a resolved policy so a cached document cannot be mutated by
 * one request and observed, changed, by the next.
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
    Object.freeze(value)
  }
  return value
}

/**
 * Create a {@link KeyPolicyResolver} over an arbitrary loader.
 *
 * @param options - Loader, optional cache TTL, optional clock.
 * @returns A resolver safe to share across requests and keys.
 */
export function createKeyPolicyResolver(
  options: CreateKeyPolicyResolverOptions
): KeyPolicyResolver {
  const { load } = options
  const ttlMs = options.cacheTtlMs ?? DEFAULT_KEY_POLICY_CACHE_TTL_MS
  const now = options.now ?? Date.now

  // Keyed strictly by API key id. Nothing in this closure holds a "last
  // resolved" policy, so one key's result can never be served to another.
  const cache = new Map<string, CacheEntry>()

  return {
    async resolve(apiKeyId: string): Promise<GovernancePolicy | undefined> {
      if (ttlMs > 0) {
        const cached = cache.get(apiKeyId)
        if (cached !== undefined && cached.expiresAt > now()) {
          return cached.policy
        }
      }

      // A loader rejection propagates: see the module docs on why an unreadable
      // key policy must not degrade into "no key policy".
      const loaded = await load(apiKeyId)
      const policy = loaded === undefined ? undefined : deepFreeze(loaded)

      if (ttlMs > 0) {
        cache.set(apiKeyId, { policy, expiresAt: now() + ttlMs })
      }
      return policy
    },

    invalidate(apiKeyId?: string): void {
      if (apiKeyId === undefined) {
        cache.clear()
        return
      }
      cache.delete(apiKeyId)
    },
  }
}

/**
 * Create the production {@link KeyPolicyResolver}, reading per-key policies from
 * the SQLite key store that also holds key metadata.
 *
 * @param options - Optional cache TTL / clock overrides.
 * @returns A resolver backed by the key store.
 */
export function createStoredKeyPolicyResolver(
  options: Omit<CreateKeyPolicyResolverOptions, 'load'> = {}
): KeyPolicyResolver {
  return createKeyPolicyResolver({ ...options, load: (apiKeyId) => getKeyPolicy(apiKeyId) })
}

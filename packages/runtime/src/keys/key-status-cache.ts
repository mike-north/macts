/**
 * Per-process cache of stored key statuses, consulted by API-key validation.
 *
 * Validating a key looks up its stored record; this cache spares the key store
 * one query per request. Two parties share it and nothing else touches it:
 *
 * - the validator, which reads it and fills it after a store lookup;
 * - the key store, which invalidates a key's entry whenever it changes or
 *   removes that key's record, and clears every entry when it replaces the
 *   whole key set or closes.
 *
 * So a revocation or deletion made in this process is seen by the very next
 * validation in this process. A change made by another process (the CLI
 * revoking a key while a server runs) cannot reach this cache; its entries
 * expire after {@link KEY_STATUS_TTL_MS}, which bounds how long such a change
 * can go unseen.
 *
 * Only the statuses of existing records are cached. A key with no stored
 * record is never cached, so it is looked up again on every call and can never
 * be served as valid from here.
 *
 * Internal to the keys module; not part of the package's public API.
 *
 * @packageDocumentation
 */

import { TtlCache } from './cache.js'
import type { KeyRecordStatus } from './storage.js'

/**
 * How long a cached status may be served, in milliseconds. This is the upper
 * bound on how long a change made by another process can go unseen.
 */
export const KEY_STATUS_TTL_MS = 5000

/** A status that may be cached: one backed by an existing stored record. */
export type CachedKeyStatus = Exclude<KeyRecordStatus, 'missing'>

const keyStatuses = new TtlCache<CachedKeyStatus>(KEY_STATUS_TTL_MS)

/** The cached status for `keyId`, or `undefined` when none is cached or it expired. */
export function getCachedKeyStatus(keyId: string): CachedKeyStatus | undefined {
  return keyStatuses.get(keyId)
}

/** Cache `status` for `keyId` for {@link KEY_STATUS_TTL_MS}. */
export function cacheKeyStatus(keyId: string, status: CachedKeyStatus): void {
  keyStatuses.set(keyId, status)
}

/** Drop the cached status for `keyId`, so its next validation reads the store. */
export function invalidateKeyStatus(keyId: string): void {
  keyStatuses.delete(keyId)
}

/** Drop every cached status, so each key's next validation reads the store. */
export function clearKeyStatusCache(): void {
  keyStatuses.clear()
}

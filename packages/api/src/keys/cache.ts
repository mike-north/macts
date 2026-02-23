/**
 * Simple in-memory cache with TTL (time-to-live) expiry.
 *
 * Entries expire lazily on access — no background timers needed.
 *
 * @packageDocumentation
 */

/**
 * A generic in-memory cache where each entry expires after a configurable TTL.
 *
 * @typeParam T - The type of cached values
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>()
  private readonly defaultTtlMs: number

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs
  }

  /**
   * Get a value from the cache.
   * Returns undefined if the key doesn't exist or has expired.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) {
      return undefined
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * Set a value in the cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Optional TTL override in milliseconds
   */
  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * Delete a specific entry.
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Check if a key exists and hasn't expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Number of entries (may include expired entries until accessed).
   */
  get size(): number {
    return this.store.size
  }
}

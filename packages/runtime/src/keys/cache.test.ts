import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TtlCache } from './cache.js'

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('get / set', () => {
    it('should return a value that was set', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')
      expect(cache.get('key')).toBe('value')
    })

    it('should return undefined for a missing key', () => {
      const cache = new TtlCache<string>(1000)
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should overwrite an existing key', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'first')
      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })

    it('should store different types of values', () => {
      const cache = new TtlCache<{ count: number }>(1000)
      cache.set('obj', { count: 42 })
      expect(cache.get('obj')).toEqual({ count: 42 })
    })

    it('should store boolean false without treating it as missing', () => {
      const cache = new TtlCache<boolean>(1000)
      cache.set('flag', false)
      expect(cache.get('flag')).toBe(false)
    })
  })

  describe('TTL expiry', () => {
    it('should return undefined after the default TTL elapses', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')

      vi.advanceTimersByTime(999)
      expect(cache.get('key')).toBe('value')

      vi.advanceTimersByTime(2)
      expect(cache.get('key')).toBeUndefined()
    })

    it('should support a custom TTL per entry', () => {
      const cache = new TtlCache<string>(10_000)
      cache.set('short', 'short-lived', 500)
      cache.set('long', 'long-lived')

      vi.advanceTimersByTime(501)
      expect(cache.get('short')).toBeUndefined()
      expect(cache.get('long')).toBe('long-lived')
    })

    it('should remove the expired entry from the store on access', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')
      expect(cache.size).toBe(1)

      vi.advanceTimersByTime(1001)
      // Accessing triggers lazy deletion
      cache.get('key')
      expect(cache.size).toBe(0)
    })

    it('should allow re-setting a key after it expires', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'first')

      vi.advanceTimersByTime(1001)
      expect(cache.get('key')).toBeUndefined()

      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })
  })

  describe('delete', () => {
    it('should remove an existing entry and return true', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')
      expect(cache.delete('key')).toBe(true)
      expect(cache.get('key')).toBeUndefined()
    })

    it('should return false for a non-existent key', () => {
      const cache = new TtlCache<string>(1000)
      expect(cache.delete('nonexistent')).toBe(false)
    })
  })

  describe('has', () => {
    it('should return true for an existing non-expired key', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')
      expect(cache.has('key')).toBe(true)
    })

    it('should return false for a missing key', () => {
      const cache = new TtlCache<string>(1000)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should return false for an expired key', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('key', 'value')

      vi.advanceTimersByTime(1001)
      expect(cache.has('key')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('a', '1')
      cache.set('b', '2')
      cache.set('c', '3')
      expect(cache.size).toBe(3)

      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBeUndefined()
    })
  })

  describe('size', () => {
    it('should return 0 for an empty cache', () => {
      const cache = new TtlCache<string>(1000)
      expect(cache.size).toBe(0)
    })

    it('should reflect the number of entries', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('a', '1')
      cache.set('b', '2')
      expect(cache.size).toBe(2)
    })

    it('should include expired entries that have not yet been accessed', () => {
      const cache = new TtlCache<string>(1000)
      cache.set('a', '1')
      cache.set('b', '2')

      vi.advanceTimersByTime(1001)
      // Expired but not yet accessed — still counted in size
      expect(cache.size).toBe(2)

      // Access triggers lazy deletion
      cache.get('a')
      cache.get('b')
      expect(cache.size).toBe(0)
    })
  })
})

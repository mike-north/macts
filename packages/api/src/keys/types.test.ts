import { describe, it, expect } from 'vitest'
import { parseDuration, calculateExpiration } from './types.js'

describe('parseDuration', () => {
  describe('positive cases', () => {
    it('should parse seconds', () => {
      expect(parseDuration('30s')).toBe(30 * 1000)
    })

    it('should parse minutes', () => {
      expect(parseDuration('5m')).toBe(5 * 60 * 1000)
    })

    it('should parse hours', () => {
      expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000)
    })

    it('should parse days', () => {
      expect(parseDuration('30d')).toBe(30 * 24 * 60 * 60 * 1000)
    })

    it('should parse weeks', () => {
      expect(parseDuration('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000)
    })

    it('should parse months', () => {
      expect(parseDuration('6M')).toBe(6 * 30 * 24 * 60 * 60 * 1000)
    })

    it('should parse years', () => {
      expect(parseDuration('1y')).toBe(365 * 24 * 60 * 60 * 1000)
    })

    it('should parse single digit', () => {
      expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000)
    })

    it('should parse large numbers', () => {
      expect(parseDuration('365d')).toBe(365 * 24 * 60 * 60 * 1000)
    })
  })

  describe('negative cases', () => {
    it('should throw for invalid format', () => {
      expect(() => parseDuration('abc')).toThrow()
    })

    it('should throw for empty string', () => {
      expect(() => parseDuration('')).toThrow()
    })

    it('should throw for missing number', () => {
      expect(() => parseDuration('d')).toThrow()
    })

    it('should throw for missing unit', () => {
      expect(() => parseDuration('30')).toThrow()
    })

    it('should throw for invalid unit', () => {
      expect(() => parseDuration('30x')).toThrow()
    })

    it('should throw for decimal', () => {
      expect(() => parseDuration('1.5d')).toThrow()
    })

    it('should throw for negative', () => {
      expect(() => parseDuration('-1d')).toThrow()
    })

    it('should throw for space', () => {
      expect(() => parseDuration('30 d')).toThrow()
    })
  })
})

describe('calculateExpiration', () => {
  describe('Date input', () => {
    it('should convert Date to unix seconds', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = calculateExpiration(date)
      expect(result).toBe(Math.floor(date.getTime() / 1000))
    })
  })

  describe('number input', () => {
    it('should treat small numbers as unix seconds', () => {
      const seconds = 1705320000 // Some reasonable timestamp
      const result = calculateExpiration(seconds)
      expect(result).toBe(seconds)
    })

    it('should convert milliseconds to seconds', () => {
      const ms = Date.now() + 86400000 // Tomorrow in ms
      const result = calculateExpiration(ms)
      expect(result).toBe(Math.floor(ms / 1000))
    })
  })

  describe('string input', () => {
    it('should calculate future timestamp from duration', () => {
      const now = Date.now()
      const result = calculateExpiration('1d')
      const expected = Math.floor((now + 24 * 60 * 60 * 1000) / 1000)
      // Allow 1 second tolerance for timing
      expect(Math.abs(result - expected)).toBeLessThan(2)
    })

    it('should handle various duration units', () => {
      const now = Date.now()

      const result1h = calculateExpiration('1h')
      const expected1h = Math.floor((now + 60 * 60 * 1000) / 1000)
      expect(Math.abs(result1h - expected1h)).toBeLessThan(2)

      const result30d = calculateExpiration('30d')
      const expected30d = Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000)
      expect(Math.abs(result30d - expected30d)).toBeLessThan(2)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { HumanFormatter } from './human.js'

describe('HumanFormatter', () => {
  const formatter = new HumanFormatter()

  describe('format', () => {
    it('should format simple objects as key-value pairs', () => {
      const result = formatter.format({ name: 'Test', value: 42 })
      expect(result).toContain('name: Test')
      expect(result).toContain('value: 42')
    })

    it('should handle null and undefined', () => {
      expect(formatter.format(null)).toBe('')
      expect(formatter.format(undefined)).toBe('')
    })

    it('should handle primitive values', () => {
      expect(formatter.format('hello')).toBe('hello')
      expect(formatter.format(42)).toBe('42')
      expect(formatter.format(true)).toBe('true')
    })

    it('should format nested objects with JSON', () => {
      const result = formatter.format({ nested: { a: 1 } })
      expect(result).toContain('nested:')
      expect(result).toContain('{"a":1}')
    })
  })

  describe('formatList', () => {
    it('should format arrays as tables', () => {
      const result = formatter.formatList([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ])
      expect(result).toContain('id')
      expect(result).toContain('name')
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })

    it('should handle empty arrays', () => {
      const result = formatter.formatList([])
      expect(result).toBe('No items found.')
    })

    it('should respect column configuration', () => {
      const result = formatter.formatList([{ id: '1', name: 'Test' }], {
        columns: [{ header: 'ID', key: 'id' }],
      })
      expect(result).toContain('ID')
      expect(result).toContain('1')
      expect(result).not.toContain('name')
    })

    it('should handle boolean values', () => {
      const result = formatter.formatList([{ active: true }, { active: false }])
      expect(result).toContain('yes')
      expect(result).toContain('no')
    })
  })

  describe('formatError', () => {
    it('should prefix with Error:', () => {
      const result = formatter.formatError('Something went wrong')
      expect(result).toBe('Error: Something went wrong')
    })

    it('should handle Error objects', () => {
      const result = formatter.formatError(new Error('Test error'))
      expect(result).toBe('Error: Test error')
    })
  })

  describe('formatSuccess', () => {
    it('should return the message as-is', () => {
      const result = formatter.formatSuccess('Operation completed')
      expect(result).toBe('Operation completed')
    })
  })
})

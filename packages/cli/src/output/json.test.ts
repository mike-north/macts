import { describe, it, expect } from 'vitest'
import { JsonFormatter } from './json.js'

describe('JsonFormatter', () => {
  const formatter = new JsonFormatter()

  describe('format', () => {
    it('should format simple objects', () => {
      const result = formatter.format({ name: 'Test', value: 42 })
      const parsed = JSON.parse(result) as { data: { name: string; value: number } }
      expect(parsed.data).toEqual({ name: 'Test', value: 42 })
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T09:00:00.000Z')
      const result = formatter.format({ date })
      const parsed = JSON.parse(result) as { data: { date: string } }
      expect(parsed.data.date).toBe('2024-01-15T09:00:00.000Z')
    })

    it('should handle null and undefined', () => {
      const result = formatter.format({ a: null, b: undefined })
      const parsed = JSON.parse(result) as { data: { a: null; b?: undefined } }
      expect(parsed.data.a).toBe(null)
    })

    it('should handle RGB objects', () => {
      const result = formatter.format({ color: { r: 255, g: 128, b: 0 } })
      const parsed = JSON.parse(result) as { data: { color: { r: number; g: number; b: number } } }
      expect(parsed.data.color).toEqual({ r: 255, g: 128, b: 0 })
    })
  })

  describe('formatList', () => {
    it('should format arrays', () => {
      const result = formatter.formatList([{ id: 1 }, { id: 2 }])
      const parsed = JSON.parse(result) as { data: { id: number }[] }
      expect(parsed.data).toHaveLength(2)
      expect(parsed.data[0]).toEqual({ id: 1 })
    })

    it('should handle empty arrays', () => {
      const result = formatter.formatList([])
      const parsed = JSON.parse(result) as { data: unknown[] }
      expect(parsed.data).toEqual([])
    })
  })

  describe('formatError', () => {
    it('should format error messages', () => {
      const result = formatter.formatError('Something went wrong')
      const parsed = JSON.parse(result) as { error: { message: string } }
      expect(parsed.error.message).toBe('Something went wrong')
    })

    it('should format Error objects', () => {
      const error = new Error('Test error')
      const result = formatter.formatError(error)
      const parsed = JSON.parse(result) as { error: { message: string; stack?: string } }
      expect(parsed.error.message).toBe('Test error')
      expect(parsed.error.stack).toBeDefined()
    })
  })

  describe('formatSuccess', () => {
    it('should format success messages', () => {
      const result = formatter.formatSuccess('Operation completed')
      const parsed = JSON.parse(result) as { success: boolean; message: string }
      expect(parsed.success).toBe(true)
      expect(parsed.message).toBe('Operation completed')
    })
  })
})

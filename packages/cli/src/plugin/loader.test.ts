import { describe, it, expect } from 'vitest'
import { discoverPlugins, loadPlugin } from './loader.js'

describe('loadPlugin', () => {
  describe('package name validation', () => {
    it('should reject invalid package names', async () => {
      const result = await loadPlugin('invalid-package')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject non-scoped package names', async () => {
      const result = await loadPlugin('cli-calendar')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject wrong scope prefix', async () => {
      const result = await loadPlugin('@other/cli-calendar')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject empty string package names', async () => {
      const result = await loadPlugin('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject infrastructure packages', async () => {
      const result = await loadPlugin('@macts/core')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject server packages', async () => {
      const result = await loadPlugin('@macts/calendar-server')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject package names with uppercase', async () => {
      const result = await loadPlugin('@macts/Calendar')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject package names with special characters', async () => {
      const result = await loadPlugin('@macts/my_app')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })
  })

  describe('module loading', () => {
    it('should handle module not found errors', async () => {
      const result = await loadPlugin('@macts/nonexistent')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })
})

describe('discoverPlugins', () => {
  it('should return plugins and errors arrays', async () => {
    const result = await discoverPlugins()

    expect(result).toHaveProperty('plugins')
    expect(result).toHaveProperty('errors')
    expect(Array.isArray(result.plugins)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })
})

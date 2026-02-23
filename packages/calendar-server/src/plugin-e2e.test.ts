import { describe, it, expect } from 'vitest'

/**
 * E2E tests for the @macts/calendar-server plugin exports.
 *
 * These tests import the real workspace package and validate the plugin shapes
 * match what the API and MCP loaders expect. No fixtures needed — this tests
 * the actual built code.
 */

describe('@macts/calendar-server root export (API plugin)', () => {
  it('should export a plugin object', async () => {
    const mod = await import('./index.js')
    expect(mod.plugin).toBeDefined()
  })

  it('should have name, bundleId, and manifest', async () => {
    const { plugin } = await import('./index.js')
    expect(typeof plugin.name).toBe('string')
    expect(typeof plugin.bundleId).toBe('string')
    expect(plugin.manifest).toBeDefined()
    expect(typeof plugin.manifest).toBe('object')
  })

  it('should have name "calendar"', async () => {
    const { plugin } = await import('./index.js')
    expect(plugin.name).toBe('calendar')
  })

  it('should have bundleId "com.apple.iCal"', async () => {
    const { plugin } = await import('./index.js')
    expect(plugin.bundleId).toBe('com.apple.iCal')
  })

  describe('manifest shape', () => {
    it('should have app metadata', async () => {
      const { plugin } = await import('./index.js')
      const manifest = plugin.manifest

      expect(manifest.app).toBeDefined()
      expect(typeof manifest.app.bundleId).toBe('string')
      expect(typeof manifest.app.name).toBe('string')
    })

    it('should have resources', async () => {
      const { plugin } = await import('./index.js')
      const manifest = plugin.manifest

      expect(manifest.resources).toBeDefined()
      expect(typeof manifest.resources).toBe('object')

      // Calendar must have at least Calendar and Event resources
      expect(manifest.resources['Calendar']).toBeDefined()
      expect(manifest.resources['Event']).toBeDefined()
    })

    it('should have commands', async () => {
      const { plugin } = await import('./index.js')
      const manifest = plugin.manifest

      expect(manifest.commands).toBeDefined()
      expect(typeof manifest.commands).toBe('object')

      // Should have core CRUD commands
      expect(manifest.commands['list']).toBeDefined()
      expect(manifest.commands['get']).toBeDefined()
      expect(manifest.commands['create']).toBeDefined()
    })

    it('should have enums', async () => {
      const { plugin } = await import('./index.js')
      const manifest = plugin.manifest

      expect(manifest.enums).toBeDefined()
      expect(typeof manifest.enums).toBe('object')
    })

    it('should have hierarchy', async () => {
      const { plugin } = await import('./index.js')
      const manifest = plugin.manifest

      expect(manifest.hierarchy).toBeDefined()
      expect(manifest.hierarchy.children).toBeDefined()
    })
  })
})

describe('@macts/calendar-server/mcp export (MCP plugin)', () => {
  it('should export a plugin object', async () => {
    const mod = await import('./mcp/index.js')
    expect(mod.plugin).toBeDefined()
  })

  it('should have name, description, and tools array', async () => {
    const { plugin } = await import('./mcp/index.js')
    expect(typeof plugin.name).toBe('string')
    expect(typeof plugin.description).toBe('string')
    expect(Array.isArray(plugin.tools)).toBe(true)
  })

  it('should have name "calendar"', async () => {
    const { plugin } = await import('./mcp/index.js')
    expect(plugin.name).toBe('calendar')
  })

  it('should have at least one tool', async () => {
    const { plugin } = await import('./mcp/index.js')
    expect(plugin.tools.length).toBeGreaterThan(0)
  })

  describe('tool structure', () => {
    it('each tool should have name, description, inputSchema, and handler', async () => {
      const { plugin } = await import('./mcp/index.js')

      for (const tool of plugin.tools) {
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(tool.inputSchema).toBeDefined()
        expect(typeof tool.inputSchema).toBe('object')
        expect(tool.inputSchema).not.toBeNull()
        expect(typeof tool.handler).toBe('function')
      }
    })

    it('tool names should follow macts__calendar__* pattern', async () => {
      const { plugin } = await import('./mcp/index.js')

      for (const tool of plugin.tools) {
        expect(tool.name).toMatch(/^macts__calendar__/)
      }
    })

    it('tool names should be unique', async () => {
      const { plugin } = await import('./mcp/index.js')

      const names = plugin.tools.map((t) => t.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('inputSchema should have a type property', async () => {
      const { plugin } = await import('./mcp/index.js')

      for (const tool of plugin.tools) {
        expect(tool.inputSchema.type).toBeDefined()
      }
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discoverMcpPlugins, loadMcpPlugin } from './loader.js'

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

// Mock cache module
vi.mock('./cache.js', () => ({
  readMcpPluginCache: vi.fn(() => null),
  writeMcpPluginCache: vi.fn(),
  invalidateMcpPluginCache: vi.fn(),
}))

describe('loadMcpPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid package names', async () => {
    const result = await loadMcpPlugin('invalid-package')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid MCP plugin package name')
    }
  })

  it('should reject non-scoped packages', async () => {
    const result = await loadMcpPlugin('calendar-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid MCP plugin package name')
    }
  })

  it('should reject wrong scope', async () => {
    const result = await loadMcpPlugin('@other/calendar-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid MCP plugin package name')
    }
  })

  it('should reject packages without -server suffix', async () => {
    const result = await loadMcpPlugin('@macts/calendar')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid MCP plugin package name')
    }
  })

  it('should accept valid @macts/*-server packages', async () => {
    // This will fail to load the module, but package name validation should pass
    const result = await loadMcpPlugin('@macts/calendar-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      // Should fail at module loading, not validation
      expect(result.error).not.toContain('Invalid MCP plugin package name')
    }
  })

  it('should accept @macts/*-server with hyphens', async () => {
    const result = await loadMcpPlugin('@macts/some-app-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).not.toContain('Invalid MCP plugin package name')
    }
  })
})

describe('discoverMcpPlugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty result when no plugins installed', async () => {
    const result = await discoverMcpPlugins()
    expect(result.plugins).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('should use cache when available', async () => {
    const { readMcpPluginCache } = await import('./cache.js')

    // Mock cache returning a plugin
    vi.mocked(readMcpPluginCache).mockReturnValue([
      {
        packageName: '@macts/test-server',
        name: 'test',
        description: 'Test plugin',
      },
    ])

    const result = await discoverMcpPlugins()

    expect(readMcpPluginCache).toHaveBeenCalled()
    // The plugin will fail to load (can't resolve @macts/test-server/mcp), so we expect errors
    expect(result.plugins).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.packageName).toBe('@macts/test-server')
  })
})

describe('plugin validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject plugin without name', async () => {
    // Mock a module that exports an invalid plugin (no name)
    vi.doMock('@macts/no-name-server/mcp', () => ({
      plugin: {
        description: 'Test',
        tools: [],
      },
    }))

    const result = await loadMcpPlugin('@macts/no-name-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin without description', async () => {
    // Mock a module that exports an invalid plugin (no description)
    vi.doMock('@macts/no-desc-server/mcp', () => ({
      plugin: {
        name: 'test',
        tools: [],
      },
    }))

    const result = await loadMcpPlugin('@macts/no-desc-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin without tools array', async () => {
    // Mock a module that exports an invalid plugin (no tools)
    vi.doMock('@macts/no-tools-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
      },
    }))

    const result = await loadMcpPlugin('@macts/no-tools-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (missing name)', async () => {
    // Mock a module with tool missing name
    vi.doMock('@macts/bad-tool-name-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            // name is missing
            description: 'Test tool',
            inputSchema: { type: 'object' },
            handler: () => ({}),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/bad-tool-name-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (missing description)', async () => {
    // Mock a module with tool missing description
    vi.doMock('@macts/bad-tool-desc-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            name: 'test-tool',
            // description is missing
            inputSchema: { type: 'object' },
            handler: () => ({}),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/bad-tool-desc-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (missing inputSchema)', async () => {
    // Mock a module with tool missing inputSchema
    vi.doMock('@macts/bad-tool-schema-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            // inputSchema is missing
            handler: () => ({}),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/bad-tool-schema-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (inputSchema is null)', async () => {
    // Mock a module with tool having null inputSchema
    vi.doMock('@macts/null-schema-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            inputSchema: null,
            handler: () => ({}),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/null-schema-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (missing handler)', async () => {
    // Mock a module with tool missing handler
    vi.doMock('@macts/bad-tool-handler-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
            // handler is missing
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/bad-tool-handler-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should reject plugin with invalid tool (handler is not a function)', async () => {
    // Mock a module with tool having non-function handler
    vi.doMock('@macts/handler-not-func-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test',
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
            handler: 'not-a-function',
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/handler-not-func-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })

  it('should accept valid plugin with valid tools', async () => {
    // Mock a valid plugin module
    vi.doMock('@macts/valid-test-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test plugin',
        tools: [
          {
            name: 'test-tool',
            description: 'Test tool',
            inputSchema: { type: 'object', properties: {} },
            handler: () => ({ result: 'ok' }),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/valid-test-server')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.plugin.name).toBe('test')
      expect(result.plugin.tools).toHaveLength(1)
    }
  })

  it('should accept plugin with multiple valid tools', async () => {
    // Mock a plugin with multiple tools
    vi.doMock('@macts/multi-tools-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test plugin',
        tools: [
          {
            name: 'tool1',
            description: 'Tool 1',
            inputSchema: { type: 'object' },
            handler: () => ({ result: 'ok' }),
          },
          {
            name: 'tool2',
            description: 'Tool 2',
            inputSchema: { type: 'object' },
            handler: () => ({ result: 'ok' }),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/multi-tools-server')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.plugin.tools).toHaveLength(2)
    }
  })

  it('should reject plugin when one tool is invalid among valid tools', async () => {
    // Mock a plugin with one invalid tool
    vi.doMock('@macts/mixed-tools-server/mcp', () => ({
      plugin: {
        name: 'test',
        description: 'Test plugin',
        tools: [
          {
            name: 'valid-tool',
            description: 'Valid tool',
            inputSchema: { type: 'object' },
            handler: () => ({ result: 'ok' }),
          },
          {
            name: 'invalid-tool',
            description: 'Invalid tool',
            // Missing inputSchema
            handler: () => ({ result: 'ok' }),
          },
        ],
      },
    }))

    const result = await loadMcpPlugin('@macts/mixed-tools-server')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('invalid plugin')
    }
  })
})

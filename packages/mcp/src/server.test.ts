import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMcpServer } from './server.js'
import type { McpPlugin } from './types.js'
import * as auth from './auth.js'

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const mockServer = {
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  }

  return {
    Server: vi.fn(() => mockServer),
  }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(() => ({})),
}))

// Mock startup API key validation so these tests don't depend on real
// @macts/api key storage; the auth module itself is covered by auth.test.ts.
vi.mock('./auth.js', () => ({
  requireStartupApiKey: vi.fn().mockResolvedValue(undefined),
}))

describe('createMcpServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.requireStartupApiKey).mockResolvedValue(undefined)
  })

  it('should create a server with no plugins', async () => {
    await expect(createMcpServer([])).resolves.toBeUndefined()
  })

  it('should create a server with plugins', async () => {
    const mockPlugin: McpPlugin = {
      name: 'test',
      description: 'Test plugin',
      tools: [
        {
          name: 'macts__test__foo',
          description: 'Test tool',
          inputSchema: { type: 'object' },
          handler: async () => Promise.resolve({ result: 'ok' }),
        },
      ],
    }

    await expect(createMcpServer([mockPlugin])).resolves.toBeUndefined()
  })

  it('should reject duplicate tool names', async () => {
    const tool = {
      name: 'macts__test__foo',
      description: 'Test tool',
      inputSchema: { type: 'object' },
      handler: async () => Promise.resolve({ result: 'ok' }),
    }

    const plugin1: McpPlugin = {
      name: 'test1',
      description: 'Test plugin 1',
      tools: [tool],
    }

    const plugin2: McpPlugin = {
      name: 'test2',
      description: 'Test plugin 2',
      tools: [tool],
    }

    await expect(createMcpServer([plugin1, plugin2])).rejects.toThrow('Duplicate tool name')
  })

  it('should use custom server options', async () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')

    await createMcpServer([], {
      name: 'custom-server',
      version: '1.2.3',
    })

    expect(Server).toHaveBeenCalledWith(
      {
        name: 'custom-server',
        version: '1.2.3',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )
  })

  it('should use default server options', async () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')

    await createMcpServer([])

    expect(Server).toHaveBeenCalledWith(
      {
        name: 'macts-mcp',
        version: '0.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )
  })

  describe('API key validation', () => {
    afterEach(() => {
      vi.mocked(auth.requireStartupApiKey).mockReset()
    })

    it('rejects with the remediation message when MACTS_API_KEY is missing', async () => {
      vi.mocked(auth.requireStartupApiKey).mockRejectedValue(
        new Error(
          'MACTS_API_KEY environment variable is not set.\n' +
            'Create an API key with:\n' +
            '  macts api-key create --name <name> --permission <app:resource:operation>'
        )
      )

      await expect(createMcpServer([])).rejects.toThrow(/MACTS_API_KEY/)
      await expect(createMcpServer([])).rejects.toThrow(/macts api-key create/)
      expect(auth.requireStartupApiKey).toHaveBeenCalled()
    })

    it('resolves without checking the API key when disableApiKeyValidation is true', async () => {
      vi.mocked(auth.requireStartupApiKey).mockRejectedValue(new Error('should not be called'))

      await expect(createMcpServer([], { disableApiKeyValidation: true })).resolves.toBeUndefined()
      expect(auth.requireStartupApiKey).not.toHaveBeenCalled()
    })
  })
})

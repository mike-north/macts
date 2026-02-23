import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMcpServer } from './server.js'
import type { McpPlugin } from './types.js'

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

describe('createMcpServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { McpServeCommand } from './serve.js'
import * as mcp from '@macts/mcp'
import { createMockStreams } from './test-helpers.js'
import type { McpPlugin, DaemonServer } from '@macts/mcp'

describe('McpServeCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpServeCommand)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fail when no plugins are found', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    // Mock plugin discovery to return no plugins
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('No MCP plugins found')
    expect(getStderr()).toContain('macts plugin install')
  })

  it('should log plugin load errors to stderr', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    // Mock plugin discovery to return error
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [
        {
          packageName: '@macts/broken-server',
          message: 'Failed to load',
        },
      ],
    })

    // Create a mock daemon that doesn't actually block
    const mockDaemon: DaemonServer = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    // Run command but don't wait for it (it blocks forever)
    const promise = cli.run(['mcp', 'serve'], { stdout, stderr })

    // Give it time to start
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    expect(getStderr()).toContain('Warning: Failed to load plugin @macts/broken-server')
    expect(getStderr()).toContain('Failed to load')

    // Clean up - resolve the blocking promise
    await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 10))])
  })

  it('should start daemon with discovered plugins on default socket', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [],
    })

    vi.spyOn(mcp, 'getSocketPath').mockReturnValue('/tmp/test.sock')

    const mockDaemon: DaemonServer = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    const createDaemonSpy = vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    // Run command but don't wait for it
    const promise = cli.run(['mcp', 'serve'], { stdout, stderr })

    // Give it time to start
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    expect(createDaemonSpy).toHaveBeenCalledWith({
      plugins: [mockPlugin],
      port: undefined,
      socketPath: '/tmp/test.sock',
      disableApiKeyValidation: false,
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method -- mock assertion
    expect(mockDaemon.start).toHaveBeenCalled()
    expect(getStderr()).toContain('MCP server running')
    expect(getStderr()).toContain('Loaded 1 plugin(s)')
    expect(getStderr()).toContain('API key validation: enabled')

    // Clean up
    await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 10))])
  })

  it('should start daemon with custom port', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [],
    })

    const mockDaemon: DaemonServer = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    const createDaemonSpy = vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    // Run command but don't wait for it
    const promise = cli.run(['mcp', 'serve', '--port', '3000'], { stdout, stderr })

    // Give it time to start
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    expect(createDaemonSpy).toHaveBeenCalledWith({
      plugins: [mockPlugin],
      port: 3000,
      socketPath: expect.any(String) as string,
      disableApiKeyValidation: false,
    })

    expect(getStderr()).toContain('http://127.0.0.1:3000')

    // Clean up
    await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 10))])
  })

  it('should forward --disable-api-key-validation to createDaemon and log disabled state', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [],
    })

    const mockDaemon: DaemonServer = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    const createDaemonSpy = vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    const promise = cli.run(['mcp', 'serve', '--disable-api-key-validation'], { stdout, stderr })

    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    expect(createDaemonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ disableApiKeyValidation: true })
    )
    expect(getStderr()).toContain('API key validation: disabled')

    await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 10))])
  })

  it('should handle daemon start failure', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [],
    })

    const mockDaemon: DaemonServer = {
      start: vi.fn().mockRejectedValue(new Error('Port already in use')),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('Failed to start MCP server')
    expect(getStderr()).toContain('Port already in use')
  })
})

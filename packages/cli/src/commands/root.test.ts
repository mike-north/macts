import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Writable } from 'node:stream'
import { Cli } from 'clipanion'
import { RootCommand } from './root.js'
import * as mcp from '@macts/mcp'
import * as apiServer from '@macts/api/server'
import * as core from '@macts/core'

function createMockStreams() {
  let stdoutOutput = ''
  let stderrOutput = ''

  const stdout = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      stdoutOutput += chunk.toString()
      callback()
    },
  })

  const stderr = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      stderrOutput += chunk.toString()
      callback()
    },
  })

  return {
    stdout,
    stderr,
    getStdout: () => stdoutOutput,
    getStderr: () => stderrOutput,
  }
}

describe('RootCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(RootCommand)
  })

  it('should show help message when no flags are provided', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    const exitCode = await cli.run([], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(getStdout()).toContain('macts - macOS application automation CLI')
    expect(getStdout()).toContain('Use --help to see available commands')
  })

  it('should start MCP server with only the built-in discovery plugin when no plugins are installed', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    // Mock plugin discovery to return no installed plugins
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    // Mock server creation to resolve immediately
    const createServerSpy = vi.spyOn(mcp, 'createMcpServer').mockResolvedValue(undefined)

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(0)
    // The built-in capability-discovery plugin is always prepended, so the
    // server starts with exactly one plugin exposing the discovery tool.
    const plugins = createServerSpy.mock.calls[0]?.[0] as mcp.McpPlugin[]
    expect(plugins).toHaveLength(1)
    expect(plugins[0]?.name).toBe('capabilities')
    expect(plugins[0]?.tools.map((t) => t.name)).toContain('macts__capabilities__discover')
    expect(getStderr()).toContain('Starting MCP server with 1 plugin(s)')
  })

  it('should start MCP server with the discovery plugin plus discovered plugins', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const mockPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [],
    }

    // Mock plugin discovery to return a plugin
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [],
    })

    // Mock server creation
    const createServerSpy = vi.spyOn(mcp, 'createMcpServer').mockResolvedValue(undefined)

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(0)
    // Discovery plugin is prepended ahead of the discovered plugin.
    const plugins = createServerSpy.mock.calls[0]?.[0] as mcp.McpPlugin[]
    expect(plugins).toHaveLength(2)
    expect(plugins[0]?.name).toBe('capabilities')
    expect(plugins[1]).toEqual(mockPlugin)
    expect(getStderr()).toContain('Starting MCP server with 2 plugin(s)')
  })

  it('should log plugin errors to stderr when --mcp is provided', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    // Mock plugin discovery to return an error
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [
        {
          packageName: '@macts/broken-server',
          message: 'Failed to load plugin',
        },
      ],
    })

    // Mock server creation
    vi.spyOn(mcp, 'createMcpServer').mockResolvedValue(undefined)

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(getStderr()).toContain('Plugin load error: @macts/broken-server: Failed to load plugin')
  })

  it('should handle MCP server creation failure', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    // Mock plugin discovery
    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    // Mock server creation to fail
    vi.spyOn(mcp, 'createMcpServer').mockRejectedValue(new Error('Server start failed'))

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('Failed to start MCP server: Server start failed')
  })

  describe('--serve flag', () => {
    let mockServer: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; url: string }

    beforeEach(() => {
      // Create mock server
      mockServer = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        url: 'http://localhost:8372',
      }

      // Mock createServer to return our mock
      vi.spyOn(apiServer, 'createServer').mockReturnValue({
        app: {} as ReturnType<typeof apiServer.createServer>['app'],
        ...mockServer,
      })

      // Mock loadManifest
      vi.spyOn(core, 'loadManifest').mockResolvedValue({
        version: '1.0' as const,
        app: {
          name: 'TestApp',
          bundleId: 'com.test.app',
          displayName: 'Test App',
          tccEntitlements: [],
        },
        suites: [],
        resources: {},
        commands: {},
        enums: {},
        hierarchy: { children: {} },
        relationships: [],
      })

      // Emit SIGINT after a short delay to end the server
      const originalOn = process.on.bind(process)
      vi.spyOn(process, 'on').mockImplementation((event, handler) => {
        if (event === 'SIGINT') {
          // Immediately call the handler to simulate shutdown
          setImmediate(() => {
            ;(handler as () => void)()
          })
          return process
        }
        return originalOn(event, handler)
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should start HTTP server when --serve is provided', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()
      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(mockServer.start).toHaveBeenCalled()
      expect(getStdout()).toContain('macts API server running')
    })

    it('should use provided port when --serve --port is provided', async () => {
      const { stdout, stderr } = createMockStreams()

      // Update mock for custom port
      mockServer.url = 'http://localhost:8080'
      vi.spyOn(apiServer, 'createServer').mockReturnValue({
        app: {} as ReturnType<typeof apiServer.createServer>['app'],
        ...mockServer,
      })

      const exitCode = await cli.run(['--serve', '--port', '8080'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(apiServer.createServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ port: 8080 })
      )
    })

    // Note: Testing "manifest not found" is difficult in ESM due to inability to mock fs.existsSync.
    // The actual manifest file exists in the repository, so this scenario can't be easily simulated.
    // Server startup errors are tested via the createServer mock in other tests.
  })
})

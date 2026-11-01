import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Writable } from 'node:stream'
import { Cli } from 'clipanion'
import { RootCommand } from './root.js'
import * as mcp from '@macts/mcp'
import * as apiServer from '@macts/api/server'
import { dirname } from 'node:path'
import {
  createPluginsFixture,
  writeAppPackage,
  writeInstalledApp,
  type PluginsFixture,
} from '../host/installed-apps-fixtures.js'

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

  it('should forward disableApiKeyValidation: false to createMcpServer by default', async () => {
    const { stdout, stderr } = createMockStreams()

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    const createServerSpy = vi.spyOn(mcp, 'createMcpServer').mockResolvedValue(undefined)

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(createServerSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ disableApiKeyValidation: false })
    )
  })

  it('should forward disableApiKeyValidation: true to createMcpServer when flag is set', async () => {
    const { stdout, stderr } = createMockStreams()

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    const createServerSpy = vi.spyOn(mcp, 'createMcpServer').mockResolvedValue(undefined)

    const exitCode = await cli.run(['--mcp', '--disable-api-key-validation'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(createServerSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ disableApiKeyValidation: true })
    )
  })

  it('should exit 1 and print only the error message (no stack) when startup API key validation fails', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    const authError = new Error(
      'MACTS_API_KEY environment variable is not set.\nCreate an API key with:'
    )
    vi.spyOn(mcp, 'createMcpServer').mockRejectedValue(authError)

    const exitCode = await cli.run(['--mcp'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('MACTS_API_KEY environment variable is not set.')
    expect(getStderr()).not.toContain(authError.stack ?? '__unused__')
    expect(getStderr()).not.toMatch(/at .*:\d+:\d+/)
  })

  describe('--serve flag', () => {
    let mockServer: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; url: string }
    let plugins: PluginsFixture
    /** The registrar the mocked server hands to the `register` option. */
    let registrar: {
      registerContract: ReturnType<typeof vi.fn>
      registerManifest: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      plugins = createPluginsFixture()
      // MACTS_HOME/plugins/node_modules is the fixture's node_modules.
      vi.stubEnv('MACTS_HOME', dirname(dirname(plugins.nodeModules)))
      vi.stubEnv('MACTS_TEST_EXECUTOR', '')

      mockServer = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        url: 'http://localhost:8372',
      }
      registrar = { registerContract: vi.fn(), registerManifest: vi.fn() }

      // The mocked server runs the registration callback the way the real one
      // does while it is constructed.
      vi.spyOn(apiServer, 'createMultiServer').mockImplementation((_manifests, options) => {
        options?.register?.(registrar)
        return {
          app: {} as ReturnType<typeof apiServer.createMultiServer>['app'],
          ...mockServer,
        }
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
      vi.unstubAllEnvs()
      plugins.dispose()
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

      mockServer.url = 'http://localhost:8080'

      const exitCode = await cli.run(['--serve', '--port', '8080'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(apiServer.createMultiServer).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ port: 8080 })
      )
    })

    it('should start with no apps, say so, and list no operation endpoint', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain(
        'No apps are installed, so no operations are served. Use `macts mcp install <app>` to add one.'
      )
      expect(getStdout()).not.toContain('/api/v1/rpc/')
      expect(registrar.registerContract).not.toHaveBeenCalled()
    })

    it('should register installed apps from their contracts and report them', async () => {
      writeInstalledApp(plugins.nodeModules, 'widgets')
      writeInstalledApp(plugins.nodeModules, 'gadgets', { exportsContract: false })
      writeAppPackage(plugins.nodeModules, 'sprockets')
      const { stdout, stderr, getStdout } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(registrar.registerContract).toHaveBeenCalledTimes(1)
      expect(registrar.registerManifest).not.toHaveBeenCalled()
      const output = getStdout()
      expect(output).toContain('Serving 1 app(s):\n  widgets\n')
      expect(output).toContain(
        "Not serving 1 app(s) that failed to register:\n  gadgets: Package @macts/gadgets does not define a './contract' export"
      )
      expect(output).toContain(
        'Not serving 1 app(s) installed without their server package:\n  sprockets: install @macts/sprockets-server with `macts mcp install sprockets`\n'
      )
      expect(output).toContain('POST http://localhost:8372/api/v1/rpc/{app}.{resource}.{operation}')
      // The native executor is not announced.
      expect(output).not.toContain('Executor:')
    })

    it('should say no apps are served when every installed app is reported', async () => {
      writeAppPackage(plugins.nodeModules, 'sprockets')
      const { stdout, stderr, getStdout } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('No apps are served.\n')
      expect(getStdout()).not.toContain('No apps are installed')
      expect(getStdout()).toContain('sprockets: install @macts/sprockets-server')
    })

    it('should run on the stub test executor, announcing it', async () => {
      vi.stubEnv('MACTS_TEST_EXECUTOR', 'stub')
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStderr()).toContain('Warning: MACTS_TEST_EXECUTOR=stub is set')
      expect(getStdout()).toContain('Executor: test-stub\n')
      const options = vi.mocked(apiServer.createMultiServer).mock.calls[0]?.[1]
      expect(options?.executor?.provider).toBe('test-stub')
    })

    it('should fail startup for an unknown test executor name', async () => {
      vi.stubEnv('MACTS_TEST_EXECUTOR', 'bogus')
      const { stdout, stderr, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain(
        'Failed to start HTTP server: MACTS_TEST_EXECUTOR is set to "bogus", which is not a built-in test executor.'
      )
      expect(apiServer.createMultiServer).not.toHaveBeenCalled()
    })
  })
})

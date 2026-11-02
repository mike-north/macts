import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest'
import { Writable } from 'node:stream'
import { Cli } from 'clipanion'
import { MISSING_MCP_API_KEY_MESSAGE, RootCommand } from './root.js'
import { REMOVED_TRUST_SWITCH_ENV, REMOVED_TRUST_SWITCH_ENV_WARNING } from '../removed-options.js'
import * as mcp from '@macts/mcp'
import * as apiServer from '@macts/api/server'
import { dirname } from 'node:path'
import {
  createPluginsFixture,
  writeAppPackage,
  writeInstalledApp,
  type PluginsFixture,
} from '../host/installed-apps-fixtures.js'

/** The key `macts --mcp` is started with in these tests; never verified here. */
const SESSION_KEY = 'macts_sk_root-command-test'

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

  describe('--mcp flag', () => {
    let plugins: PluginsFixture
    let startStdio: MockInstance<typeof mcp.startStdioServer>

    beforeEach(() => {
      plugins = createPluginsFixture()
      // MACTS_HOME/plugins/node_modules is the fixture's node_modules.
      vi.stubEnv('MACTS_HOME', dirname(dirname(plugins.nodeModules)))
      vi.stubEnv('MACTS_TEST_EXECUTOR', '')
      vi.stubEnv('MACTS_API_KEY', SESSION_KEY)
      vi.stubEnv(REMOVED_TRUST_SWITCH_ENV, undefined)
      startStdio = vi
        .spyOn(mcp, 'startStdioServer')
        .mockResolvedValue({ close: () => Promise.resolve() })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
      plugins.dispose()
    })

    /** The options `macts --mcp` started the stdio server with. */
    function stdioOptions(): mcp.StdioServerOptions {
      const options = startStdio.mock.calls[0]?.[0]
      if (options === undefined) throw new Error('startStdioServer was not called')
      return options
    }

    it('serves the installed apps’ operation tools and the discovery tool, under the session key', async () => {
      writeInstalledApp(plugins.nodeModules, 'widgets')
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(0)
      const { adapter, credential } = stdioOptions()
      expect(adapter.listTools().map((tool) => tool.name)).toEqual([
        'macts__capabilities__discover',
        'macts__widgets__widgets_list',
      ])
      expect(credential.reveal()).toBe(SESSION_KEY)
      expect(getStderr()).toContain('Serving 1 app(s):\n  widgets\n')
      expect(getStderr()).toContain('MCP server running on stdio with 2 tool(s)\n')
      // Stdout is the MCP channel: nothing else may be written to it.
      expect(getStdout()).toBe('')
    })

    it('reports apps it cannot serve on stderr, never stdout', async () => {
      writeInstalledApp(plugins.nodeModules, 'gadgets', { hostShape: 'older' })
      writeAppPackage(plugins.nodeModules, 'sprockets')
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStderr()).toContain(
        "Not serving 1 app(s) that failed to register:\n  gadgets: @macts/gadgets-server is from an older macts and does not export its app's contract. Reinstall it with `macts mcp install gadgets`.\n"
      )
      expect(getStderr()).toContain(
        'sprockets: install @macts/sprockets-server with `macts mcp install sprockets`'
      )
      expect(getStdout()).toBe('')
    })

    it('fails startup without MACTS_API_KEY, naming how to create a key', async () => {
      vi.stubEnv('MACTS_API_KEY', undefined)
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toBe(`Failed to start MCP server: ${MISSING_MCP_API_KEY_MESSAGE}\n`)
      expect(getStderr()).toContain('macts api-key create')
      expect(getStdout()).toBe('')
      expect(startStdio).not.toHaveBeenCalled()
    })

    it('treats a blank MACTS_API_KEY as missing', async () => {
      vi.stubEnv('MACTS_API_KEY', '   ')
      const { stdout, stderr, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('MACTS_API_KEY is not set.')
      expect(startStdio).not.toHaveBeenCalled()
    })

    it('runs on the stub test executor, announcing it on stderr', async () => {
      vi.stubEnv('MACTS_TEST_EXECUTOR', 'stub')
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStderr()).toContain('Warning: MACTS_TEST_EXECUTOR=stub is set')
      expect(getStderr()).toContain('Executor: test-stub\n')
      expect(getStdout()).toBe('')
    })

    it('fails startup for an unknown test executor name', async () => {
      vi.stubEnv('MACTS_TEST_EXECUTOR', 'bogus')
      const { stdout, stderr, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain(
        'Failed to start MCP server: MACTS_TEST_EXECUTOR is set to "bogus", which is not a built-in test executor.'
      )
      expect(startStdio).not.toHaveBeenCalled()
    })

    it('prints only the message, with no stack, when the stdio server fails to start', async () => {
      const failure = new Error('stdin is closed')
      startStdio.mockRejectedValue(failure)
      const { stdout, stderr, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Failed to start MCP server: stdin is closed\n')
      expect(getStderr()).not.toMatch(/at .*:\d+:\d+/)
    })

    it(`warns on stderr when ${REMOVED_TRUST_SWITCH_ENV} is set, and still requires a key`, async () => {
      vi.stubEnv(REMOVED_TRUST_SWITCH_ENV, '1')
      vi.stubEnv('MACTS_API_KEY', undefined)
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const exitCode = await cli.run(['--mcp'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain(`${REMOVED_TRUST_SWITCH_ENV_WARNING}\n`)
      expect(getStderr().split(REMOVED_TRUST_SWITCH_ENV_WARNING)).toHaveLength(2)
      expect(getStderr()).toContain('MACTS_API_KEY is not set.')
      expect(getStdout()).toBe('')
    })
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
      writeInstalledApp(plugins.nodeModules, 'gadgets', { hostShape: 'older' })
      writeAppPackage(plugins.nodeModules, 'sprockets')
      const { stdout, stderr, getStdout } = createMockStreams()

      const exitCode = await cli.run(['--serve'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(registrar.registerContract).toHaveBeenCalledTimes(1)
      expect(registrar.registerManifest).not.toHaveBeenCalled()
      const output = getStdout()
      expect(output).toContain('Serving 1 app(s):\n  widgets\n')
      expect(output).toContain(
        "Not serving 1 app(s) that failed to register:\n  gadgets: @macts/gadgets-server is from an older macts and does not export its app's contract. Reinstall it with `macts mcp install gadgets`.\n"
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

/**
 * Tests for `macts mcp serve`: the MCP HTTP daemon in the foreground.
 *
 * The installed apps are real fixture packages in a temporary macts home, so
 * the tools the daemon is given come from the real host registration path and
 * the real adapter. Only the daemon itself is replaced, by a stub whose
 * `start` resolves, and the process signal that ends the command is
 * simulated.
 *
 * Expected values are written by hand: a fixture app `widgets` has one
 * operation, `widgets.widgets.list`, whose tool is
 * `macts__widgets__widgets_list` (see `../../host/installed-apps-fixtures.ts`);
 * the discovery tool is `macts__capabilities__discover`.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D5)
 */

import { dirname, join } from 'node:path'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest'
import { Cli } from 'clipanion'
import * as mcp from '@macts/mcp'
import type { DaemonOptions, DaemonServer } from '@macts/mcp'
import {
  createPluginsFixture,
  writeInstalledApp,
  type PluginsFixture,
} from '../../host/installed-apps-fixtures.js'
import {
  REMOVED_TRUST_SWITCH_ENV,
  REMOVED_TRUST_SWITCH_ENV_WARNING,
} from '../../removed-options.js'
import { McpServeCommand } from './serve.js'
import { createMockStreams } from './test-helpers.js'

describe('McpServeCommand', () => {
  let cli: Cli
  let plugins: PluginsFixture
  let mactsHome: string
  let daemon: DaemonServer
  let startDaemon: Mock<DaemonServer['start']>
  let stopDaemon: Mock<DaemonServer['stop']>
  let createDaemon: MockInstance<typeof mcp.createDaemon>

  beforeEach(() => {
    cli = new Cli({ binaryLabel: 'macts', binaryName: 'macts' })
    cli.register(McpServeCommand)

    plugins = createPluginsFixture()
    // MACTS_HOME/plugins/node_modules is the fixture's node_modules.
    mactsHome = dirname(dirname(plugins.nodeModules))
    vi.stubEnv('MACTS_HOME', mactsHome)
    vi.stubEnv('MACTS_TEST_EXECUTOR', '')
    vi.stubEnv(REMOVED_TRUST_SWITCH_ENV, undefined)

    startDaemon = vi.fn<DaemonServer['start']>().mockResolvedValue(undefined)
    stopDaemon = vi.fn<DaemonServer['stop']>().mockResolvedValue(undefined)
    daemon = {
      start: startDaemon,
      stop: stopDaemon,
      isRunning: vi.fn().mockReturnValue(true),
      httpServer: null,
    }
    createDaemon = vi.spyOn(mcp, 'createDaemon').mockReturnValue(daemon)

    // End the blocking command as soon as it waits for a signal.
    const originalOn = process.on.bind(process)
    vi.spyOn(process, 'on').mockImplementation((event, handler) => {
      if (event === 'SIGINT') {
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

  /** The options the command created the daemon with. */
  function daemonOptions(): DaemonOptions {
    const options = createDaemon.mock.calls[0]?.[0]
    if (options === undefined) throw new Error('createDaemon was not called')
    return options
  }

  it('serves the installed apps’ tools and the discovery tool on the given port', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets')
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve', '--port', '3000'], { stdout, stderr })

    expect(exitCode).toBe(0)
    const options = daemonOptions()
    expect(options.port).toBe(3000)
    expect(options.adapter.listTools().map((tool) => tool.name)).toEqual([
      'macts__capabilities__discover',
      'macts__widgets__widgets_list',
    ])
    expect(startDaemon).toHaveBeenCalled()
    expect(stopDaemon).toHaveBeenCalled()
    expect(getStderr()).toContain('Serving 1 app(s):\n  widgets\n')
    expect(getStderr()).toContain('MCP server running at http://127.0.0.1:3000\n')
    expect(getStderr()).toContain('Serving 2 tool(s)\n')
  })

  it('listens on the default socket in the macts home when no port is given', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(0)
    const options = daemonOptions()
    expect(options.port).toBeUndefined()
    expect(options.socketPath).toBe(join(mactsHome, 'mcp.sock'))
    expect(getStderr()).toContain(`MCP server running at ${join(mactsHome, 'mcp.sock')}\n`)
  })

  it('listens on a custom socket path', async () => {
    const { stdout, stderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve', '--socket', '/tmp/custom-mcp.sock'], {
      stdout,
      stderr,
    })

    expect(exitCode).toBe(0)
    expect(daemonOptions().socketPath).toBe('/tmp/custom-mcp.sock')
  })

  it('starts with only the discovery tool when no app is installed, and says so', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(
      daemonOptions()
        .adapter.listTools()
        .map((tool) => tool.name)
    ).toEqual(['macts__capabilities__discover'])
    expect(getStderr()).toContain(
      'No apps are installed, so no operations are served. Use `macts mcp install <app>` to add one.\n'
    )
  })

  it('fails with the message when the daemon cannot start', async () => {
    startDaemon.mockRejectedValue(new Error('Port in use'))
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve', '--port', '3000'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('Failed to start MCP server: Port in use\n')
  })

  it('fails startup for an unknown test executor name, before creating the daemon', async () => {
    vi.stubEnv('MACTS_TEST_EXECUTOR', 'bogus')
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain(
      'Failed to start MCP server: MACTS_TEST_EXECUTOR is set to "bogus", which is not a built-in test executor.'
    )
    expect(createDaemon).not.toHaveBeenCalled()
  })

  it(`warns once on stderr when ${REMOVED_TRUST_SWITCH_ENV} is set`, async () => {
    vi.stubEnv(REMOVED_TRUST_SWITCH_ENV, '1')
    const { stdout, stderr, getStderr } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(getStderr().split(REMOVED_TRUST_SWITCH_ENV_WARNING)).toHaveLength(2)
  })
})

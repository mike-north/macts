/**
 * Tests for the `macts mcp install` / `mcp uninstall` / `mcp list` commands.
 *
 * Verifies command registration, argument parsing (bare app name vs. full
 * package name vs. versioned spec), and that the commands delegate to the
 * plugin manager and surface success/error output and exit codes.
 *
 * @see https://github.com/mike-north/macts/issues/25
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { createMockStreams } from './test-helpers.js'

// Mock the plugin manager so no real npm subprocess runs.
vi.mock('../../plugin/manager.js', () => ({
  installMcpServerPlugin: vi.fn(),
  uninstallMcpServerPlugin: vi.fn(),
  listInstalledMcpServerPlugins: vi.fn(),
}))

import {
  installMcpServerPlugin,
  uninstallMcpServerPlugin,
  listInstalledMcpServerPlugins,
} from '../../plugin/manager.js'
import { McpInstallCommand } from './install.js'
import { McpUninstallCommand } from './uninstall.js'
import { McpListCommand } from './list.js'

describe('MCP plugin command registration', () => {
  it('registers mcp install at the expected path', () => {
    expect(McpInstallCommand.paths).toEqual([['mcp', 'install']])
  })

  it('registers mcp uninstall at the expected path', () => {
    expect(McpUninstallCommand.paths).toEqual([['mcp', 'uninstall']])
  })

  it('registers mcp list at the expected path', () => {
    expect(McpListCommand.paths).toEqual([['mcp', 'list']])
  })
})

describe('McpInstallCommand', () => {
  let cli: Cli

  beforeEach(() => {
    vi.clearAllMocks()
    cli = new Cli({ binaryLabel: 'macts', binaryName: 'macts' })
    cli.register(McpInstallCommand)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('installs by bare app name with default version', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    vi.mocked(installMcpServerPlugin).mockReturnValue({
      success: true,
      message: 'Installed @macts/calendar-server',
    })

    const exitCode = await cli.run(['mcp', 'install', 'calendar'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(installMcpServerPlugin).toHaveBeenCalledWith('calendar', 'latest')
    expect(getStdout()).toContain('Installed @macts/calendar-server')
    // Nudges the user to restart the daemon so tools become visible.
    expect(getStdout()).toContain('macts mcp start')
  })

  it('parses a version suffix on a bare app name', async () => {
    const { stdout, stderr } = createMockStreams()
    vi.mocked(installMcpServerPlugin).mockReturnValue({ success: true, message: 'ok' })

    await cli.run(['mcp', 'install', 'calendar@1.2.3'], { stdout, stderr })

    expect(installMcpServerPlugin).toHaveBeenCalledWith('calendar', '1.2.3')
  })

  it('parses a full package name with no version', async () => {
    const { stdout, stderr } = createMockStreams()
    vi.mocked(installMcpServerPlugin).mockReturnValue({ success: true, message: 'ok' })

    await cli.run(['mcp', 'install', '@macts/calendar-server'], { stdout, stderr })

    expect(installMcpServerPlugin).toHaveBeenCalledWith('@macts/calendar-server', 'latest')
  })

  it('parses a full package name with a version suffix', async () => {
    const { stdout, stderr } = createMockStreams()
    vi.mocked(installMcpServerPlugin).mockReturnValue({ success: true, message: 'ok' })

    await cli.run(['mcp', 'install', '@macts/calendar-server@1.2.3'], { stdout, stderr })

    expect(installMcpServerPlugin).toHaveBeenCalledWith('@macts/calendar-server', '1.2.3')
  })

  it('returns a nonzero exit code and writes to stderr on failure', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()
    vi.mocked(installMcpServerPlugin).mockReturnValue({
      success: false,
      message: 'Invalid MCP server plugin: @other/x-server',
    })

    const exitCode = await cli.run(['mcp', 'install', '@other/x-server'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('Invalid MCP server plugin')
  })
})

describe('McpUninstallCommand', () => {
  let cli: Cli

  beforeEach(() => {
    vi.clearAllMocks()
    cli = new Cli({ binaryLabel: 'macts', binaryName: 'macts' })
    cli.register(McpUninstallCommand)
  })

  it('delegates the raw app argument to the manager', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    vi.mocked(uninstallMcpServerPlugin).mockReturnValue({
      success: true,
      message: 'Uninstalled @macts/calendar-server',
    })

    const exitCode = await cli.run(['mcp', 'uninstall', 'calendar'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(uninstallMcpServerPlugin).toHaveBeenCalledWith('calendar')
    expect(getStdout()).toContain('Uninstalled @macts/calendar-server')
  })

  it('returns a nonzero exit code on failure', async () => {
    const { stdout, stderr, getStderr } = createMockStreams()
    vi.mocked(uninstallMcpServerPlugin).mockReturnValue({
      success: false,
      message: 'Plugin @macts/calendar-server is not installed',
    })

    const exitCode = await cli.run(['mcp', 'uninstall', 'calendar'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('is not installed')
  })
})

describe('McpListCommand', () => {
  let cli: Cli

  beforeEach(() => {
    vi.clearAllMocks()
    cli = new Cli({ binaryLabel: 'macts', binaryName: 'macts' })
    cli.register(McpListCommand)
  })

  it('reports an empty state with guidance', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    vi.mocked(listInstalledMcpServerPlugins).mockReturnValue([])

    const exitCode = await cli.run(['mcp', 'list'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(getStdout()).toContain('No MCP server plugins installed')
    expect(getStdout()).toContain('macts mcp install')
  })

  it('lists installed server plugins', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    vi.mocked(listInstalledMcpServerPlugins).mockReturnValue([
      { packageName: '@macts/calendar-server', version: '1.0.0' },
    ])

    const exitCode = await cli.run(['mcp', 'list'], { stdout, stderr })

    expect(exitCode).toBe(0)
    expect(getStdout()).toContain('@macts/calendar-server')
  })

  it('emits JSON when --json is passed', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()
    vi.mocked(listInstalledMcpServerPlugins).mockReturnValue([
      { packageName: '@macts/calendar-server', version: '1.0.0' },
    ])

    await cli.run(['mcp', 'list', '--json'], { stdout, stderr })

    const parsed = JSON.parse(getStdout()) as unknown
    expect(parsed).toEqual({
      data: [{ packageName: '@macts/calendar-server', version: '1.0.0' }],
    })
  })
})

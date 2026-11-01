/**
 * Basic tests for MCP daemon management commands.
 *
 * These tests verify command registration, option parsing, and basic structure.
 * They don't mock filesystem operations to avoid ESM mocking issues.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { dirname } from 'node:path'
import { Cli } from 'clipanion'
import { McpServeCommand } from './serve.js'
import { McpStartCommand } from './start.js'
import { McpStopCommand } from './stop.js'
import { McpStatusCommand } from './status.js'
import { McpDiagnoseCommand } from './diagnose.js'
import { McpInstallCommand } from './install.js'
import { McpUninstallCommand } from './uninstall.js'
import { McpListCommand } from './list.js'
import { createMockStreams } from './test-helpers.js'
import {
  createPluginsFixture,
  writeAppPackage,
  writeInstalledApp,
  type PluginsFixture,
} from '../../host/installed-apps-fixtures.js'

interface DiagnoseOutput {
  timestamp: string
  daemon: { pidFileExists: boolean; processRunning: boolean }
  socket: { socketPath: string; socketExists: boolean }
  apps: {
    totalLoaded: number
    totalFailed: number
    apps: { app: string; hostPackage: string; operations: number }[]
    failed: { app: string; reason: string }[]
    missingHost: { app: string; hostPackage: string; installCommand: string }[]
  }
  recommendations: string[]
}

describe('MCP Command Registration', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
  })

  it('should register serve command', () => {
    cli.register(McpServeCommand)
    expect(McpServeCommand.paths).toEqual([['mcp', 'serve']])
  })

  it('should register start command', () => {
    cli.register(McpStartCommand)
    expect(McpStartCommand.paths).toEqual([['mcp', 'start']])
  })

  it('should register stop command', () => {
    cli.register(McpStopCommand)
    expect(McpStopCommand.paths).toEqual([['mcp', 'stop']])
  })

  it('should register status command', () => {
    cli.register(McpStatusCommand)
    expect(McpStatusCommand.paths).toEqual([['mcp', 'status']])
  })

  it('should register diagnose command', () => {
    cli.register(McpDiagnoseCommand)
    expect(McpDiagnoseCommand.paths).toEqual([['mcp', 'diagnose']])
  })

  it('should register install command', () => {
    cli.register(McpInstallCommand)
    expect(McpInstallCommand.paths).toEqual([['mcp', 'install']])
  })

  it('should register uninstall command', () => {
    cli.register(McpUninstallCommand)
    expect(McpUninstallCommand.paths).toEqual([['mcp', 'uninstall']])
  })

  it('should register list command', () => {
    cli.register(McpListCommand)
    expect(McpListCommand.paths).toEqual([['mcp', 'list']])
  })
})

describe('McpDiagnoseCommand', () => {
  let cli: Cli
  let plugins: PluginsFixture

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpDiagnoseCommand)
    plugins = createPluginsFixture()
    // MACTS_HOME/plugins/node_modules is the fixture's node_modules; the PID
    // file and socket are looked for there too, and neither exists.
    vi.stubEnv('MACTS_HOME', dirname(dirname(plugins.nodeModules)))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    plugins.dispose()
  })

  it('should output JSON structure', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()

    await cli.run(['mcp', 'diagnose'], { stdout, stderr })

    const output = JSON.parse(getStdout()) as DiagnoseOutput

    expect(output).toHaveProperty('timestamp')
    expect(output.daemon).toMatchObject({ pidFileExists: false, processRunning: false })
    expect(output.socket).toMatchObject({ socketExists: false })
    expect(output.apps).toEqual({
      totalLoaded: 0,
      totalFailed: 0,
      apps: [],
      failed: [],
      missingHost: [],
    })
    expect(output.recommendations).toContain(
      "No apps are installed. Install an app's server package with: macts mcp install <app>"
    )
  })

  it('reports the installed apps the MCP servers load, and what fails', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets')
    writeInstalledApp(plugins.nodeModules, 'gadgets', { exportsContract: false })
    writeAppPackage(plugins.nodeModules, 'sprockets')
    const { stdout, stderr, getStdout } = createMockStreams()

    const exitCode = await cli.run(['mcp', 'diagnose'], { stdout, stderr })

    const output = JSON.parse(getStdout()) as DiagnoseOutput
    expect(exitCode).toBe(1)
    expect(output.apps.totalLoaded).toBe(1)
    expect(output.apps.apps).toEqual([
      { app: 'widgets', hostPackage: '@macts/widgets-server', operations: 1 },
    ])
    expect(output.apps.totalFailed).toBe(1)
    expect(output.apps.failed).toEqual([
      {
        app: 'gadgets',
        reason: expect.stringContaining("does not define a './contract' export") as unknown,
      },
    ])
    expect(output.apps.missingHost).toEqual([
      {
        app: 'sprockets',
        hostPackage: '@macts/sprockets-server',
        installCommand: 'macts mcp install sprockets',
      },
    ])
    expect(output.recommendations).toContain(
      '1 app(s) failed to load. Reinstall them with: macts mcp install <app>'
    )
    expect(output.recommendations).toContain(
      'sprockets is installed without @macts/sprockets-server. Install it with: macts mcp install sprockets'
    )
  })
})

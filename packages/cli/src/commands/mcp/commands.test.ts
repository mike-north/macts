/**
 * Basic tests for MCP daemon management commands.
 *
 * These tests verify command registration, option parsing, and basic structure.
 * They don't mock filesystem operations to avoid ESM mocking issues.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { McpServeCommand } from './serve.js'
import { McpStartCommand } from './start.js'
import { McpStopCommand } from './stop.js'
import { McpStatusCommand } from './status.js'
import { McpDiagnoseCommand } from './diagnose.js'
import * as mcp from '@macts/mcp'
import { createMockStreams } from './test-helpers.js'
import type { McpPlugin, DaemonServer } from '@macts/mcp'

interface DiagnoseOutput {
  timestamp: string
  daemon: { pidFileExists: boolean; processRunning: boolean }
  socket: { socketPath: string; socketExists: boolean }
  plugins: {
    totalFound: number
    totalErrors: number
    plugins: { name: string; description: string; tools: number }[]
    errors: { packageName: string }[]
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
})

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

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('No MCP plugins found')
  })

  it('should pass port option to daemon', async () => {
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

    // Run command but don't wait for it (it blocks forever)
    const promise = cli.run(['mcp', 'serve', '--port', '3000'], { stdout, stderr })

    // Give it time to start
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    expect(createDaemonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
      }) as DaemonServer
    )

    expect(getStderr()).toContain('http://127.0.0.1:3000')

    // Clean up
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
      start: vi.fn().mockRejectedValue(new Error('Port in use')),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      httpServer: null,
    }

    vi.spyOn(mcp, 'createDaemon').mockReturnValue(mockDaemon)

    const exitCode = await cli.run(['mcp', 'serve'], { stdout, stderr })

    expect(exitCode).toBe(1)
    expect(getStderr()).toContain('Failed to start MCP server')
    expect(getStderr()).toContain('Port in use')
  })
})

describe('McpDiagnoseCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpDiagnoseCommand)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should output JSON structure', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()

    vi.spyOn(mcp, 'getPidFile').mockReturnValue('/tmp/test.pid')
    vi.spyOn(mcp, 'getSocketPath').mockReturnValue('/tmp/test.sock')

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [],
      errors: [],
    })

    await cli.run(['mcp', 'diagnose'], { stdout, stderr })

    const output = JSON.parse(getStdout()) as DiagnoseOutput

    // Validate JSON structure
    expect(output).toHaveProperty('timestamp')
    expect(output).toHaveProperty('daemon')
    expect(output).toHaveProperty('socket')
    expect(output).toHaveProperty('plugins')
    expect(output).toHaveProperty('recommendations')

    expect(output.daemon).toHaveProperty('pidFileExists')
    expect(output.daemon).toHaveProperty('processRunning')

    expect(output.socket).toHaveProperty('socketPath')
    expect(output.socket).toHaveProperty('socketExists')

    expect(output.plugins).toHaveProperty('totalFound')
    expect(output.plugins).toHaveProperty('totalErrors')

    expect(Array.isArray(output.recommendations)).toBe(true)
  })

  it('should include plugin information in diagnostics', async () => {
    const { stdout, stderr, getStdout } = createMockStreams()

    vi.spyOn(mcp, 'getPidFile').mockReturnValue('/tmp/test.pid')
    vi.spyOn(mcp, 'getSocketPath').mockReturnValue('/tmp/test.sock')

    const mockPlugin: McpPlugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tools: [{ name: 'test-tool', description: 'Test', inputSchema: {}, handler: vi.fn() }],
    }

    vi.spyOn(mcp, 'discoverMcpPlugins').mockResolvedValue({
      plugins: [mockPlugin],
      errors: [
        {
          packageName: '@macts/mcp-broken',
          message: 'Load failed',
        },
      ],
    })

    await cli.run(['mcp', 'diagnose'], { stdout, stderr })

    const output = JSON.parse(getStdout()) as DiagnoseOutput

    expect(output.plugins.totalFound).toBe(1)
    expect(output.plugins.totalErrors).toBe(1)
    expect(output.plugins.plugins).toHaveLength(1)
    expect(output.plugins.plugins[0]).toEqual({
      name: 'test-plugin',
      description: 'Test plugin',
      tools: 1,
    })
    expect(output.plugins.errors).toHaveLength(1)
    expect(output.plugins.errors[0]?.packageName).toBe('@macts/mcp-broken')
  })
})

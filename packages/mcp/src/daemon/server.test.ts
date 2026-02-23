import { describe, it, expect, afterEach } from 'vitest'
import { createDaemon, type DaemonServer } from './server.js'
import type { McpPlugin } from '../types.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

describe('createDaemon', () => {
  let daemon: DaemonServer | null = null

  // Use a unique test directory for each test run
  const testDir = join(tmpdir(), `macts-test-daemon-${randomBytes(8).toString('hex')}`)

  afterEach(async () => {
    // Clean up daemon after each test
    if (daemon) {
      try {
        await daemon.stop()
      } catch {
        // Ignore errors during cleanup
      }
      daemon = null
    }

    // Clean up test directory
    try {
      const pidFile = join(testDir, 'mcp.pid')
      const socketPath = join(testDir, 'mcp.sock')
      if (existsSync(pidFile)) {
        unlinkSync(pidFile)
      }
      if (existsSync(socketPath)) {
        unlinkSync(socketPath)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('initialization', () => {
    it('should create a daemon with no plugins', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0, // Use TCP for tests
      })

      expect(daemon).toBeDefined()
      expect(daemon.isRunning()).toBe(false)
    })

    it('should create a daemon with plugins', () => {
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

      daemon = createDaemon({
        plugins: [mockPlugin],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0, // Use TCP for tests
      })

      expect(daemon).toBeDefined()
      expect(daemon.isRunning()).toBe(false)
    })

    it('should reject duplicate tool names', () => {
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

      expect(() =>
        createDaemon({
          plugins: [plugin1, plugin2],
          socketPath: join(testDir, 'mcp.sock'),
          port: 0, // Use TCP for tests
        })
      ).toThrow('Duplicate tool name')
    })
  })

  describe('lifecycle', () => {
    it('should handle stop when not running', async () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
      })

      // Should not throw
      await expect(daemon.stop()).resolves.toBeUndefined()
    })

    it('should expose httpServer property', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
      })

      expect(daemon.httpServer).toBeNull()
    })
  })

  describe('custom options', () => {
    it('should use custom server name and version', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
        name: 'custom-daemon',
        version: '1.2.3',
      })

      expect(daemon).toBeDefined()
    })
  })

  // Note: Integration tests for start() and stop() that involve actual socket/TCP server
  // creation have been removed because they don't work well in sandboxed environments.
  // The command-level tests (start.test.ts, stop.test.ts, status.test.ts) provide
  // coverage for the daemon lifecycle by mocking filesystem and process operations.
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { McpStopCommand } from './stop.js'
import { createMockStreams } from './test-helpers.js'

// Mock modules before imports
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('@macts/mcp', async () => {
  const actual = await vi.importActual('@macts/mcp')
  return {
    ...actual,
    getPidFile: vi.fn(),
  }
})

// Import after mocks
const fs = await import('node:fs')
const mcp = await import('@macts/mcp')

describe('McpStopCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpStopCommand)

    // Reset mocks
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(mcp.getPidFile).mockReturnValue('/tmp/test-mcp.pid')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('daemon not running', () => {
    it('should succeed when daemon is not running (no PID file)', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      // Mock no PID file
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('MCP server is not running')
    })
  })

  describe('invalid PID', () => {
    it('should handle invalid PID in file', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      // Mock PID file exists with invalid content
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('not-a-number')

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Invalid PID in /tmp/test-mcp.pid: not-a-number')
    })

    it('should handle empty PID file', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('   \n  ') // Whitespace only

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Invalid PID in /tmp/test-mcp.pid:')
    })
  })

  describe('stale PID file', () => {
    it('should clean up stale PID file when process does not exist', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      // Mock PID file exists but process doesn't
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('9999')
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined)

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 9999 && signal === 0) {
          throw new Error('ESRCH') // Process doesn't exist
        }
        return true
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Process 9999 is not running (stale PID file)')
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test-mcp.pid')
    })

    it('should handle cleanup errors gracefully', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('9999')
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 9999 && signal === 0) {
          throw new Error('ESRCH')
        }
        return true
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      // Should succeed despite cleanup error
      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Process 9999 is not running (stale PID file)')
    })
  })

  describe('graceful shutdown', () => {
    it('should send SIGTERM and wait for process to stop', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      let processExistsCount = 0
      const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234) {
          if (signal === 0) {
            // Check if process exists
            processExistsCount++
            if (processExistsCount <= 2) {
              return true // Process exists for first few checks
            }
            throw new Error('ESRCH') // Then it stops
          } else if (signal === 'SIGTERM') {
            return true // SIGTERM sent successfully
          }
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Stopping MCP server (PID 1234)...')
      expect(getStdout()).toContain('MCP server stopped successfully')
      expect(killSpy).toHaveBeenCalledWith(1234, 'SIGTERM')
    })

    it('should handle SIGTERM failure', async () => {
      const { stdout, stderr, getStderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) {
          return true // Process exists
        }
        if (pid === 1234 && signal === 'SIGTERM') {
          throw new Error('Permission denied')
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStdout()).toContain('Stopping MCP server (PID 1234)...')
      expect(getStderr()).toContain('Failed to send SIGTERM: Permission denied')
    })
  })

  describe('forced shutdown', () => {
    it('should force kill with SIGKILL if SIGTERM timeout expires', async () => {
      const { stdout, stderr, getStderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234) {
          if (signal === 0) {
            return true // Process never stops on its own
          } else if (signal === 'SIGTERM') {
            return true // SIGTERM sent but ignored
          } else if (signal === 'SIGKILL') {
            return true // SIGKILL sent
          }
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStderr()).toContain('Process did not stop gracefully, forcing shutdown...')
      expect(getStdout()).toContain('MCP server stopped (forced)')
      expect(killSpy).toHaveBeenCalledWith(1234, 'SIGTERM')
      expect(killSpy).toHaveBeenCalledWith(1234, 'SIGKILL')
    }, 15000) // Increase timeout for this test

    it('should handle SIGKILL failure', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234) {
          if (signal === 0) {
            return true // Process exists
          } else if (signal === 'SIGTERM') {
            return true // SIGTERM sent
          } else if (signal === 'SIGKILL') {
            throw new Error('Cannot kill process')
          }
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Failed to force stop: Cannot kill process')
    }, 15000)
  })

  describe('output messages', () => {
    it('should output success message on clean stop', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      let firstCheck = true
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234) {
          if (signal === 0) {
            if (firstCheck) {
              firstCheck = false
              return true // Process exists initially
            }
            throw new Error('ESRCH') // Then stops
          } else if (signal === 'SIGTERM') {
            return true
          }
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Stopping MCP server (PID 1234)...')
      expect(getStdout()).toContain('MCP server stopped successfully')
    })
  })

  describe('edge cases', () => {
    it('should handle numeric PID with whitespace', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('  5678  \n')

      let firstCheck = true
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 5678) {
          if (signal === 0) {
            if (firstCheck) {
              firstCheck = false
              return true
            }
            throw new Error('ESRCH')
          } else if (signal === 'SIGTERM') {
            return true
          }
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Stopping MCP server (PID 5678)...')
    })

    it('should handle PID zero', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('0')

      // PID 0 is valid in parseInt, so it will try to kill
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 0 && signal === 0) {
          throw new Error('ESRCH') // Process doesn't exist
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      // PID 0 is treated as a stale PID
      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Process 0 is not running (stale PID file)')
    })

    it('should handle negative PID', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('-123')

      // Negative PIDs are valid in parseInt, so it will try to kill
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === -123 && signal === 0) {
          throw new Error('ESRCH') // Process doesn't exist
        }
        throw new Error('Invalid kill call')
      })

      const exitCode = await cli.run(['mcp', 'stop'], { stdout, stderr })

      // Negative PID is treated as a stale PID
      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('Process -123 is not running (stale PID file)')
    })
  })
})

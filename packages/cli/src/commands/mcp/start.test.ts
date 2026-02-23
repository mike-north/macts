import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { McpStartCommand } from './start.js'
import { createMockStreams } from './test-helpers.js'

// Mock modules before imports
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  }
})

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {
    ...actual,
    spawn: vi.fn(),
  }
})

vi.mock('@macts/mcp', async () => {
  const actual = await vi.importActual('@macts/mcp')
  return {
    ...actual,
    getPidFile: vi.fn(),
    getSocketPath: vi.fn(),
  }
})

// Import after mocks
const fs = await import('node:fs')
const childProcess = await import('node:child_process')
const mcp = await import('@macts/mcp')

describe('McpStartCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpStartCommand)

    // Reset mocks
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(mcp.getPidFile).mockReturnValue('/tmp/test-mcp.pid')
    vi.mocked(mcp.getSocketPath).mockReturnValue('/tmp/test-mcp.sock')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('daemon already running', () => {
    it('should fail when daemon is already running', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      // Mock PID file exists and process is alive
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) {
          return true // Process exists
        }
        throw new Error('Process not found')
      })

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('MCP server is already running (PID 1234)')
      expect(getStderr()).toContain('Use `macts mcp stop` to stop it first.')
    })

    it('should clean up stale PID file and proceed when process is dead', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      // Mock PID file exists but process is dead
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        // Initially PID file exists, then check for binary
        if (path === '/tmp/test-mcp.pid') {
          return true // PID file exists initially, then after spawn completes
        }
        // Mock binary exists
        if (typeof path === 'string' && path.includes('bin.js')) {
          return true
        }
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('9999') // Stale PID

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 9999 && signal === 0) {
          throw new Error('ESRCH') // Process doesn't exist
        }
        return true
      })

      // Mock spawn
      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStderr()).toContain('Removing stale PID file...')
      expect(getStdout()).toContain('MCP server started')
    })
  })

  describe('spawning daemon', () => {
    beforeEach(() => {
      // Mock no existing PID file initially
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          return false // No PID file initially
        }
        if (typeof path === 'string' && path.includes('bin.js')) {
          return true // Binary exists
        }
        return false
      })
    })

    it('should pass port option to spawned process', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      // Track calls to existsSync - first call is for PID (false), rest are true
      let pidCheckCount = 0
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          pidCheckCount++
          return pidCheckCount > 1 // False for first check, true after spawn
        }
        return true // Binary exists
      })

      vi.mocked(fs.readFileSync).mockReturnValue('5678')

      const exitCode = await cli.run(['mcp', 'start', '--port', '3000'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(childProcess.spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(['mcp', 'serve', '--port', '3000']) as string[],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      )
      expect(getStdout()).toContain('http://127.0.0.1:3000')
    })

    it('should pass socket option to spawned process', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      // Track calls to existsSync - first call is for PID (false), rest are true
      let pidCheckCount = 0
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          pidCheckCount++
          return pidCheckCount > 1 // False for first check, true after spawn
        }
        return true // Binary exists
      })

      vi.mocked(fs.readFileSync).mockReturnValue('5678')

      const exitCode = await cli.run(['mcp', 'start', '--socket', '/custom/path.sock'], {
        stdout,
        stderr,
      })

      expect(exitCode).toBe(0)
      expect(childProcess.spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(['mcp', 'serve', '--socket', '/custom/path.sock']) as string[],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      )
      expect(getStdout()).toContain('/custom/path.sock')
    })

    it('should handle missing binary path', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      // Mock binary doesn't exist
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('bin.js')) {
          return false // Binary missing
        }
        return false
      })

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Error: Cannot find macts binary at')
    })

    it('should fail if daemon does not start successfully', async () => {
      const { stdout, stderr, getStderr } = createMockStreams()

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      // Mock PID file never appears
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          return false // PID file never created
        }
        if (typeof path === 'string' && path.includes('bin.js')) {
          return true
        }
        return false
      })

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStderr()).toContain('Failed to start MCP server')
      expect(getStderr()).toContain('Check logs at ~/.macts/mcp.log for details')
    })

    it('should output success message with PID and endpoint', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      // Track calls to existsSync - first call is for PID (false), rest are true
      let pidCheckCount = 0
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          pidCheckCount++
          return pidCheckCount > 1 // False for first check, true after spawn
        }
        return true // Binary exists
      })

      vi.mocked(fs.readFileSync).mockReturnValue('12345')

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('MCP server started (PID 12345)')
      expect(getStdout()).toContain('Endpoint: /tmp/test-mcp.sock')
      expect(getStdout()).toContain('Use `macts mcp stop` to stop the server.')
    })

    it('should spawn process with correct options', async () => {
      const { stdout, stderr } = createMockStreams()

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      // Track calls to existsSync - first call is for PID (false), rest are true
      let pidCheckCount = 0
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          pidCheckCount++
          return pidCheckCount > 1 // False for first check, true after spawn
        }
        return true // Binary exists
      })

      vi.mocked(fs.readFileSync).mockReturnValue('5678')

      await cli.run(['mcp', 'start'], { stdout, stderr })

      expect(childProcess.spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(['mcp', 'serve']) as string[],
        {
          detached: true,
          stdio: 'ignore',
        }
      )

      expect(mockChild.unref).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle invalid PID format in stale PID file', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      // Mock PID file exists with invalid content
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/tmp/test-mcp.pid') {
          return true
        }
        if (typeof path === 'string' && path.includes('bin.js')) {
          return true
        }
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('not-a-number')

      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('Invalid PID')
      })

      const mockChild = {
        unref: vi.fn(),
      }
      vi.mocked(childProcess.spawn).mockReturnValue(mockChild as never)

      const exitCode = await cli.run(['mcp', 'start'], { stdout, stderr })

      // Should treat as stale and proceed
      expect(exitCode).toBe(0)
      expect(getStderr()).toContain('Removing stale PID file...')
      expect(getStdout()).toContain('MCP server started')
    })
  })
})

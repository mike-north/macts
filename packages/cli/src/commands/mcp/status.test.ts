import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Cli } from 'clipanion'
import { McpStatusCommand } from './status.js'
import { createMockStreams } from './test-helpers.js'

interface StatusOutput {
  running: boolean
  pid: number
  endpoint: string
  health: { status: string; plugins: number } | null
  error?: string
}

// Mock modules before imports
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock('node:http', () => ({
  request: vi.fn(),
}))

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
const http = await import('node:http')
const mcp = await import('@macts/mcp')

describe('McpStatusCommand', () => {
  let cli: Cli

  beforeEach(() => {
    cli = new Cli({
      binaryLabel: 'macts',
      binaryName: 'macts',
    })
    cli.register(McpStatusCommand)

    // Reset mocks
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(mcp.getPidFile).mockReturnValue('/tmp/test-mcp.pid')
    vi.mocked(mcp.getSocketPath).mockReturnValue('/tmp/test-mcp.sock')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('daemon not running', () => {
    it('should report not running when no PID file', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      // Mock no PID file
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStdout()).toContain('MCP server is not running')
    })
  })

  describe('invalid PID', () => {
    it('should report error on invalid PID format', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('not-a-number')

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStdout()).toContain('Invalid PID in /tmp/test-mcp.pid: not-a-number')
    })

    it('should handle empty PID file', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('   ')

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStdout()).toContain('Invalid PID in /tmp/test-mcp.pid:')
    })
  })

  describe('stale PID file', () => {
    it('should detect stale PID file when process is dead', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('9999')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 9999 && signal === 0) {
          throw new Error('ESRCH') // Process doesn't exist
        }
        return true
      })

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      expect(getStdout()).toContain('Process 9999 is not running (stale PID file)')
    })
  })

  describe('health check', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      // Mock process exists
      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) {
          return true
        }
        throw new Error('Process not found')
      })
    })

    it('should report running with plugin count on successful health check', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      // Mock successful health check
      const mockRequest = {
        on: vi.fn((event: string, _handler: (arg: Error) => void) => {
          if (event === 'error') {
            // Don't call error handler
          }
          return mockRequest
        }),
        end: vi.fn(() => {
          // Simulate successful response
          setTimeout(() => {
            const mockResponse = {
              on: vi.fn((event: string, handler: (arg?: Buffer) => void) => {
                if (event === 'data') {
                  handler(Buffer.from(JSON.stringify({ status: 'ok', plugins: 3 })))
                } else if (event === 'end') {
                  handler()
                }
                return mockResponse
              }),
            }

            // Find and call the response handler
            const requestMock = vi.mocked(http.request) as unknown as ReturnType<typeof vi.fn>
            const responseHandler = requestMock.mock.calls[0]?.[1] as
              | ((res: unknown) => void)
              | undefined
            if (responseHandler) {
              responseHandler(mockResponse)
            }
          }, 0)
        }),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('MCP server is running')
      expect(getStdout()).toContain('PID: 1234')
      expect(getStdout()).toContain('Endpoint: /tmp/test-mcp.sock')
      expect(getStdout()).toContain('Plugins: 3')
      expect(getStdout()).toContain('Status: ok')
    })

    it('should handle health check failure', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      // Mock health check error
      const mockRequest = {
        on: vi.fn((event: string, handler: (arg: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => {
              handler(new Error('Connection refused'))
            }, 0)
          }
          return mockRequest
        }),
        end: vi.fn(),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      // formatWarning was replaced with formatError
      const output = getStdout() + getStderr()
      expect(output).toContain('health check failed')
      expect(output).toContain('Connection refused')
    })

    it('should handle invalid health response', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const mockRequest = {
        on: vi.fn((_event: string, _handler: (arg: Error) => void) => {
          return mockRequest
        }),
        end: vi.fn(() => {
          setTimeout(() => {
            const mockResponse = {
              on: vi.fn((event: string, handler: (arg?: Buffer) => void) => {
                if (event === 'data') {
                  handler(Buffer.from('not valid json'))
                } else if (event === 'end') {
                  handler()
                }
                return mockResponse
              }),
            }

            const requestMock = vi.mocked(http.request) as unknown as ReturnType<typeof vi.fn>
            const responseHandler = requestMock.mock.calls[0]?.[1] as
              | ((res: unknown) => void)
              | undefined
            if (responseHandler) {
              responseHandler(mockResponse)
            }
          }, 0)
        }),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      // formatWarning was replaced with formatError
      const output = getStdout() + getStderr()
      expect(output).toContain('health check failed')
      expect(output).toContain('Invalid health response')
    })

    it('should handle timeout', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      const mockRequest = {
        on: vi.fn((event: string, handler: (arg: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => {
              handler(new Error('Timeout'))
            }, 0)
          }
          return mockRequest
        }),
        end: vi.fn(),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      // formatWarning was replaced with formatError
      const output = getStdout() + getStderr()
      expect(output).toContain('health check failed')
      expect(output).toContain('Timeout')
    })
  })

  describe('JSON output', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) {
          return true
        }
        throw new Error('Process not found')
      })
    })

    it('should output JSON format correctly with --json', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      // Mock successful health check
      const mockRequest = {
        on: vi.fn(() => mockRequest),
        end: vi.fn(() => {
          setTimeout(() => {
            const mockResponse = {
              on: vi.fn((event: string, handler: (arg?: Buffer) => void) => {
                if (event === 'data') {
                  handler(Buffer.from(JSON.stringify({ status: 'ok', plugins: 5 })))
                } else if (event === 'end') {
                  handler()
                }
                return mockResponse
              }),
            }

            const requestMock = vi.mocked(http.request) as unknown as ReturnType<typeof vi.fn>
            const responseHandler = requestMock.mock.calls[0]?.[1] as
              | ((res: unknown) => void)
              | undefined
            if (responseHandler) {
              responseHandler(mockResponse)
            }
          }, 0)
        }),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status', '--json'], { stdout, stderr })

      expect(exitCode).toBe(0)

      const output = getStdout()
      const json = JSON.parse(output) as StatusOutput

      expect(json).toEqual({
        running: true,
        pid: 1234,
        endpoint: '/tmp/test-mcp.sock',
        health: {
          status: 'ok',
          plugins: 5,
        },
      })
    })

    it('should output JSON with error on health check failure', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      const mockRequest = {
        on: vi.fn((event: string, handler: (arg: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => {
              handler(new Error('Connection refused'))
            }, 0)
          }
          return mockRequest
        }),
        end: vi.fn(),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status', '--json'], { stdout, stderr })

      expect(exitCode).toBe(1)

      const output = getStdout()
      const json = JSON.parse(output) as StatusOutput

      expect(json).toEqual({
        running: true,
        pid: 1234,
        endpoint: '/tmp/test-mcp.sock',
        health: null,
        error: 'Connection refused',
      })
    })

    it('should output JSON error when not running', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const exitCode = await cli.run(['mcp', 'status', '--json'], { stdout, stderr })

      expect(exitCode).toBe(1)

      const output = getStdout()
      expect(output).toContain('MCP server is not running')
    })
  })

  describe('edge cases', () => {
    it('should handle PID with whitespace', async () => {
      const { stdout, stderr, getStdout } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('  5678  \n')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 5678 && signal === 0) {
          return true
        }
        throw new Error('Process not found')
      })

      const mockRequest = {
        on: vi.fn(() => mockRequest),
        end: vi.fn(() => {
          setTimeout(() => {
            const mockResponse = {
              on: vi.fn((event: string, handler: (arg?: Buffer) => void) => {
                if (event === 'data') {
                  handler(Buffer.from(JSON.stringify({ status: 'ok', plugins: 1 })))
                } else if (event === 'end') {
                  handler()
                }
                return mockResponse
              }),
            }

            const requestMock = vi.mocked(http.request) as unknown as ReturnType<typeof vi.fn>
            const responseHandler = requestMock.mock.calls[0]?.[1] as
              | ((res: unknown) => void)
              | undefined
            if (responseHandler) {
              responseHandler(mockResponse)
            }
          }, 0)
        }),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(0)
      expect(getStdout()).toContain('PID: 5678')
    })

    it('should handle empty health response', async () => {
      const { stdout, stderr, getStdout, getStderr } = createMockStreams()

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('1234')

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) {
          return true
        }
        throw new Error('Process not found')
      })

      const mockRequest = {
        on: vi.fn(() => mockRequest),
        end: vi.fn(() => {
          setTimeout(() => {
            const mockResponse = {
              on: vi.fn((event: string, handler: (arg?: Buffer) => void) => {
                if (event === 'data') {
                  // Empty data
                }
                if (event === 'end') {
                  handler()
                }
                return mockResponse
              }),
            }

            const requestMock = vi.mocked(http.request) as unknown as ReturnType<typeof vi.fn>
            const responseHandler = requestMock.mock.calls[0]?.[1] as
              | ((res: unknown) => void)
              | undefined
            if (responseHandler) {
              responseHandler(mockResponse)
            }
          }, 0)
        }),
      }

      vi.mocked(http.request).mockReturnValue(mockRequest as never)

      const exitCode = await cli.run(['mcp', 'status'], { stdout, stderr })

      expect(exitCode).toBe(1)
      // formatWarning was replaced with formatError
      const output = getStdout() + getStderr()
      expect(output).toContain('health check failed')
      expect(output).toContain('Invalid health response')
    })
  })
})

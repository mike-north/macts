import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSocketPath, getPidFile } from './paths.js'
import { join } from 'node:path'
import { homedir } from 'node:os'

describe('daemon paths', () => {
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
  })

  afterEach(() => {
    if (originalMactsHome !== undefined) {
      process.env['MACTS_HOME'] = originalMactsHome
    } else {
      delete process.env['MACTS_HOME']
    }
  })

  describe('getSocketPath', () => {
    it('should return default socket path', () => {
      delete process.env['MACTS_HOME']

      const socketPath = getSocketPath()
      expect(socketPath).toBe(join(homedir(), '.macts', 'mcp.sock'))
    })

    it('should respect MACTS_HOME environment variable', () => {
      process.env['MACTS_HOME'] = '/custom/path'

      const socketPath = getSocketPath()
      expect(socketPath).toBe('/custom/path/mcp.sock')
    })
  })

  describe('getPidFile', () => {
    it('should return default PID file path', () => {
      delete process.env['MACTS_HOME']

      const pidFile = getPidFile()
      expect(pidFile).toBe(join(homedir(), '.macts', 'mcp.pid'))
    })

    it('should respect MACTS_HOME environment variable', () => {
      process.env['MACTS_HOME'] = '/custom/path'

      const pidFile = getPidFile()
      expect(pidFile).toBe('/custom/path/mcp.pid')
    })
  })
})

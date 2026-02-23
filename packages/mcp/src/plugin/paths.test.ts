import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getMactsHome,
  getPluginsDir,
  getPluginsNodeModules,
  getPluginsLockfile,
  getMcpPluginsCacheFile,
} from './paths.js'

describe('paths', () => {
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
  })

  afterEach(() => {
    if (originalMactsHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalMactsHome
    }
  })

  describe('getMactsHome', () => {
    it('should return default ~/.macts when MACTS_HOME not set', () => {
      delete process.env['MACTS_HOME']
      const home = getMactsHome()
      expect(home).toBe(join(homedir(), '.macts'))
    })

    it('should return MACTS_HOME value when set', () => {
      process.env['MACTS_HOME'] = '/custom/path'
      const home = getMactsHome()
      expect(home).toBe('/custom/path')
    })
  })

  describe('getPluginsDir', () => {
    it('should return {home}/plugins', () => {
      delete process.env['MACTS_HOME']
      const pluginsDir = getPluginsDir()
      expect(pluginsDir).toBe(join(homedir(), '.macts', 'plugins'))
    })

    it('should respect MACTS_HOME override', () => {
      process.env['MACTS_HOME'] = '/custom/path'
      const pluginsDir = getPluginsDir()
      expect(pluginsDir).toBe('/custom/path/plugins')
    })
  })

  describe('getPluginsNodeModules', () => {
    it('should return correct path', () => {
      delete process.env['MACTS_HOME']
      const path = getPluginsNodeModules()
      expect(path).toBe(join(homedir(), '.macts', 'plugins', 'node_modules'))
    })

    it('should respect MACTS_HOME override', () => {
      process.env['MACTS_HOME'] = '/custom/path'
      const path = getPluginsNodeModules()
      expect(path).toBe('/custom/path/plugins/node_modules')
    })
  })

  describe('getPluginsLockfile', () => {
    it('should return correct path', () => {
      delete process.env['MACTS_HOME']
      const path = getPluginsLockfile()
      expect(path).toBe(join(homedir(), '.macts', 'plugins', 'package-lock.json'))
    })

    it('should respect MACTS_HOME override', () => {
      process.env['MACTS_HOME'] = '/custom/path'
      const path = getPluginsLockfile()
      expect(path).toBe('/custom/path/plugins/package-lock.json')
    })
  })

  describe('getMcpPluginsCacheFile', () => {
    it('should return correct path', () => {
      delete process.env['MACTS_HOME']
      const path = getMcpPluginsCacheFile()
      expect(path).toBe(join(homedir(), '.macts', 'plugins', '.mcp-plugins-cache.json'))
    })

    it('should respect MACTS_HOME override', () => {
      process.env['MACTS_HOME'] = '/custom/path'
      const path = getMcpPluginsCacheFile()
      expect(path).toBe('/custom/path/plugins/.mcp-plugins-cache.json')
    })
  })
})

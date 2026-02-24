import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Project } from 'fixturify-project'
import { discoverPlugins, loadPlugin } from './loader.js'

/**
 * Create a fixturify Project representing the plugins directory,
 * and add a CLI plugin package to it.
 *
 * Returns the project so callers can add more packages before calling `write()`.
 */
function addCliPlugin(pluginsProject: Project, packageName: string, entrySource: string): Project {
  const dep = pluginsProject.addDependency(`@macts/${packageName}`, '1.0.0')
  dep.pkg = {
    ...dep.pkg,
    type: 'module',
    exports: {
      './cli': {
        import: './dist/cli/index.js',
        default: './dist/cli/index.js',
      },
    },
  }
  dep.files = {
    dist: {
      cli: {
        'index.js': entrySource,
      },
    },
  }
  return dep
}

/**
 * Create a plugins Project configured at the right path inside mactsHome.
 */
function createPluginsProject(mactsHome: string): Project {
  const project = new Project('macts-plugins', '1.0.0')
  project.baseDir = join(mactsHome, 'plugins')
  return project
}

describe('CLI plugin discovery e2e', () => {
  let mactsHome: string
  let pluginsProject: Project
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
    mactsHome = mkdtempSync(join(tmpdir(), 'macts-cli-e2e-'))
    pluginsProject = createPluginsProject(mactsHome)
    process.env['MACTS_HOME'] = mactsHome
  })

  afterEach(() => {
    if (originalMactsHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalMactsHome
    }
    pluginsProject.dispose()
    rmSync(mactsHome, { recursive: true, force: true })
  })

  describe('discoverPlugins', () => {
    it('should return empty when no plugins directory exists', async () => {
      // Don't write the plugins project — no plugins dir at all
      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should return empty when plugins/node_modules/@macts/ is empty', async () => {
      await pluginsProject.write()
      mkdirSync(join(pluginsProject.baseDir, 'node_modules', '@macts'), { recursive: true })
      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should discover a valid CLI plugin from @macts/test-app/cli', async () => {
      addCliPlugin(
        pluginsProject,
        'test-app',
        `export const plugin = { name: 'test-app', description: 'Test app plugin', commands: [] };`
      )
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.errors).toEqual([])
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0]?.name).toBe('test-app')
      expect(result.plugins[0]?.description).toBe('Test app plugin')
      expect(result.plugins[0]?.commands).toEqual([])
    })

    it('should discover multiple plugins simultaneously', async () => {
      addCliPlugin(
        pluginsProject,
        'app-one',
        `export const plugin = { name: 'app-one', description: 'First app', commands: [] };`
      )
      addCliPlugin(
        pluginsProject,
        'app-two',
        `export const plugin = { name: 'app-two', description: 'Second app', commands: [] };`
      )
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.errors).toEqual([])
      expect(result.plugins).toHaveLength(2)

      const names = result.plugins.map((p) => p.name).sort()
      expect(names).toEqual(['app-one', 'app-two'])
    })

    it('should ignore @macts/*-server packages (server suffix exclusion)', async () => {
      const dep = pluginsProject.addDependency('@macts/test-app-server', '1.0.0')
      dep.files = {}
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should ignore infrastructure packages (core, api, cli, mcp)', async () => {
      for (const infra of ['core', 'api', 'cli', 'mcp']) {
        const dep = pluginsProject.addDependency(`@macts/${infra}`, '1.0.0')
        dep.files = {}
      }
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should return errors for packages with broken /cli exports', async () => {
      const dep = pluginsProject.addDependency('@macts/broken-app', '1.0.0')
      dep.pkg = {
        ...dep.pkg,
        type: 'module',
        exports: { './cli': './dist/cli/index.js' },
      }
      // Don't create the actual JS file — should cause a load error
      dep.files = {}
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/broken-app')
    })

    it('should return error when plugin exports object without plugin property', async () => {
      addCliPlugin(
        pluginsProject,
        'no-export',
        `export const notPlugin = { name: 'bad', description: 'Missing plugin export', commands: [] };`
      )
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toContain('plugin')
    })

    it('should return error when plugin export has invalid shape', async () => {
      addCliPlugin(
        pluginsProject,
        'bad-shape',
        `export const plugin = { name: 'bad-shape' };` // missing description and commands
      )
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toContain('invalid plugin')
    })

    it('should return multiple errors for multiple broken plugins', async () => {
      // Create two broken plugins
      const broken1 = pluginsProject.addDependency('@macts/broken-one', '1.0.0')
      broken1.pkg = { ...broken1.pkg, type: 'module', exports: { './cli': './dist/cli/index.js' } }
      broken1.files = {}

      const broken2 = pluginsProject.addDependency('@macts/broken-two', '1.0.0')
      broken2.pkg = { ...broken2.pkg, type: 'module', exports: { './cli': './dist/cli/index.js' } }
      broken2.files = {}

      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(2)
      const errorNames = result.errors.map((e) => e.packageName).sort()
      expect(errorNames).toEqual(['@macts/broken-one', '@macts/broken-two'])
    })

    it('should return both plugins and errors when mix of valid and broken', async () => {
      addCliPlugin(
        pluginsProject,
        'good-app',
        `export const plugin = { name: 'good-app', description: 'Good', commands: [] };`
      )

      const broken = pluginsProject.addDependency('@macts/bad-app', '1.0.0')
      broken.pkg = { ...broken.pkg, type: 'module', exports: { './cli': './dist/cli/index.js' } }
      broken.files = {}

      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0]?.name).toBe('good-app')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/bad-app')
    })
  })

  describe('cache integration', () => {
    it('should use cache on second discovery when lockfile exists', async () => {
      // Create a plugin
      addCliPlugin(
        pluginsProject,
        'cached-app',
        `export const plugin = { name: 'cached-app', description: 'Cached', commands: [] };`
      )
      await pluginsProject.write()

      // Create a lockfile so cache can be written
      writeFileSync(
        join(mactsHome, 'plugins', 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3 })
      )

      // First discovery — slow path, writes cache
      const result1 = await discoverPlugins()
      expect(result1.plugins).toHaveLength(1)

      // Second discovery — should use cache (fast path)
      const result2 = await discoverPlugins()
      expect(result2.plugins).toHaveLength(1)
      expect(result2.plugins[0]?.name).toBe('cached-app')
    })

    it('should invalidate cache when lockfile changes', async () => {
      addCliPlugin(
        pluginsProject,
        'cached-app',
        `export const plugin = { name: 'cached-app', description: 'Cached', commands: [] };`
      )
      await pluginsProject.write()

      // Create lockfile and discover (populates cache)
      writeFileSync(
        join(mactsHome, 'plugins', 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3, v: 1 })
      )
      const result1 = await discoverPlugins()
      expect(result1.plugins).toHaveLength(1)

      // Change the lockfile content (simulating npm install changing it)
      writeFileSync(
        join(mactsHome, 'plugins', 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3, v: 2 })
      )

      // Discovery should use slow path (cache hash mismatch)
      const result2 = await discoverPlugins()
      expect(result2.plugins).toHaveLength(1)
    })
  })

  describe('loadPlugin', () => {
    it('should load a valid plugin by package name', async () => {
      addCliPlugin(
        pluginsProject,
        'my-app',
        `export const plugin = { name: 'my-app', description: 'My app', commands: [] };`
      )
      await pluginsProject.write()

      const result = await loadPlugin('@macts/my-app')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.plugin.name).toBe('my-app')
        expect(result.plugin.description).toBe('My app')
        expect(result.plugin.commands).toEqual([])
      }
    })

    it('should reject server packages', async () => {
      const result = await loadPlugin('@macts/test-server')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })

    it('should reject infrastructure packages', async () => {
      const result = await loadPlugin('@macts/core')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid plugin package name')
      }
    })
  })
})

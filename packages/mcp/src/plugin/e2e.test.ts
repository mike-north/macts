import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Project } from 'fixturify-project'
import { discoverMcpPlugins, loadMcpPlugin } from './loader.js'

/**
 * Build a tool object literal string for embedding in JS source.
 */
function toolLiteral(
  name: string,
  description: string,
  opts: { inputSchema?: string; handler?: string } = {}
): string {
  const schema = opts.inputSchema ?? `{ type: 'object' }`
  const handler = opts.handler ?? `async () => ({ ok: true })`
  return `{ name: '${name}', description: '${description}', inputSchema: ${schema}, handler: ${handler} }`
}

/**
 * Build JS source for a valid MCP plugin with tools.
 */
function validMcpPluginSource(name: string, description: string, tools = '[]'): string {
  return `export const plugin = { name: '${name}', description: '${description}', tools: ${tools} };`
}

/**
 * Add an MCP plugin dependency to a plugins Project.
 */
function addMcpPlugin(
  pluginsProject: Project,
  packageName: string,
  entrySource: string
): Project {
  const dep = pluginsProject.addDependency(`@macts/${packageName}`, '1.0.0')
  dep.pkg = {
    ...dep.pkg,
    type: 'module',
    exports: {
      './mcp': {
        import: './dist/mcp/index.js',
        default: './dist/mcp/index.js',
      },
    },
  }
  dep.files = {
    dist: {
      mcp: {
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

describe('MCP plugin discovery e2e', () => {
  let mactsHome: string
  let pluginsProject: Project
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
    mactsHome = mkdtempSync(join(tmpdir(), 'macts-mcp-e2e-'))
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

  describe('discoverMcpPlugins', () => {
    it('should return empty when no plugins directory exists', async () => {
      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should return empty when plugins/node_modules/@macts/ is empty', async () => {
      await pluginsProject.write()
      mkdirSync(join(pluginsProject.baseDir, 'node_modules', '@macts'), { recursive: true })
      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should discover a valid MCP plugin from @macts/test-app-server/mcp', async () => {
      const tools = `[${toolLiteral('macts__test__items_list', 'List items')}]`
      addMcpPlugin(pluginsProject, 'test-app-server', validMcpPluginSource('test-app', 'Test app MCP plugin', tools))
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.errors).toEqual([])
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0]?.name).toBe('test-app')
      expect(result.plugins[0]?.description).toBe('Test app MCP plugin')
      expect(result.plugins[0]?.tools).toHaveLength(1)
      expect(result.plugins[0]?.tools[0]?.name).toBe('macts__test__items_list')
    })

    it('should discover multiple server plugins', async () => {
      const toolsA = `[${toolLiteral('macts__alpha__items_list', 'List alpha items')}]`
      const toolsB = `[${toolLiteral('macts__beta__items_list', 'List beta items')}]`

      addMcpPlugin(pluginsProject, 'alpha-server', validMcpPluginSource('alpha', 'Alpha plugin', toolsA))
      addMcpPlugin(pluginsProject, 'beta-server', validMcpPluginSource('beta', 'Beta plugin', toolsB))
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.errors).toEqual([])
      expect(result.plugins).toHaveLength(2)

      const names = result.plugins.map((p) => p.name).sort()
      expect(names).toEqual(['alpha', 'beta'])
    })

    it('should ignore non-server packages (@macts/test-app)', async () => {
      const dep = pluginsProject.addDependency('@macts/test-app', '1.0.0')
      dep.files = {}
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should return errors for plugins with broken /mcp exports', async () => {
      const dep = pluginsProject.addDependency('@macts/broken-server', '1.0.0')
      dep.pkg = {
        ...dep.pkg,
        type: 'module',
        exports: { './mcp': './dist/mcp/index.js' },
      }
      dep.files = {}
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/broken-server')
    })

    it('should return error when plugin has invalid tool definitions (missing handler)', async () => {
      const invalidTool = `{ name: 'bad-tool', description: 'Bad', inputSchema: { type: 'object' } }`
      const tools = `[${invalidTool}]`
      addMcpPlugin(pluginsProject, 'invalid-tools-server', validMcpPluginSource('invalid-tools', 'Invalid tools plugin', tools))
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toContain('invalid plugin')
    })

    it('should return error when plugin has invalid tool definitions (null inputSchema)', async () => {
      const invalidTool = `{ name: 'null-schema', description: 'Bad', inputSchema: null, handler: async () => ({}) }`
      const tools = `[${invalidTool}]`
      addMcpPlugin(pluginsProject, 'null-schema-server', validMcpPluginSource('null-schema', 'Null schema plugin', tools))
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toContain('invalid plugin')
    })

    it('should return error when plugin export has no plugin property', async () => {
      addMcpPlugin(
        pluginsProject,
        'no-export-server',
        `export const notPlugin = { name: 'bad', description: 'Missing', tools: [] };`
      )
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.message).toContain('plugin')
    })

    it('should validate tool structure (name, description, inputSchema, handler)', async () => {
      const tool = toolLiteral('macts__test__do_thing', 'Do a thing', {
        inputSchema: `{ type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }`,
      })
      addMcpPlugin(pluginsProject, 'valid-tools-server', validMcpPluginSource('valid-tools', 'Plugin with valid tools', `[${tool}]`))
      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.errors).toEqual([])
      expect(result.plugins).toHaveLength(1)

      const loadedTool = result.plugins[0]?.tools[0]
      expect(loadedTool?.name).toBe('macts__test__do_thing')
      expect(loadedTool?.description).toBe('Do a thing')
      expect(loadedTool?.inputSchema).toEqual({
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      })
      expect(typeof loadedTool?.handler).toBe('function')
    })

    it('should return multiple errors for multiple broken plugins', async () => {
      // Create two broken plugins
      const broken1 = pluginsProject.addDependency('@macts/broken-one-server', '1.0.0')
      broken1.pkg = { ...broken1.pkg, type: 'module', exports: { './mcp': './dist/mcp/index.js' } }
      broken1.files = {}

      const broken2 = pluginsProject.addDependency('@macts/broken-two-server', '1.0.0')
      broken2.pkg = { ...broken2.pkg, type: 'module', exports: { './mcp': './dist/mcp/index.js' } }
      broken2.files = {}

      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(2)
      const errorNames = result.errors.map((e) => e.packageName).sort()
      expect(errorNames).toEqual(['@macts/broken-one-server', '@macts/broken-two-server'])
    })

    it('should return both plugins and errors when mix of valid and broken', async () => {
      const tools = `[${toolLiteral('macts__good__items_list', 'List items')}]`
      addMcpPlugin(pluginsProject, 'good-app-server', validMcpPluginSource('good-app', 'Good MCP plugin', tools))

      const broken = pluginsProject.addDependency('@macts/bad-app-server', '1.0.0')
      broken.pkg = { ...broken.pkg, type: 'module', exports: { './mcp': './dist/mcp/index.js' } }
      broken.files = {}

      await pluginsProject.write()

      const result = await discoverMcpPlugins()
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0]?.name).toBe('good-app')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/bad-app-server')
    })
  })

  describe('cache integration', () => {
    it('should use cache on second discovery when lockfile exists', async () => {
      // Create a plugin
      const tools = `[${toolLiteral('macts__cached__items_list', 'List items')}]`
      addMcpPlugin(pluginsProject, 'cached-app-server', validMcpPluginSource('cached-app', 'Cached MCP plugin', tools))
      await pluginsProject.write()

      // Create a lockfile so cache can be written
      writeFileSync(join(mactsHome, 'plugins', 'package-lock.json'), JSON.stringify({ lockfileVersion: 3 }))

      // First discovery — slow path, writes cache
      const result1 = await discoverMcpPlugins()
      expect(result1.plugins).toHaveLength(1)

      // Second discovery — should use cache (fast path)
      const result2 = await discoverMcpPlugins()
      expect(result2.plugins).toHaveLength(1)
      expect(result2.plugins[0]?.name).toBe('cached-app')
    })

    it('should invalidate cache when lockfile changes', async () => {
      const tools = `[${toolLiteral('macts__cached__items_list', 'List items')}]`
      addMcpPlugin(pluginsProject, 'cached-app-server', validMcpPluginSource('cached-app', 'Cached MCP plugin', tools))
      await pluginsProject.write()

      // Create lockfile and discover (populates cache)
      writeFileSync(join(mactsHome, 'plugins', 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, v: 1 }))
      const result1 = await discoverMcpPlugins()
      expect(result1.plugins).toHaveLength(1)

      // Change the lockfile content (simulating npm install changing it)
      writeFileSync(join(mactsHome, 'plugins', 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, v: 2 }))

      // Discovery should use slow path (cache hash mismatch)
      const result2 = await discoverMcpPlugins()
      expect(result2.plugins).toHaveLength(1)
    })
  })

  describe('loadMcpPlugin', () => {
    it('should load a valid MCP plugin by package name', async () => {
      const tools = `[${toolLiteral('macts__my__items_list', 'List items')}]`
      addMcpPlugin(pluginsProject, 'my-app-server', validMcpPluginSource('my-app', 'My app', tools))
      await pluginsProject.write()

      const result = await loadMcpPlugin('@macts/my-app-server')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.plugin.name).toBe('my-app')
        expect(result.plugin.tools).toHaveLength(1)
      }
    })

    it('should reject non-server packages', async () => {
      const result = await loadMcpPlugin('@macts/calendar')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid MCP plugin package name')
      }
    })

    it('should reject packages with wrong scope', async () => {
      const result = await loadMcpPlugin('@other/test-server')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid MCP plugin package name')
      }
    })
  })
})

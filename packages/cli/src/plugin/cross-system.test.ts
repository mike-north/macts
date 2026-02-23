/**
 * Cross-system integration tests.
 *
 * Tests that the same @macts/ scoped directory structure can serve both
 * CLI and MCP plugin discovery simultaneously.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Project } from 'fixturify-project'
import { discoverPlugins } from './loader.js'
import { discoverMcpPlugins } from '@macts/mcp'

/**
 * Create a plugins Project configured at the right path inside mactsHome.
 */
function createPluginsProject(mactsHome: string): Project {
  const project = new Project('macts-plugins', '1.0.0')
  project.baseDir = join(mactsHome, 'plugins')
  return project
}

/**
 * Add a CLI plugin to the plugins project.
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
 * Add an MCP plugin to the plugins project.
 */
function addMcpPlugin(pluginsProject: Project, packageName: string, entrySource: string): Project {
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

describe('cross-system plugin discovery', () => {
  let mactsHome: string
  let pluginsProject: Project
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
    mactsHome = mkdtempSync(join(tmpdir(), 'macts-cross-system-'))
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

  it('should discover CLI plugins from @macts/* packages (non-server)', async () => {
    // CLI plugin
    addCliPlugin(
      pluginsProject,
      'test-app',
      `export const plugin = { name: 'test-app', description: 'Test CLI app', commands: [] };`
    )

    // MCP plugin (should be ignored by CLI discovery)
    addMcpPlugin(
      pluginsProject,
      'test-app-server',
      `export const plugin = { name: 'test-app', description: 'Test MCP app', tools: [{ name: 'macts__test__tool', description: 'Test tool', inputSchema: { type: 'object' }, handler: async () => ({ ok: true }) }] };`
    )

    await pluginsProject.write()

    const cliResult = await discoverPlugins()
    expect(cliResult.errors).toEqual([])
    expect(cliResult.plugins).toHaveLength(1)
    expect(cliResult.plugins[0]?.name).toBe('test-app')
    expect(cliResult.plugins[0]?.description).toBe('Test CLI app')
  })

  it('should discover MCP plugins from @macts/*-server packages', async () => {
    // CLI plugin (should be ignored by MCP discovery)
    addCliPlugin(
      pluginsProject,
      'test-app',
      `export const plugin = { name: 'test-app', description: 'Test CLI app', commands: [] };`
    )

    // MCP plugin
    addMcpPlugin(
      pluginsProject,
      'test-app-server',
      `export const plugin = { name: 'test-app', description: 'Test MCP app', tools: [{ name: 'macts__test__tool', description: 'Test tool', inputSchema: { type: 'object' }, handler: async () => ({ ok: true }) }] };`
    )

    await pluginsProject.write()

    const mcpResult = await discoverMcpPlugins()
    expect(mcpResult.errors).toEqual([])
    expect(mcpResult.plugins).toHaveLength(1)
    expect(mcpResult.plugins[0]?.name).toBe('test-app')
    expect(mcpResult.plugins[0]?.description).toBe('Test MCP app')
  })

  it('should discover both CLI and MCP plugins from shared plugins directory', async () => {
    // CLI plugins
    addCliPlugin(
      pluginsProject,
      'calendar',
      `export const plugin = { name: 'calendar', description: 'Calendar CLI', commands: [] };`
    )
    addCliPlugin(
      pluginsProject,
      'contacts',
      `export const plugin = { name: 'contacts', description: 'Contacts CLI', commands: [] };`
    )

    // MCP plugins
    addMcpPlugin(
      pluginsProject,
      'calendar-server',
      `export const plugin = { name: 'calendar', description: 'Calendar MCP', tools: [{ name: 'macts__calendar__events_list', description: 'List events', inputSchema: { type: 'object' }, handler: async () => ({ ok: true }) }] };`
    )
    addMcpPlugin(
      pluginsProject,
      'contacts-server',
      `export const plugin = { name: 'contacts', description: 'Contacts MCP', tools: [{ name: 'macts__contacts__people_list', description: 'List people', inputSchema: { type: 'object' }, handler: async () => ({ ok: true }) }] };`
    )

    await pluginsProject.write()

    // Discover CLI plugins
    const cliResult = await discoverPlugins()
    expect(cliResult.errors).toEqual([])
    expect(cliResult.plugins).toHaveLength(2)
    const cliNames = cliResult.plugins.map((p) => p.name).sort()
    expect(cliNames).toEqual(['calendar', 'contacts'])

    // Verify CLI plugins have correct descriptions
    const cliCalendar = cliResult.plugins.find((p) => p.name === 'calendar')
    expect(cliCalendar?.description).toBe('Calendar CLI')

    // Discover MCP plugins
    const mcpResult = await discoverMcpPlugins()
    expect(mcpResult.errors).toEqual([])
    expect(mcpResult.plugins).toHaveLength(2)
    const mcpNames = mcpResult.plugins.map((p) => p.name).sort()
    expect(mcpNames).toEqual(['calendar', 'contacts'])

    // Verify MCP plugins have correct descriptions
    const mcpCalendar = mcpResult.plugins.find((p) => p.name === 'calendar')
    expect(mcpCalendar?.description).toBe('Calendar MCP')

    // Verify no cross-contamination
    expect(cliResult.plugins.every((p) => 'commands' in p)).toBe(true)
    expect(mcpResult.plugins.every((p) => 'tools' in p)).toBe(true)
  })
})

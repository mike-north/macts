/**
 * Install -> discover wiring tests for MCP server plugins.
 *
 * These cover the issue's core acceptance criterion: a documented command
 * (`macts mcp install <app>`, backed by `installMcpServerPlugin`) places an
 * `@macts/<app>-server` package exactly where the MCP daemon's discovery
 * (`discoverMcpPlugins` in `@macts/mcp`) looks for it, so the app's tools become
 * visible once the daemon starts. The only thing mocked is the `npm install`
 * subprocess — we simulate npm by writing the package into the real plugins
 * node_modules on disk, then run the real discovery path.
 *
 * @see https://github.com/mike-north/macts/issues/25
 * @see https://github.com/mike-north/macts/issues/27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Mock only the npm subprocess; everything else (fs, paths, discovery) is real.
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, spawnSync: vi.fn() }
})

import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { installMcpServerPlugin, installPlugin } from './manager.js'
import { discoverPlugins } from './loader.js'
import { discoverMcpPlugins } from '@macts/mcp'

/**
 * Source for a minimal valid MCP plugin module (the `./mcp` entry point).
 */
function mcpPluginSource(name: string, description: string, toolName: string): string {
  return `export const plugin = { name: '${name}', description: '${description}', tools: [{ name: '${toolName}', description: 'A tool', inputSchema: { type: 'object' }, handler: async () => ({ ok: true }) }] };`
}

/**
 * Source for a minimal valid CLI plugin module (the `./cli` entry point).
 */
function cliPluginSource(name: string, description: string): string {
  return `export const plugin = { name: '${name}', description: '${description}', commands: [] };`
}

/**
 * Write a package into the plugins node_modules to simulate what `npm install`
 * would do. Used as the mock implementation of `spawnSync('npm', ['install', ...])`.
 */
function writeInstalledPackage(
  pluginsDir: string,
  packageName: string,
  exportSubpath: 'mcp' | 'cli',
  source: string
): void {
  const pkgDir = join(pluginsDir, 'node_modules', packageName)
  const distDir = join(pkgDir, 'dist', exportSubpath)
  mkdirSync(distDir, { recursive: true })
  writeFileSync(join(distDir, 'index.js'), source)
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      exports: {
        [`./${exportSubpath}`]: {
          import: `./dist/${exportSubpath}/index.js`,
          default: `./dist/${exportSubpath}/index.js`,
        },
      },
    })
  )
}

describe('MCP install -> discover wiring', () => {
  let mactsHome: string
  let pluginsDir: string
  let originalMactsHome: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    originalMactsHome = process.env['MACTS_HOME']
    mactsHome = mkdtempSync(join(tmpdir(), 'macts-install-discover-'))
    pluginsDir = join(mactsHome, 'plugins')
    process.env['MACTS_HOME'] = mactsHome
  })

  afterEach(() => {
    if (originalMactsHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalMactsHome
    }
    rmSync(mactsHome, { recursive: true, force: true })
  })

  it('installs an MCP server plugin where the daemon discovers it (tools become visible)', async () => {
    // Simulate npm: write @macts/calendar-server into the plugins node_modules.
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      expect(args).toEqual(['install', '--ignore-scripts', '@macts/calendar-server'])
      writeInstalledPackage(
        pluginsDir,
        '@macts/calendar-server',
        'mcp',
        mcpPluginSource('calendar', 'Calendar MCP plugin', 'macts__calendar__events_list')
      )
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    // The documented happy-path command: install by bare app name.
    const installResult = installMcpServerPlugin('calendar')
    expect(installResult.success).toBe(true)

    // The daemon's discovery must now find the app's tools.
    const discovery = await discoverMcpPlugins()
    expect(discovery.errors).toEqual([])
    expect(discovery.plugins).toHaveLength(1)
    expect(discovery.plugins[0]?.name).toBe('calendar')
    expect(discovery.plugins[0]?.tools[0]?.name).toBe('macts__calendar__events_list')
  })

  it('does not expose an installed MCP server plugin to CLI plugin discovery', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, _args: readonly string[]) => {
      writeInstalledPackage(
        pluginsDir,
        '@macts/calendar-server',
        'mcp',
        mcpPluginSource('calendar', 'Calendar MCP plugin', 'macts__calendar__events_list')
      )
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    installMcpServerPlugin('calendar')

    // CLI discovery must ignore -server packages (its loader excludes them).
    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.plugins).toEqual([])
  })

  it('routes a CLI plugin to CLI discovery and keeps it out of MCP discovery', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      expect(args).toEqual(['install', '--ignore-scripts', '@macts/calendar'])
      writeInstalledPackage(
        pluginsDir,
        '@macts/calendar',
        'cli',
        cliPluginSource('calendar', 'Calendar CLI plugin')
      )
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    const installResult = installPlugin('@macts/calendar')
    expect(installResult.success).toBe(true)

    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.errors).toEqual([])
    expect(cliDiscovery.plugins).toHaveLength(1)
    expect(cliDiscovery.plugins[0]?.name).toBe('calendar')

    // The CLI plugin must not appear as an MCP server plugin.
    const mcpDiscovery = await discoverMcpPlugins()
    expect(mcpDiscovery.plugins).toEqual([])
  })

  it('places CLI and MCP plugins for the same app side by side, each discovered by its own system', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      const spec = args[2]
      if (spec === '@macts/calendar') {
        writeInstalledPackage(
          pluginsDir,
          '@macts/calendar',
          'cli',
          cliPluginSource('calendar', 'Calendar CLI plugin')
        )
      } else if (spec === '@macts/calendar-server') {
        writeInstalledPackage(
          pluginsDir,
          '@macts/calendar-server',
          'mcp',
          mcpPluginSource('calendar', 'Calendar MCP plugin', 'macts__calendar__events_list')
        )
      }
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    installPlugin('@macts/calendar')
    installMcpServerPlugin('calendar')

    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.plugins.map((p) => p.name)).toEqual(['calendar'])

    const mcpDiscovery = await discoverMcpPlugins()
    expect(mcpDiscovery.plugins.map((p) => p.name)).toEqual(['calendar'])
    expect(mcpDiscovery.plugins[0]?.tools[0]?.name).toBe('macts__calendar__events_list')
  })
})

/**
 * Install -> discover wiring tests for host packages (`@macts/<app>-server`).
 *
 * These cover the issue's core acceptance criterion: a documented command
 * (`macts mcp install <app>`, backed by `installMcpServerPlugin`) places an
 * `@macts/<app>-server` package exactly where the macts hosts look for it
 * (`findInstalledServerPackages`, the first step of the host registration
 * path), so the app is served once `macts --serve`, `macts --mcp` or the
 * daemon starts. The only thing mocked is the `npm install` subprocess — we simulate
 * npm by writing the package into the real plugins node_modules on disk, then
 * run the real lookup.
 *
 * @see https://github.com/mike-north/macts/issues/25
 * @see https://github.com/mike-north/macts/issues/27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

// Mock only the npm subprocess; everything else (fs, paths, discovery) is real.
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, spawnSync: vi.fn() }
})

import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { findInstalledServerPackages, installMcpServerPlugin, installPlugin } from './manager.js'
import { discoverPlugins } from './loader.js'

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
  exports: Record<string, string>,
  files: Record<string, string>,
  dependencies: Record<string, string> = {}
): void {
  const pkgDir = join(pluginsDir, 'node_modules', packageName)
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(pkgDir, path)), { recursive: true })
    writeFileSync(join(pkgDir, path), source)
  }
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      exports: Object.fromEntries(
        Object.entries(exports).map(([subpath, target]) => [subpath, { import: target }])
      ),
      dependencies,
    })
  )
}

/**
 * Simulate npm installing the host package `@macts/calendar-server`, in the
 * shape every generated host package has: only a `.` export, whose module
 * re-exports the app's contract as `contract`, and a dependency on the app
 * package alone.
 */
function writeCalendarHostPackage(pluginsDir: string): void {
  writeInstalledPackage(
    pluginsDir,
    '@macts/calendar-server',
    { '.': './dist/index.js' },
    {
      'dist/index.js': "export { calendarContract as contract } from '@macts/calendar/contract'\n",
    },
    { '@macts/calendar': '1.0.0' }
  )
}

/** Simulate npm installing the app package `@macts/calendar` with its CLI plugin. */
function writeCalendarCliPlugin(pluginsDir: string): void {
  writeInstalledPackage(
    pluginsDir,
    '@macts/calendar',
    { './cli': './dist/cli/index.js' },
    { 'dist/cli/index.js': cliPluginSource('calendar', 'Calendar CLI plugin') }
  )
}

describe('host package install -> discover wiring', () => {
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

  it('installs a host package where the hosts find it', () => {
    // Simulate npm: write @macts/calendar-server into the plugins node_modules.
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      expect(args).toEqual(['install', '--ignore-scripts', '@macts/calendar-server'])
      writeCalendarHostPackage(pluginsDir)
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    // The documented happy-path command: install by bare app name.
    const installResult = installMcpServerPlugin('calendar')
    expect(installResult.success).toBe(true)

    // The hosts must now find the app's host package.
    expect(findInstalledServerPackages()).toEqual(['@macts/calendar-server'])
  })

  it('does not expose an installed host package to CLI plugin discovery', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, _args: readonly string[]) => {
      writeCalendarHostPackage(pluginsDir)
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    installMcpServerPlugin('calendar')

    // CLI discovery must ignore -server packages (its loader excludes them).
    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.plugins).toEqual([])
  })

  it('routes a CLI plugin to CLI discovery and keeps it out of the host package lookup', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      expect(args).toEqual(['install', '--ignore-scripts', '@macts/calendar'])
      writeCalendarCliPlugin(pluginsDir)
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    const installResult = installPlugin('@macts/calendar')
    expect(installResult.success).toBe(true)

    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.errors).toEqual([])
    expect(cliDiscovery.plugins).toHaveLength(1)
    expect(cliDiscovery.plugins[0]?.name).toBe('calendar')

    // The CLI plugin must not appear as a host package.
    expect(findInstalledServerPackages()).toEqual([])
  })

  it('places an app package and its host package side by side, each found by its own lookup', async () => {
    vi.mocked(spawnSync).mockImplementation(((_cmd: string, args: readonly string[]) => {
      const spec = args[2]
      if (spec === '@macts/calendar') {
        writeCalendarCliPlugin(pluginsDir)
      } else if (spec === '@macts/calendar-server') {
        writeCalendarHostPackage(pluginsDir)
      }
      return { status: 0, stdout: '', stderr: '' } as SpawnSyncReturns<string>
    }) as unknown as typeof spawnSync)

    installPlugin('@macts/calendar')
    installMcpServerPlugin('calendar')

    const cliDiscovery = await discoverPlugins()
    expect(cliDiscovery.plugins.map((p) => p.name)).toEqual(['calendar'])

    expect(findInstalledServerPackages()).toEqual(['@macts/calendar-server'])
  })
})

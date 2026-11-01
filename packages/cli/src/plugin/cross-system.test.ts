/**
 * Cross-system integration tests.
 *
 * Tests that the same @macts/ scoped directory structure serves both CLI
 * plugin discovery and the macts hosts, which find installed host packages
 * (`@macts/*-server`) through `findInstalledServerPackages`, the first step of
 * the host registration path.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Project } from 'fixturify-project'
import { discoverPlugins } from './loader.js'
import { findInstalledServerPackages } from './manager.js'

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
  Object.assign(dep.pkg, {
    type: 'module',
    // Deliberately only "import" (no "default"/"require"), matching the real
    // shape generated for every `@macts/<app>` package — see e.g.
    // packages/calendar/package.json.
    exports: {
      './cli': {
        import: './dist/cli/index.js',
      },
    },
  })
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
 * Add the host package `@macts/<app>-server` to the plugins project, in the
 * shape every generated host package has: only a `.` export, whose module
 * re-exports the app's contract as `contract`, and a dependency on the app
 * package alone.
 */
function addHostPackage(pluginsProject: Project, app: string): Project {
  // The binding an app package's contract module exports: `test-app` → `testAppContract`.
  const binding = `${app.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}Contract`
  const dep = pluginsProject.addDependency(`@macts/${app}-server`, '1.0.0')
  Object.assign(dep.pkg, {
    type: 'module',
    exports: {
      '.': {
        import: './dist/index.js',
      },
    },
    dependencies: { [`@macts/${app}`]: '1.0.0' },
  })
  dep.files = {
    dist: {
      'index.js': `export { ${binding} as contract } from '@macts/${app}/contract'\n`,
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

    // Host package (should be ignored by CLI discovery)
    addHostPackage(pluginsProject, 'test-app')

    await pluginsProject.write()

    const cliResult = await discoverPlugins()
    expect(cliResult.errors).toEqual([])
    expect(cliResult.plugins).toHaveLength(1)
    expect(cliResult.plugins[0]?.name).toBe('test-app')
    expect(cliResult.plugins[0]?.description).toBe('Test CLI app')
  })

  it('should find host packages among @macts/*-server packages only', async () => {
    // CLI plugin (should be ignored by the host package lookup)
    addCliPlugin(
      pluginsProject,
      'test-app',
      `export const plugin = { name: 'test-app', description: 'Test CLI app', commands: [] };`
    )

    // Host package
    addHostPackage(pluginsProject, 'test-app')

    await pluginsProject.write()

    expect(findInstalledServerPackages()).toEqual(['@macts/test-app-server'])
  })

  it('should discover CLI plugins and find host packages in a shared plugins directory', async () => {
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

    // Host packages
    addHostPackage(pluginsProject, 'calendar')
    addHostPackage(pluginsProject, 'contacts')

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

    // Find the host packages
    expect(findInstalledServerPackages()).toEqual([
      '@macts/calendar-server',
      '@macts/contacts-server',
    ])

    // Verify no cross-contamination
    expect(cliResult.plugins.every((p) => 'commands' in p)).toBe(true)
  })
})

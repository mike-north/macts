import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
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
  Object.assign(dep.pkg, {
    type: 'module',
    // Deliberately only "import" (no "default"/"require"), matching the real
    // shape generated for every `@macts/<app>` package — see e.g.
    // packages/calendar/package.json. A prior version of this fixture also
    // declared "default", which masked the real-world resolution bug these
    // packages hit (require.resolve() only matches "require", but these
    // packages are ESM-only and never declare it).
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
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { './cli': './dist/cli/index.js' },
      })
      // Don't create the actual JS file — should cause a load error
      dep.files = {}
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/broken-app')
      // A package that IS installed but is broken must never be classified
      // as 'not-installed' — that's the distinction bin.ts relies on to
      // decide whether to warn (regression coverage for bug 1).
      expect(result.errors[0]?.reason).toBe('load-error')
    })

    it('should return a load-error (not "not-installed") when a package has no ./cli export', async () => {
      const dep = pluginsProject.addDependency('@macts/no-cli-export', '1.0.0')
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { '.': { import: './dist/index.js' } },
      })
      dep.files = { dist: { 'index.js': 'export const plugin = {};' } }
      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.reason).toBe('load-error')
      // resolveExportsConditions() accepts both "import" and "default"
      // conditions, so the message must name both — not just "import" —
      // or a plugin author debugging their exports map is sent looking
      // for the wrong condition.
      expect(result.errors[0]?.message).toContain("does not define a './cli' export")
      expect(result.errors[0]?.message).toContain('"import" or "default"')
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
      expect(result.errors[0]?.reason).toBe('load-error')
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
      expect(result.errors[0]?.reason).toBe('load-error')
    })

    it('should return multiple errors for multiple broken plugins', async () => {
      // Create two broken plugins
      const broken1 = pluginsProject.addDependency('@macts/broken-one', '1.0.0')
      Object.assign(broken1.pkg, { type: 'module', exports: { './cli': './dist/cli/index.js' } })
      broken1.files = {}

      const broken2 = pluginsProject.addDependency('@macts/broken-two', '1.0.0')
      Object.assign(broken2.pkg, { type: 'module', exports: { './cli': './dist/cli/index.js' } })
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
      Object.assign(broken.pkg, { type: 'module', exports: { './cli': './dist/cli/index.js' } })
      broken.files = {}

      await pluginsProject.write()

      const result = await discoverPlugins()
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0]?.name).toBe('good-app')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.packageName).toBe('@macts/bad-app')
    })
  })

  /**
   * resolveCliEntryUrl() reads a plugin package's `exports` map directly
   * (rather than going through Node's own resolver), so it bypasses Node's
   * built-in validation of `exports` target strings. These tests enforce the
   * equivalent constraints by hand:
   *
   *   - A target MUST be a string beginning with "./" — a bare specifier, an
   *     absolute path, or a "../" escape is ERR_INVALID_PACKAGE_TARGET.
   *   - A target MUST NOT contain a "node_modules" path segment.
   *   - A target MUST NOT resolve outside the package directory.
   *
   * @see https://nodejs.org/api/packages.html#exports-sugar
   * @see https://nodejs.org/api/esm.html#resolution-algorithm-specification
   */
  describe('exports target validation', () => {
    it('should reject a "../" traversal target and refuse to load a file outside the package directory', async () => {
      // Plant a real, otherwise-valid plugin module OUTSIDE the plugin
      // package's own directory, and point the plugin's './cli' export at it
      // via a "../" escape computed to land exactly on that file. If the
      // resolver ever joins this target onto packageDir without validating
      // it first, the escape succeeds and this "outside" module gets loaded
      // as if it were the plugin's own entry point.
      const outsideFile = join(mactsHome, 'escape-payload.mjs')
      writeFileSync(
        outsideFile,
        `export const plugin = { name: 'escaped', description: 'should never load', commands: [] };\n`
      )

      const dep = pluginsProject.addDependency('@macts/escape-app', '1.0.0')
      const packageDir = join(pluginsProject.baseDir, 'node_modules', '@macts', 'escape-app')
      const escapeTarget = relative(packageDir, outsideFile).split(sep).join('/')
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { './cli': escapeTarget },
      })
      dep.files = {}
      await pluginsProject.write()

      const result = await loadPlugin('@macts/escape-app')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('load-error')
        // The message must name the package and the offending target so a
        // plugin author can diagnose a malformed exports map.
        expect(result.error).toContain('@macts/escape-app')
        expect(result.error).toContain(escapeTarget)
      }
    })

    it('should reject an absolute-path export target', async () => {
      const dep = pluginsProject.addDependency('@macts/abs-path-app', '1.0.0')
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { './cli': '/etc/cli-entry.js' },
      })
      dep.files = {}
      await pluginsProject.write()

      const result = await loadPlugin('@macts/abs-path-app')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('load-error')
        expect(result.error).toContain('@macts/abs-path-app')
        expect(result.error).toContain('/etc/cli-entry.js')
      }
    })

    it('should reject a bare-specifier export target', async () => {
      const dep = pluginsProject.addDependency('@macts/bare-specifier-app', '1.0.0')
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { './cli': 'some-other-package' },
      })
      dep.files = {}
      await pluginsProject.write()

      const result = await loadPlugin('@macts/bare-specifier-app')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('load-error')
        expect(result.error).toContain('@macts/bare-specifier-app')
        expect(result.error).toContain('some-other-package')
      }
    })

    it('should reject an export target containing a "node_modules" path segment', async () => {
      const dep = pluginsProject.addDependency('@macts/node-modules-app', '1.0.0')
      Object.assign(dep.pkg, {
        type: 'module',
        exports: { './cli': './node_modules/vendored-dep/cli.js' },
      })
      // Plant a real module at the vendored location so a fix regression
      // (accepting this target) would actually succeed at loading it.
      dep.files = {
        node_modules: {
          'vendored-dep': {
            'cli.js': `export const plugin = { name: 'vendored', description: 'should never load', commands: [] };\n`,
          },
        },
      }
      await pluginsProject.write()

      const result = await loadPlugin('@macts/node-modules-app')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('load-error')
        expect(result.error).toContain('@macts/node-modules-app')
        expect(result.error).toContain('./node_modules/vendored-dep/cli.js')
      }
    })

    it('should accept a normal relative export target and load the plugin', async () => {
      addCliPlugin(
        pluginsProject,
        'valid-target-app',
        `export const plugin = { name: 'valid-target-app', description: 'Valid', commands: [] };`
      )
      await pluginsProject.write()

      const result = await loadPlugin('@macts/valid-target-app')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.plugin.name).toBe('valid-target-app')
      }
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

    it('should classify a package removed after caching as not-installed', async () => {
      // Regression test for bug 1: bin.ts must be able to tell "genuinely not
      // installed" apart from "installed but broken" without pattern-matching
      // error text. A stale cache entry for a package that has since been
      // removed from disk (e.g. a partial/failed uninstall) is exactly the
      // "not installed" case — it must never surface as a warning.
      addCliPlugin(
        pluginsProject,
        'removed-app',
        `export const plugin = { name: 'removed-app', description: 'Removed', commands: [] };`
      )
      await pluginsProject.write()

      writeFileSync(
        join(mactsHome, 'plugins', 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3 })
      )

      // Populate the cache while the package is still present.
      const result1 = await discoverPlugins()
      expect(result1.plugins).toHaveLength(1)
      expect(result1.errors).toEqual([])

      // Remove the installed package from disk, but leave the lockfile (and
      // therefore the cache) untouched, simulating a stale cache entry.
      rmSync(join(pluginsProject.baseDir, 'node_modules', '@macts', 'removed-app'), {
        recursive: true,
        force: true,
      })

      const result2 = await discoverPlugins()
      expect(result2.plugins).toEqual([])
      expect(result2.errors).toHaveLength(1)
      expect(result2.errors[0]?.packageName).toBe('@macts/removed-app')
      expect(result2.errors[0]?.reason).toBe('not-installed')
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

/**
 * Test fixtures for host registration: a temporary plugins directory holding
 * tiny real ESM app packages (`@macts/<app>`, with a contract at `./contract`
 * built from `@macts/contracts` value constructors) and their host packages
 * (`@macts/<app>-server`, whose only export `.` re-exports that contract as
 * `contract`), written to disk with real package.json files and `exports`
 * maps. Production code never imports this module.
 *
 * Each fixture app has one resource, `Widget` (plural `Widgets`, route segment
 * `widgets`), and one operation derived by hand from the manifest route rules:
 * `<app>.widgets.list`, permission `<app>:widgets:list`, target command `list`
 * on resource `Widget`, input an empty record.
 */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** A temporary plugins directory; dispose it after the test. */
export interface PluginsFixture {
  /** The plugins directory's `node_modules`. */
  readonly nodeModules: string
  /** Remove the hoisted app package `@macts/<app>`, leaving its host package. */
  removeAppPackage(app: string): void
  /** Remove the directory. */
  dispose(): void
}

/** How one fixture app package deviates from a well-formed one. */
export interface AppPackageOptions {
  /** Declare the `./contract` export. @defaultValue true */
  readonly exportsContract?: boolean
  /** The permission the contract declares for its operation. @defaultValue `<app>:widgets:list` */
  readonly contractPermission?: string
  /** The body of `manifest.js`, replacing the valid manifest. */
  readonly manifestSource?: string
  /**
   * The shape of the host package `@macts/<app>-server`:
   * - `current`: exports only `.`, whose module re-exports the app's contract
   *   as `contract` from `@macts/<app>/contract`.
   * - `older`: the shape host packages installed by an older macts have. It
   *   exports `.` (whose module exports `plugin` and no `contract`) and
   *   `./mcp`.
   * - `no-exports`: declares no `exports` map at all.
   * @defaultValue `current`
   */
  readonly hostShape?: 'current' | 'older' | 'no-exports'
  /** The body of the host package's `index.js`, replacing the one `hostShape` implies. */
  readonly hostSource?: string
  /** The raw text of the host package's `package.json`, replacing the valid one. */
  readonly hostPackageJsonSource?: string
  /**
   * Where the app package is installed relative to its host package:
   * `hoisted` beside it, or `nested` in the host package's own `node_modules`.
   * @defaultValue `hoisted`
   */
  readonly placement?: 'hoisted' | 'nested'
}

/** The directory of the `@macts/contracts` package this package depends on. */
function contractsPackageDir(): string {
  // src/host → the package's own node_modules.
  const here = dirname(fileURLToPath(import.meta.url))
  return realpathSync(join(here, '..', '..', 'node_modules', '@macts', 'contracts'))
}

/**
 * Create an empty plugins directory whose `node_modules/@macts/contracts` links
 * to the real package, as an installed app package's dependency would be.
 */
export function createPluginsFixture(): PluginsFixture {
  const root = mkdtempSync(join(tmpdir(), 'macts-host-apps-'))
  const nodeModules = join(root, 'plugins', 'node_modules')
  mkdirSync(join(nodeModules, '@macts'), { recursive: true })
  symlinkSync(contractsPackageDir(), join(nodeModules, '@macts', 'contracts'), 'dir')
  return {
    nodeModules,
    removeAppPackage(app) {
      rmSync(join(nodeModules, '@macts', app), { recursive: true, force: true })
    },
    dispose() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

/** The capitalized display name of a fixture app (`widgets` → `Widgets`). */
function displayName(app: string): string {
  return app.charAt(0).toUpperCase() + app.slice(1)
}

/** A valid manifest module for a fixture app. */
function validManifestSource(app: string): string {
  const manifest = {
    version: '1.0',
    app: { name: displayName(app), bundleId: `com.example.${app}`, tccEntitlements: [] },
    resources: {
      Widget: {
        name: 'Widget',
        plural: 'Widgets',
        description: 'A widget',
        properties: {},
        identifiers: [{ property: 'id', primary: true }],
      },
    },
    enums: {},
    hierarchy: { children: {} },
    suites: [],
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List widgets',
        scope: 'resource',
        resourceType: 'Widget',
        parameters: [],
      },
    },
  }
  return `export const manifest = ${JSON.stringify(manifest, null, 2)}\n`
}

/** A contract module for a fixture app. */
function contractSource(app: string, permission: string): string {
  return `import { ValueTypes as t } from '@macts/contracts'

const widget = t.record({ id: t.string() })
const list = {
  id: '${app}.widgets.list',
  permission: '${permission}',
  target: { command: 'list', resource: 'Widget' },
  description: 'List widgets',
  input: t.record({}),
  output: t.array(widget),
}

export const ${app}Contract = {
  app: '${app}',
  operations: { [list.id]: list },
  resources: { Widget: { name: 'Widget', record: widget, id: t.string(), list: list.id } },
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind: () => ({}),
}
`
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

/**
 * Write the app package `@macts/<app>` into `nodeModules`.
 *
 * @returns The package directory.
 */
export function writeAppPackage(
  nodeModules: string,
  app: string,
  options: AppPackageOptions = {}
): string {
  const dir = join(nodeModules, '@macts', app)
  mkdirSync(dir, { recursive: true })
  writeJson(join(dir, 'package.json'), {
    name: `@macts/${app}`,
    version: '0.0.0',
    type: 'module',
    // Only "types" and "import", the shape every generated app package has.
    exports:
      options.exportsContract === false
        ? { '.': { import: './index.js' } }
        : { './contract': { types: './contract.d.ts', import: './contract.js' } },
  })
  writeFileSync(join(dir, 'index.js'), 'export {}\n')
  writeFileSync(
    join(dir, 'contract.js'),
    contractSource(app, options.contractPermission ?? `${app}:widgets:list`)
  )
  writeFileSync(join(dir, 'manifest.js'), options.manifestSource ?? validManifestSource(app))
  return dir
}

/** The `exports` map of a fixture host package of the given shape. */
function hostExports(shape: NonNullable<AppPackageOptions['hostShape']>): unknown {
  switch (shape) {
    case 'current':
      return { '.': { types: './index.d.ts', import: './index.js' } }
    case 'older':
      return {
        '.': { types: './index.d.ts', import: './index.js' },
        './mcp': { types: './mcp.d.ts', import: './mcp.js' },
      }
    case 'no-exports':
      return undefined
  }
}

/** The `index.js` of a fixture host package of the given shape. */
function hostIndexSource(app: string, shape: NonNullable<AppPackageOptions['hostShape']>): string {
  return shape === 'current'
    ? `export { ${app}Contract as contract } from '@macts/${app}/contract'\n`
    : `export const plugin = { name: '${app}', routes: [] }\n`
}

/**
 * Write the host package `@macts/<app>-server` into `nodeModules`, and its app
 * package hoisted beside it or nested inside it.
 */
export function writeInstalledApp(
  nodeModules: string,
  app: string,
  options: AppPackageOptions = {}
): void {
  const shape = options.hostShape ?? 'current'
  const hostDir = join(nodeModules, '@macts', `${app}-server`)
  mkdirSync(hostDir, { recursive: true })
  writeJson(join(hostDir, 'package.json'), {
    name: `@macts/${app}-server`,
    version: '0.0.0',
    type: 'module',
    exports: hostExports(shape),
    dependencies: { [`@macts/${app}`]: '0.0.0' },
  })
  if (options.hostPackageJsonSource !== undefined) {
    writeFileSync(join(hostDir, 'package.json'), options.hostPackageJsonSource)
  }
  writeFileSync(join(hostDir, 'index.js'), options.hostSource ?? hostIndexSource(app, shape))
  if (shape === 'older') writeFileSync(join(hostDir, 'mcp.js'), 'export const plugin = {}\n')
  const appNodeModules =
    options.placement === 'nested' ? join(hostDir, 'node_modules') : nodeModules
  writeAppPackage(appNodeModules, app, options)
}

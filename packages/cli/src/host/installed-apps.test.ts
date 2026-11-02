/**
 * Tests for the host registration path: installed app packages in a real
 * temporary plugins directory become registered operations on a real runtime.
 *
 * Expected operation ids and permissions are hand-derived in
 * `installed-apps-fixtures.ts` from the manifest route rules
 * (`<app>.<resource segment>.<command>`, permission `<app>:<segment>:<command>`).
 *
 * Each host package exports the app's contract as `contract` from its `.`
 * export; a host package without that export was installed by an older macts
 * and is reported with the command that reinstalls it (phases/13 D5).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D1, D5, D11)
 * @see https://nodejs.org/api/packages.html#subpath-exports
 * @see https://nodejs.org/api/esm.html#resolution-algorithm-specification
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ALLOW_ALL_POLICY, createRuntime, type MactsRuntime } from '@macts/runtime'
import { createTestStubExecutor } from './executor.js'
import {
  createPluginsFixture,
  writeAppPackage,
  writeInstalledApp,
  type PluginsFixture,
} from './installed-apps-fixtures.js'
import {
  loadInstalledApps,
  registerInstalledApps,
  type AppRegistrationReport,
} from './installed-apps.js'

let plugins: PluginsFixture
let runtime: MactsRuntime

beforeEach(() => {
  plugins = createPluginsFixture()
  runtime = createRuntime({
    executor: createTestStubExecutor(),
    governance: { policy: ALLOW_ALL_POLICY },
  })
})

afterEach(() => {
  plugins.dispose()
})

/** Load from the fixture plugins directory and register with the runtime. */
async function loadAndRegister(): Promise<AppRegistrationReport> {
  const installed = await loadInstalledApps({ nodeModules: plugins.nodeModules })
  return registerInstalledApps(runtime, installed)
}

/** The ids of every operation registered on the runtime. */
function registeredIds(): string[] {
  return runtime.operations().map((operation) => operation.descriptor.id)
}

/** The reason D5 gives for a host package installed by an older macts. */
function olderHostPackageReason(app: string): string {
  return `@macts/${app}-server is from an older macts and does not export its app's contract. Reinstall it with \`macts mcp install ${app}\`.`
}

describe('registerInstalledApps', () => {
  it('registers an installed app from the contract its host package exports', async () => {
    // The app package is hoisted beside its host package: Node finds it by
    // walking up from the host package's own directory.
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.registered.map((app) => [app.app, app.hostPackage])).toEqual([
      ['widgets', '@macts/widgets-server'],
    ])
    expect(report.failed).toEqual([])
    expect(report.missingHost).toEqual([])
    expect(registeredIds()).toEqual(['widgets.widgets.list'])
    const operation = runtime.operation('widgets.widgets.list')
    // Registered from the contract, not the manifest: the descriptor is the
    // contract's own, so its input carries a record plan, never passthrough.
    expect(operation?.descriptor.permission).toBe('widgets:widgets:list')
    expect(operation?.descriptor.input.plan).toEqual({ kind: 'record', fields: {} })
  })

  it('registers an app whose package is nested inside its host package', async () => {
    // Only the host package's own node_modules holds @macts/widgets, so only
    // Node's resolution from the host package can find it.
    writeInstalledApp(plugins.nodeModules, 'widgets', { placement: 'nested' })

    const report = await loadAndRegister()

    expect(report.failed).toEqual([])
    expect(report.registered.map((app) => [app.app, app.hostPackage])).toEqual([
      ['widgets', '@macts/widgets-server'],
    ])
    expect(registeredIds()).toEqual(['widgets.widgets.list'])
  })

  it('reports an older host package, which exports no contract, with the reinstall command and registers the other apps', async () => {
    writeInstalledApp(plugins.nodeModules, 'gadgets', { hostShape: 'older' })
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.failed).toEqual([{ app: 'gadgets', reason: olderHostPackageReason('gadgets') }])
    expect(report.registered.map((app) => app.app)).toEqual(['widgets'])
    expect(registeredIds()).toEqual(['widgets.widgets.list'])
  })

  it('reports a host package with no exports map as an older host package', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', { hostShape: 'no-exports' })

    const report = await loadAndRegister()

    expect(report.registered).toEqual([])
    expect(report.failed).toEqual([{ app: 'widgets', reason: olderHostPackageReason('widgets') }])
    expect(registeredIds()).toEqual([])
  })

  // Regression: an unreadable host package.json was reported as an install from
  // an older macts, hiding the parse error behind the wrong diagnosis.
  it('reports a host package whose package.json cannot be parsed as damaged, not as an older install', async () => {
    writeInstalledApp(plugins.nodeModules, 'gadgets', { hostPackageJsonSource: '{ "name": ' })
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.failed).toHaveLength(1)
    const [failure] = report.failed
    expect(failure?.app).toBe('gadgets')
    expect(failure?.reason).toMatch(/^@macts\/gadgets-server's package\.json cannot be read: /)
    expect(failure?.reason).toMatch(/Reinstall it with `macts mcp install gadgets`\.$/)
    expect(failure?.reason).not.toContain('older macts')
    expect(report.registered.map((app) => app.app)).toEqual(['widgets'])
  })

  it('reports a host package whose app package is not installed, naming the host package and the reinstall command', async () => {
    writeInstalledApp(plugins.nodeModules, 'gadgets')
    plugins.removeAppPackage('gadgets')
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.failed).toHaveLength(1)
    const failure = report.failed[0]
    expect(failure?.app).toBe('gadgets')
    expect(failure?.reason).toMatch(/^@macts\/gadgets-server failed to load: /)
    // Node's own module-not-found message names the missing dependency.
    expect(failure?.reason).toContain("'@macts/gadgets'")
    expect(failure?.reason).toMatch(/ Reinstall it with `macts mcp install gadgets`\.$/)
    expect(report.registered.map((app) => app.app)).toEqual(['widgets'])
  })

  it('reports a host package whose app package does not export its contract', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', { exportsContract: false })

    const report = await loadAndRegister()

    expect(report.registered).toEqual([])
    expect(report.failed).toHaveLength(1)
    expect(report.failed[0]?.reason).toMatch(/^@macts\/widgets-server failed to load: /)
    expect(report.failed[0]?.reason).toContain("'./contract'")
    expect(report.failed[0]?.reason).toMatch(/ Reinstall it with `macts mcp install widgets`\.$/)
    expect(registeredIds()).toEqual([])
  })

  it('reports a host package whose contract export is not an app contract', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', {
      hostSource: "export const contract = { app: 'widgets' }\n",
    })

    const report = await loadAndRegister()

    expect(report.failed).toEqual([
      {
        app: 'widgets',
        reason: "@macts/widgets-server's `contract` export is not an app contract.",
      },
    ])
    expect(registeredIds()).toEqual([])
  })

  it("reports a host package whose contract export is another app's contract", async () => {
    writeAppPackage(plugins.nodeModules, 'gadgets')
    writeInstalledApp(plugins.nodeModules, 'widgets', {
      hostSource: "export { gadgetsContract as contract } from '@macts/gadgets/contract'\n",
    })

    const report = await loadAndRegister()

    expect(report.failed).toEqual([
      {
        app: 'widgets',
        reason:
          "@macts/widgets-server's `contract` export is the contract for gadgets, not widgets.",
      },
    ])
    expect(registeredIds()).toEqual([])
  })

  it('reports and skips an app whose manifest fails validation', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', {
      manifestSource: "export const manifest = { version: '1.0', commands: {} }\n",
    })

    const report = await loadAndRegister()

    expect(report.registered).toEqual([])
    expect(report.failed).toHaveLength(1)
    expect(report.failed[0]?.app).toBe('widgets')
    expect(report.failed[0]?.reason).toMatch(/^@macts\/widgets's manifest is invalid: /)
    // The missing `app` block is named by its path.
    expect(report.failed[0]?.reason).toContain('app:')
    expect(registeredIds()).toEqual([])
  })

  it('reports and skips an app whose contract permission disagrees with its manifest', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', {
      contractPermission: 'widgets:widgets:delete',
    })

    const report = await loadAndRegister()

    expect(report.registered).toEqual([])
    // The OperationRegistrationError from the runtime, as its message.
    expect(report.failed).toEqual([
      {
        app: 'widgets',
        reason:
          'Contract operation "widgets.widgets.list" declares permission "widgets:widgets:delete", but the manifest requires "widgets:widgets:list"',
      },
    ])
    expect(registeredIds()).toEqual([])
  })

  it('reports an app installed without its host package exactly once, in user terms', async () => {
    writeAppPackage(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.missingHost).toEqual([
      {
        app: 'widgets',
        hostPackage: '@macts/widgets-server',
        installCommand: 'macts mcp install widgets',
      },
    ])
    expect(report.registered).toEqual([])
    expect(report.failed).toEqual([])
    expect(registeredIds()).toEqual([])
  })

  it('does not report packages without a contract export as missing a host package', async () => {
    // `@macts/contracts` is linked into every fixture; a CLI-only package is added.
    writeAppPackage(plugins.nodeModules, 'tools', { exportsContract: false })

    const report = await loadAndRegister()

    expect(report.missingHost).toEqual([])
  })

  it('registers the apps that load when another fails', async () => {
    writeInstalledApp(plugins.nodeModules, 'gadgets', {
      contractPermission: 'gadgets:widgets:delete',
    })
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.registered.map((app) => app.app)).toEqual(['widgets'])
    expect(report.failed.map((failure) => failure.app)).toEqual(['gadgets'])
    expect(registeredIds()).toEqual(['widgets.widgets.list'])
  })

  it('reports and skips an app whose host package throws on import, scrubbing the reason', async () => {
    writeInstalledApp(plugins.nodeModules, 'gadgets', {
      hostSource:
        "throw new Error('host init read macts_sk_eyJhbGciOi.import-secret\\nfrom the environment')\n",
    })
    writeInstalledApp(plugins.nodeModules, 'widgets')

    const report = await loadAndRegister()

    expect(report.failed).toEqual([
      {
        app: 'gadgets',
        reason:
          '@macts/gadgets-server failed to load: host init read [redacted credential] from the environment. Reinstall it with `macts mcp install gadgets`.',
      },
    ])
    expect(report.registered.map((app) => app.app)).toEqual(['widgets'])
    expect(registeredIds()).toEqual(['widgets.widgets.list'])
  })

  it('never reports a credential in a failure reason', async () => {
    writeInstalledApp(plugins.nodeModules, 'widgets', {
      manifestSource:
        "throw new Error('could not read MACTS_API_KEY=macts_sk_eyJhbGciOi.secret-part\\nsecond line')\n",
    })

    const report = await loadAndRegister()

    expect(report.failed).toHaveLength(1)
    const reason = report.failed[0]?.reason ?? ''
    expect(reason).not.toContain('macts_sk_')
    expect(reason).not.toContain('secret-part')
    expect(reason).toContain('[redacted credential]')
    expect(reason).not.toContain('\n')
  })

  it('finds nothing when the plugins directory does not exist', async () => {
    const installed = await loadInstalledApps({ nodeModules: '/nonexistent/macts/node_modules' })

    expect(installed).toEqual({ loaded: [], failed: [], missingHost: [] })
  })
})

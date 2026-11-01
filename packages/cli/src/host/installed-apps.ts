/**
 * The one place a macts host on this Mac turns installed app packages into
 * registered operations.
 *
 * `macts --serve` serves the apps installed in the macts plugins directory
 * through this path, registering each one from its **generated contract**,
 * checked against the app's manifest by `registerContract` (phases/13 D5,
 * D11). Per D5, `macts --mcp` adopts the same functions, so that every surface
 * validates calls against the same descriptors. Manifest-only (passthrough)
 * registration is not used here: it remains for embedders and tests.
 *
 * Registration happens in two steps, because loading is asynchronous and a
 * host's runtime may only be available synchronously (the HTTP server builds
 * its routes from the operations registered when it is constructed):
 *
 * 1. {@link loadInstalledApps} finds each installed host package
 *    (`@macts/<app>-server`) through the plugins-directory convention, resolves
 *    `@macts/<app>/contract` from the host package's own location (so nested
 *    and hoisted installs both work), imports it, and loads and validates the
 *    app's manifest. It also finds app packages installed without their host
 *    package.
 * 2. {@link registerInstalledApps} registers every loaded app with a runtime.
 *
 * An app that fails at either step is reported, with a reason that never
 * carries a credential, and skipped; every other app still registers. Nothing
 * here names or special-cases a particular app.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { AppManifestSchema, type AppManifest } from '@macts/core'
import type { AppContract } from '@macts/contracts'
import type { MactsRuntime } from '@macts/runtime'
import { findInstalledPluginPackages, findInstalledServerPackages } from '../plugin/manager.js'
import { getPluginsNodeModules } from '../plugin/paths.js'
import { declaresExport, isRecord, resolvePackageExport } from '../plugin/package-exports.js'

/** The subpath at which every app package exports its generated contract. */
const CONTRACT_SUBPATH = './contract'

/** An installed app whose contract and manifest are loaded and ready to register. */
export interface LoadedApp {
  /** The app's route segment, e.g. `notes`; the same as `contract.app`. */
  readonly app: string
  /** The host package the app was found through, e.g. `@macts/notes-server`. */
  readonly hostPackage: string
  /** The app's generated contract. */
  readonly contract: AppContract<unknown>
  /** The app's validated manifest, from `contract.loadManifest()`. */
  readonly manifest: AppManifest
}

/** An installed app that could not be loaded or registered, and so is not served. */
export interface AppFailure {
  /** The app's route segment, e.g. `notes`. */
  readonly app: string
  /** Why, in one line. Never contains a credential. */
  readonly reason: string
}

/** An app package installed without the host package that serves it. */
export interface AppMissingHost {
  /** The app's route segment, e.g. `notes`. */
  readonly app: string
  /** The host package to install, e.g. `@macts/notes-server`. */
  readonly hostPackage: string
  /** The command that installs it, e.g. `macts mcp install notes`. */
  readonly installCommand: string
}

/** What {@link loadInstalledApps} found in the plugins directory. */
export interface InstalledApps {
  /** Apps ready to register, sorted by app. */
  readonly loaded: readonly LoadedApp[]
  /** Apps whose host package is installed but that could not be loaded. */
  readonly failed: readonly AppFailure[]
  /** App packages installed without their host package, each listed once. */
  readonly missingHost: readonly AppMissingHost[]
}

/** The outcome of registering installed apps: what a host prints at startup. */
export interface AppRegistrationReport {
  /** Apps whose operations were registered, sorted by app. */
  readonly registered: readonly LoadedApp[]
  /** Apps that failed to load or to register, with the reason. */
  readonly failed: readonly AppFailure[]
  /** App packages installed without their host package. */
  readonly missingHost: readonly AppMissingHost[]
}

/** Where {@link loadInstalledApps} looks for installed packages. */
export interface InstalledAppsOptions {
  /**
   * The plugins directory's `node_modules`.
   *
   * @defaultValue `<macts home>/plugins/node_modules`
   */
  readonly nodeModules?: string
}

/**
 * The part of a runtime that registers apps. A `MactsRuntime` satisfies it, as
 * does the registrar the HTTP server passes to its `register` option.
 */
export type ContractRegistrar = Pick<MactsRuntime, 'registerContract'>

/**
 * Find and load every installed app, without registering anything.
 *
 * @param options - Where to look; defaults to the macts plugins directory.
 * @returns The loaded apps, the apps that failed to load, and the app packages
 *   installed without their host package.
 */
export async function loadInstalledApps(
  options: InstalledAppsOptions = {}
): Promise<InstalledApps> {
  const nodeModules = options.nodeModules ?? getPluginsNodeModules()
  const hostPackages = findInstalledServerPackages(nodeModules)

  const loaded: LoadedApp[] = []
  const failed: AppFailure[] = []
  for (const hostPackage of hostPackages) {
    const app = hostPackage.slice('@macts/'.length, -'-server'.length)
    const result = await loadApp(nodeModules, app, hostPackage)
    if (result.ok) loaded.push(result.app)
    else failed.push({ app, reason: scrubReason(result.reason) })
  }

  return { loaded, failed, missingHost: findAppsMissingHost(nodeModules, hostPackages) }
}

/**
 * Register every loaded app's contract with a runtime.
 *
 * @remarks
 * Each app is registered on its own: `registerContract` is atomic per app, so
 * an app it refuses (for example an `OperationRegistrationError`, when a
 * descriptor's permission or target disagrees with the manifest) adds nothing
 * and is reported, and the remaining apps still register. Load failures and
 * missing host packages from `installed` are carried into the report.
 *
 * @param runtime - The runtime, or the registrar of the runtime, to register with.
 * @param installed - What {@link loadInstalledApps} found.
 * @returns What registered, what failed and why, and what is missing its host package.
 */
export function registerInstalledApps(
  runtime: ContractRegistrar,
  installed: InstalledApps
): AppRegistrationReport {
  const registered: LoadedApp[] = []
  const failed: AppFailure[] = [...installed.failed]
  for (const loadedApp of installed.loaded) {
    try {
      runtime.registerContract(loadedApp.contract, loadedApp.manifest)
      registered.push(loadedApp)
    } catch (error) {
      failed.push({ app: loadedApp.app, reason: scrubReason(messageOf(error)) })
    }
  }
  failed.sort((a, b) => a.app.localeCompare(b.app))
  return { registered, failed, missingHost: installed.missingHost }
}

/** The outcome of loading one app. */
type LoadResult = { ok: true; app: LoadedApp } | { ok: false; reason: string }

/** Load one app's contract and manifest through its host package. */
async function loadApp(nodeModules: string, app: string, hostPackage: string): Promise<LoadResult> {
  const appPackage = `@macts/${app}`
  const hostPackageJson = join(nodeModules, hostPackage, 'package.json')
  if (!existsSync(hostPackageJson)) {
    return { ok: false, reason: `${hostPackage} is incomplete: it has no package.json.` }
  }

  const appDir = locateFrom(hostPackageJson, appPackage)
  if (appDir === undefined) {
    return {
      ok: false,
      reason: `${appPackage}, which ${hostPackage} depends on, is not installed. Reinstall it with \`macts mcp install ${app}\`.`,
    }
  }

  const entry = resolvePackageExport(appDir, appPackage, CONTRACT_SUBPATH)
  if (!entry.found) {
    return { ok: false, reason: entry.error }
  }

  let module: unknown
  try {
    module = await import(entry.url)
  } catch (error) {
    return { ok: false, reason: `${appPackage}'s contract failed to load: ${messageOf(error)}` }
  }

  const contract = findContract(module, app)
  if (!contract.ok) {
    return { ok: false, reason: `${appPackage}'s contract module ${contract.reason}` }
  }

  let rawManifest: unknown
  try {
    rawManifest = await contract.value.loadManifest()
  } catch (error) {
    return { ok: false, reason: `${appPackage}'s manifest failed to load: ${messageOf(error)}` }
  }
  const manifest = AppManifestSchema.safeParse(rawManifest)
  if (!manifest.success) {
    const issues = manifest.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    const more =
      manifest.error.issues.length > 3
        ? ` (and ${String(manifest.error.issues.length - 3)} more)`
        : ''
    return { ok: false, reason: `${appPackage}'s manifest is invalid: ${issues.join('; ')}${more}` }
  }

  return { ok: true, app: { app, hostPackage, contract: contract.value, manifest: manifest.data } }
}

/**
 * The directory of `packageName` as Node would find it from the package whose
 * package.json is `fromPackageJson`: its own nested `node_modules` first, then
 * each ancestor's.
 *
 * @remarks
 * Only the lookup directories come from `createRequire`; the package itself is
 * located by its package.json, because these ESM-only packages export no
 * `require` condition (or `./package.json`) for `require.resolve` to match.
 */
function locateFrom(fromPackageJson: string, packageName: string): string | undefined {
  const lookupDirs = createRequire(fromPackageJson).resolve.paths(packageName) ?? []
  for (const dir of lookupDirs) {
    const candidate = join(dir, packageName)
    if (existsSync(join(candidate, 'package.json'))) return candidate
  }
  return undefined
}

/** The outcome of finding the contract a module exports. */
type ContractLookup = { ok: true; value: AppContract<unknown> } | { ok: false; reason: string }

/**
 * The one contract for `app` among a module's exports.
 *
 * @remarks
 * Selected by shape and by `contract.app`, not by binding name, so the host
 * never depends on how a generator names the export.
 */
function findContract(module: unknown, app: string): ContractLookup {
  const candidates = isRecord(module)
    ? Object.values(module).filter(
        (value): value is AppContract<unknown> => isAppContract(value) && value.app === app
      )
    : []
  const [only, ...rest] = candidates
  if (only === undefined) return { ok: false, reason: `exports no contract for ${app}.` }
  if (rest.length > 0) return { ok: false, reason: `exports more than one contract for ${app}.` }
  return { ok: true, value: only }
}

/** Whether `value` has the shape of an `AppContract`. */
function isAppContract(value: unknown): value is AppContract<unknown> {
  return (
    isRecord(value) &&
    typeof value['app'] === 'string' &&
    isRecord(value['operations']) &&
    isRecord(value['resources']) &&
    typeof value['bind'] === 'function' &&
    typeof value['loadManifest'] === 'function'
  )
}

/**
 * App packages that export a contract but whose host package is not
 * installed. Each app appears once.
 */
function findAppsMissingHost(
  nodeModules: string,
  hostPackages: readonly string[]
): AppMissingHost[] {
  const hosts = new Set(hostPackages)
  return findInstalledPluginPackages(nodeModules)
    .filter((appPackage) => !hosts.has(`${appPackage}-server`))
    .filter((appPackage) => exportsContract(join(nodeModules, appPackage)))
    .sort()
    .map((appPackage) => {
      const app = appPackage.slice('@macts/'.length)
      return {
        app,
        hostPackage: `${appPackage}-server`,
        installCommand: `macts mcp install ${app}`,
      }
    })
}

/** Whether the package in `packageDir` declares a `./contract` export. */
function exportsContract(packageDir: string): boolean {
  try {
    const pkg: unknown = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'))
    return declaresExport(pkg, CONTRACT_SUBPATH)
  } catch {
    return false
  }
}

/** A thrown value's message, without its stack or any other field. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** A macts API key, wherever one might appear in third-party error text. */
const CREDENTIAL_PATTERN = /macts_sk_[A-Za-z0-9._~+/=-]*/g

/**
 * A failure reason fit to print in a host's startup report: anything shaped
 * like a macts API key is replaced, and newlines and other runs of whitespace
 * collapse to one space, so the reason fits on one line. Package code is
 * third-party, and its error text could echo a credential from the
 * environment.
 *
 * Nothing else is redacted. Local file paths in module-load errors are kept,
 * because they say which file failed; the report reaches only this Mac's own
 * stdout, never a remote caller.
 */
function scrubReason(reason: string): string {
  return reason.replace(CREDENTIAL_PATTERN, '[redacted credential]').replace(/\s+/g, ' ').trim()
}

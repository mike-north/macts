/**
 * Every real app contract and manifest in the repository, for tests that check
 * a property of all of them.
 *
 * An app is a `manifests/<app>/` directory with an `app.yaml`; its contract is
 * imported from `@macts/<app>/contract`, the subpath at which every app package
 * exports it (and which the app's host package re-exports as `contract`). Each
 * app package must be a devDependency of this package, so that it is built
 * before the tests run; {@link missingAppDependencies} reports any that are not.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadManifest, type AppManifest } from '@macts/core'
import type { AnyOperationDescriptor, OperationId } from '@macts/contracts'

/** The repository's `manifests/` directory. */
const MANIFESTS_DIR = fileURLToPath(new URL('../../../manifests/', import.meta.url))

/** This package's `package.json`. */
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url))

/** The manifest file name inside an app's manifest directory. */
const MANIFEST_FILE = 'app.yaml'

/** The parts of an app's contract these tests read. */
export interface RealContract {
  readonly operations: Readonly<Record<OperationId, AnyOperationDescriptor>>
}

/** One app: its package directory name, manifest and contract. */
export interface RealApp {
  /** The app's package directory name, e.g. `google-chrome`. */
  readonly name: string
  readonly manifest: AppManifest
  readonly contract: RealContract
}

/** Every app with a manifest, by package directory name, sorted. */
export const APP_NAMES: readonly string[] = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(MANIFESTS_DIR, entry.name, MANIFEST_FILE))
  )
  .map((entry) => entry.name)
  .sort()

/** Whether a value is a contract: an object with an `operations` table. */
function isContract(value: unknown): value is RealContract {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operations' in value &&
    typeof value.operations === 'object' &&
    value.operations !== null
  )
}

/**
 * The single contract an app's `/contract` module exports.
 *
 * @throws when the module exports no contract, or more than one.
 */
async function importContract(app: string): Promise<RealContract> {
  const module: unknown = await import(`@macts/${app}/contract`)
  if (typeof module !== 'object' || module === null) throw new Error(`${app}: no module`)
  const contracts = Object.entries(module).filter(
    ([name, value]) => name.endsWith('Contract') && isContract(value)
  )
  const [only] = contracts
  if (contracts.length !== 1 || only === undefined || !isContract(only[1])) {
    throw new Error(
      `${app}: expected one contract export, found ${String(contracts.length)}: ${contracts
        .map(([name]) => name)
        .join(', ')}`
    )
  }
  return only[1]
}

/** Load every app's manifest and contract, in {@link APP_NAMES} order. */
export async function loadRealApps(): Promise<RealApp[]> {
  return Promise.all(
    APP_NAMES.map(async (name) => ({
      name,
      manifest: await loadManifest(join(MANIFESTS_DIR, name, MANIFEST_FILE)),
      contract: await importContract(name),
    }))
  )
}

/** The app packages that are not devDependencies of this package, so may be unbuilt. */
export function missingAppDependencies(): string[] {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
    devDependencies?: Record<string, string>
  }
  const declared = pkg.devDependencies ?? {}
  return APP_NAMES.map((app) => `@macts/${app}`).filter((name) => !(name in declared))
}

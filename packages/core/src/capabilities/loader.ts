/**
 * Load a capability registry from a directory of manifests.
 *
 * @packageDocumentation
 */

import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/index.js'
import { buildCapabilityRegistry } from './registry.js'
import type { CapabilityRegistry } from './types.js'

/**
 * Standard manifest filename within each app's manifest directory.
 */
const MANIFEST_FILENAME = 'app.yaml'

/**
 * Load every manifest under a manifests root directory.
 *
 * Each immediate subdirectory containing an `app.yaml` is treated as one app.
 * Subdirectories without an `app.yaml` are skipped. Manifests that fail to
 * load are collected as errors rather than aborting the whole load, so one
 * malformed manifest does not break discovery for the rest.
 *
 * @param manifestsDir - Path to the manifests root (e.g. `<repo>/manifests`)
 * @returns Loaded manifests and any per-manifest load errors
 */
export async function loadManifestsFromDir(manifestsDir: string): Promise<{
  manifests: AppManifest[]
  errors: { app: string; message: string }[]
}> {
  const manifests: AppManifest[] = []
  const errors: { app: string; message: string }[] = []

  let entries: Dirent[]
  try {
    entries = await readdir(manifestsDir, { withFileTypes: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { manifests, errors: [{ app: manifestsDir, message }] }
  }

  // Sort directory names so the resulting registry order is deterministic
  // regardless of filesystem enumeration order.
  const appDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const app of appDirs) {
    const manifestPath = join(manifestsDir, app, MANIFEST_FILENAME)
    try {
      manifests.push(await loadManifest(manifestPath))
    } catch (error) {
      // Skip subdirectories that simply have no manifest; only report real
      // load/validation failures of an existing manifest file.
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('ENOENT')) {
        continue
      }
      errors.push({ app, message })
    }
  }

  return { manifests, errors }
}

/**
 * Build a {@link CapabilityRegistry} from every manifest under a directory.
 *
 * @param manifestsDir - Path to the manifests root
 * @returns The registry plus any per-manifest load errors
 */
export async function loadCapabilityRegistry(manifestsDir: string): Promise<{
  registry: CapabilityRegistry
  errors: { app: string; message: string }[]
}> {
  const { manifests, errors } = await loadManifestsFromDir(manifestsDir)
  return { registry: buildCapabilityRegistry(manifests), errors }
}

/**
 * Shared helpers for the `macts capabilities` commands: locating the manifests
 * directory and loading the capability registry from it.
 *
 * @packageDocumentation
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import { loadCapabilityRegistry, type CapabilityRegistry } from '@macts/core'

/**
 * Candidate manifests-directory locations, in priority order. Mirrors the
 * resolution strategy the root `--serve` command uses for a single manifest, so
 * discovery works whether run from the repo, an installed CLI, or via tsx.
 *
 * @param explicit - An explicit `--manifests-dir` override (highest priority)
 * @returns Ordered candidate directories
 */
export function manifestsDirCandidates(explicit?: string): string[] {
  const candidates: string[] = []
  if (explicit) {
    candidates.push(path.resolve(explicit))
  }
  // 1. Current working directory's manifests/.
  candidates.push(path.join(process.cwd(), 'manifests'))
  // 2. User's macts config directory.
  candidates.push(path.join(process.env['HOME'] ?? '', '.macts', 'manifests'))
  // 3. Relative to the built CLI (packages/cli/dist/...).
  candidates.push(path.resolve(import.meta.dirname, '../../../../manifests'))
  // 4. Relative to source (packages/cli/src/commands/capabilities/...).
  candidates.push(path.resolve(import.meta.dirname, '../../../../../manifests'))
  return candidates
}

/**
 * Resolve the first existing manifests directory from the candidate list.
 *
 * @param explicit - Optional explicit override
 * @returns The resolved directory, or `null` if none exist
 */
export function resolveManifestsDir(explicit?: string): string | null {
  for (const dir of manifestsDirCandidates(explicit)) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return dir
    }
  }
  return null
}

/**
 * Result of {@link loadRegistry}.
 */
export interface LoadRegistryResult {
  registry: CapabilityRegistry
  manifestsDir: string
  loadErrors: { app: string; message: string }[]
}

/**
 * Locate the manifests directory and load the capability registry from it.
 *
 * @param explicit - Optional explicit `--manifests-dir`
 * @returns The registry plus the directory used and any per-manifest errors
 * @throws Error if no manifests directory can be found
 */
export async function loadRegistry(explicit?: string): Promise<LoadRegistryResult> {
  const manifestsDir = resolveManifestsDir(explicit)
  if (!manifestsDir) {
    throw new Error(
      'Could not locate a manifests directory. Pass --manifests-dir <path> or run from a directory containing manifests/.'
    )
  }
  const { registry, errors } = await loadCapabilityRegistry(manifestsDir)
  return { registry, manifestsDir, loadErrors: errors }
}

/**
 * Utilities for writing runtime-probe results back into a manifest file.
 *
 * @packageDocumentation
 */

import { readFile, writeFile } from 'node:fs/promises'
import * as yaml from 'js-yaml'
import type { AppProbeResult } from './probe.js'

/**
 * Merge the probe results from {@link AppProbeResult} back into the YAML
 * manifest at `manifestPath`.
 *
 * Each probed resource's `probe` block is upserted under
 * `resources.<Name>.probe` in the raw YAML document.  The sdef-declared
 * `identifiers` array is not touched — probe metadata is purely additive.
 *
 * @param manifestPath - Absolute path to the `app.yaml` manifest file
 * @param result       - Probe result produced by {@link probeManifest}
 */
export async function writeProbeResults(
  manifestPath: string,
  result: AppProbeResult
): Promise<void> {
  const content = await readFile(manifestPath, 'utf-8')
  const parsed = yaml.load(content)

  // yaml.load returns `unknown`; we need a mutable object to graft probe data
  // onto.  Guard that it is a plain object before proceeding.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Manifest at ${manifestPath} did not parse to a plain object`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = parsed as Record<string, any>

  for (const [resourceName, r] of Object.entries(result.resources)) {
    if (typeof raw['resources'] !== 'object' || raw['resources'] === null) continue
    if (!Object.prototype.hasOwnProperty.call(raw['resources'], resourceName)) continue

    // Build a compact probe block — only include fields that have values
    const probeBlock: Record<string, string> = {
      status: r.probe.status,
    }
    if (r.probe.runtimeIdentifier !== undefined) {
      probeBlock['runtimeIdentifier'] = r.probe.runtimeIdentifier
    }
    if (r.probe.probedAt !== undefined) {
      probeBlock['probedAt'] = r.probe.probedAt
    }
    if (r.probe.note !== undefined) {
      probeBlock['note'] = r.probe.note
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    raw['resources'][resourceName].probe = probeBlock
  }

  const updated = yaml.dump(raw, { lineWidth: 120, quotingType: '"', noRefs: true })
  await writeFile(manifestPath, updated, 'utf-8')
}

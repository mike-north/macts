/**
 * `macts probe <app>` — runtime-validate manifest identifiers against the
 * live application.
 *
 * This command:
 * 1. Loads the named app's manifest from the manifests directory.
 * 2. Probes each resource to find which declared identifier property actually
 *    works via JXA (vs. throwing "AppleEvent handler failed").
 * 3. Writes the result back into the manifest as `resource.probe.*` metadata,
 *    leaving the sdef-declared `identifiers` intact for provenance.
 *
 * ## Requirements
 *
 * The target app must be installed and TCC automation permission must be
 * granted before this command will succeed.  Because real-app JXA calls
 * cannot run in CI, probe results are sealed locally (see `attest-it`) and
 * CI verifies only the sealed attestation.
 *
 * ## Local run
 *
 * ```bash
 * macts probe calendar
 * # Probes com.apple.iCal, prints per-resource results, writes
 * # manifests/calendar/app.yaml with updated probe metadata.
 *
 * macts probe calendar --resource Calendar --dry-run
 * # Probe only the Calendar resource, print human-readable output, do not write.
 * ```
 *
 * @packageDocumentation
 */

import { Command, Option } from 'clipanion'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadManifest, probeManifest, runWithApp, writeProbeResults } from '@macts/core'
import type { AppProbeResult } from '@macts/core'
import { resolveManifestsDir } from './capabilities/registry.js'

/**
 * `macts probe <app>`
 *
 * Runtime-probe an app manifest's declared identifiers against the live app,
 * recording which property actually works, then write the results back into
 * the manifest as `resource.probe` metadata.
 */
export class ProbeCommand extends Command {
  static override paths = [['probe']]

  static override usage = Command.Usage({
    description: 'Runtime-validate manifest identifiers against the live app',
    details: `
      Probes each resource in the named app's manifest by attempting to read
      each declared identifier property from the first item of the collection
      via JXA.  Records which property actually returns a value vs. throws
      (e.g. "AppleEvent handler failed"), and persists the result into the
      manifest as \`resource.probe.runtimeIdentifier\`.

      The sdef-declared identifiers are kept intact for provenance; \`probe\`
      is additive metadata.

      REQUIREMENTS
        - The app must be installed.
        - TCC automation permission must have been granted for Terminal (or
          whatever shell runs macts).
        - Seal the probe result with attest-it after running so CI can gate on
          the attestation without needing the app installed.

      SEALING (per ENG_TEAM_INSTRUCTIONS §6)
        After a successful probe run:
          npx attest-it seal manifests/<app>/app.yaml
          git add manifests/<app>/app.yaml manifests/<app>/app.yaml.attestation
          git commit -m "Seal runtime probe for <app>"

      If --dry-run is set, probe results are printed but the manifest is NOT
      written to disk.
    `,
    examples: [
      ['Probe all Calendar resources', '$0 probe calendar'],
      ['Probe only the Calendar resource', '$0 probe calendar --resource Calendar'],
      ['Dry-run probe (print only, no write)', '$0 probe calendar --dry-run'],
      ['Emit JSON output', '$0 probe calendar --json'],
    ],
  })

  /** App name (must match a subdirectory under the manifests directory) */
  app = Option.String({ required: true })

  /** Restrict probing to this resource name (may be specified multiple times) */
  resource = Option.Array('--resource', {
    description: 'Resource(s) to probe (default: all)',
  })

  /** Print results without writing the manifest */
  dryRun = Option.Boolean('--dry-run', {
    description: 'Print results but do not write the manifest',
  })

  /** Emit machine-readable JSON */
  json = Option.Boolean('--json', {
    description: 'Output results as JSON',
  })

  /** Override manifests directory (auto-detected by default) */
  manifestsDir = Option.String('--manifests-dir', {
    description: 'Directory containing app manifests (auto-detected by default)',
  })

  async execute(): Promise<number> {
    // Locate the manifest file
    const manifestPath = this.resolveManifestPath()
    if (!manifestPath) {
      this.context.stderr.write(
        `Could not find manifest for "${this.app}". ` +
          `Looked in: ${this.resolveManifestsDirStr()}\n`
      )
      return 1
    }

    // Load and parse manifest
    let manifest: Awaited<ReturnType<typeof loadManifest>>
    try {
      manifest = await loadManifest(manifestPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.context.stderr.write(`Failed to load manifest: ${msg}\n`)
      return 1
    }

    this.context.stderr.write(`Probing ${manifest.app.name} (${manifest.app.bundleId})...\n`)

    // Run the probe with the real JXA runner.
    // exactOptionalPropertyTypes: don't pass resources: undefined — omit key
    // when unset so the type matches ProbeManifestOptions exactly.
    const probeOptions =
      this.resource !== undefined
        ? { resources: this.resource, now: new Date().toISOString() }
        : { now: new Date().toISOString() }

    let result: AppProbeResult
    try {
      result = await probeManifest(manifest, runWithApp, probeOptions)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.context.stderr.write(`Probe failed: ${msg}\n`)
      return 1
    }

    // Output results
    if (this.json) {
      this.context.stdout.write(JSON.stringify(result, null, 2) + '\n')
    } else {
      this.printHumanReadable(result)
    }

    // Write back to manifest unless --dry-run
    if (!this.dryRun) {
      try {
        await writeProbeResults(manifestPath, result)
        this.context.stderr.write(`Wrote probe results to ${manifestPath}\n`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.context.stderr.write(`Failed to write manifest: ${msg}\n`)
        return 1
      }
    } else {
      this.context.stderr.write(`(dry-run — manifest NOT written)\n`)
    }

    return 0
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveManifestsDirStr(): string {
    return resolveManifestsDir(this.manifestsDir) ?? '(no manifests dir found)'
  }

  private resolveManifestPath(): string | null {
    const dir = resolveManifestsDir(this.manifestsDir)
    if (!dir) return null
    const candidate = path.join(dir, this.app, 'app.yaml')
    return fs.existsSync(candidate) ? candidate : null
  }

  private printHumanReadable(result: AppProbeResult): void {
    this.context.stdout.write(`\nProbe results for ${result.appName} (${result.bundleId})\n`)
    this.context.stdout.write('='.repeat(56) + '\n\n')

    for (const [resourceName, r] of Object.entries(result.resources)) {
      const icon =
        r.probe.status === 'probed'
          ? '[ok]'
          : r.probe.status === 'no-items'
            ? '[empty]'
            : r.probe.status === 'failed'
              ? '[FAIL]'
              : '[ERROR]'

      this.context.stdout.write(`${icon}  ${resourceName}\n`)
      if (r.runtimeIdentifier) {
        this.context.stdout.write(`     runtimeIdentifier: ${r.runtimeIdentifier}\n`)
      }
      for (const c of r.candidates) {
        const mark = c.succeeded ? 'pass' : 'fail'
        const errNote = c.error ? `  -- ${c.error}` : ''
        this.context.stdout.write(`     ${mark}  ${c.property}${errNote}\n`)
      }
      if (r.probe.note) {
        this.context.stdout.write(`     note: ${r.probe.note}\n`)
      }
      this.context.stdout.write('\n')
    }
  }
}

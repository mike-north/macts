/**
 * `macts probe <app>` — runtime-validate manifest identifiers against the
 * live application, or, with `--nullability`, observe which properties the
 * app leaves empty.
 *
 * By default, this command:
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
 *
 * macts probe notes --nullability --dry-run
 * # Read up to 60 items per resource and report which properties are
 * # sometimes empty, without writing the manifest.
 * ```
 *
 * ## Nullability mode
 *
 * With `--nullability`, the command reads every property of up to
 * `--max-items` items of each resource (read-only: it never creates, changes,
 * or deletes anything) and records, per property, how many reads found no
 * value. Only counts are kept: no observed value is printed or written. The
 * observations become `nullable` claims with probe evidence in the manifest,
 * by the rules in `mergeNullabilityObservations`, plus a `nullabilityProbe`
 * block per resource.
 *
 * @packageDocumentation
 */

import { Command, Option } from 'clipanion'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  DEFAULT_NULLABILITY_BUDGET_MS,
  DEFAULT_NULLABILITY_ENVIRONMENT,
  MAX_ITEMS_PER_COLLECTION,
  loadManifest,
  mergeNullabilityObservations,
  probeManifest,
  probeNullability,
  runWithApp,
  writeNullabilityResults,
  writeProbeResults,
} from '@macts/core'
import type {
  AppManifest,
  AppNullabilityResult,
  AppProbeResult,
  IdentifierDefect,
  JxaRunner,
  NullabilityMergeResult,
  NullabilityProbeEnvironment,
  PropertyMergeOutcome,
  SkipReason,
} from '@macts/core'
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

      NULLABILITY MODE (--nullability)
        Reads every property of up to --max-items items (default and maximum
        ${String(MAX_ITEMS_PER_COLLECTION)}) of each resource, within a time budget for the whole
        app (--budget-seconds, default ${String(DEFAULT_NULLABILITY_BUDGET_MS / 1000)}), and counts how often each
        property is empty. It only reads: nothing in the app is created,
        changed, or deleted. Only counts are kept; no value is printed or
        written.

        The items are spread out, not the first ones: each collection is
        sampled at evenly spaced positions, and a nested resource (events in
        calendars, reminders in lists) takes an equal share from every
        parent. A probe that reads no items of a resource keeps the earlier
        record of how that resource was probed.

        File and data properties, lists of references to app objects (such
        as a folder's notes), properties that hold large content (such as a
        note body), and any named with --skip-property are not read.

        Each property is reported as nullable (an empty value was seen),
        non-null (no empty value in enough reads), insufficient sample, read
        failed, or skipped. The manifest records the evidence: an observed
        empty value replaces a curated non-null claim (reported as a
        contradiction), while a clean sample never narrows a nullable claim
        or overrides a curated one.
    `,
    examples: [
      ['Probe all Calendar resources', '$0 probe calendar'],
      ['Probe only the Calendar resource', '$0 probe calendar --resource Calendar'],
      ['Dry-run probe (print only, no write)', '$0 probe calendar --dry-run'],
      ['Emit JSON output', '$0 probe calendar --json'],
      ['Observe which Notes properties are empty', '$0 probe notes --nullability --dry-run'],
      [
        'Probe nullability of two resources, reading at most 20 items each',
        '$0 probe calendar --nullability --resource Calendar --resource Event --max-items 20',
      ],
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

  /** Observe property nullability instead of identifiers */
  nullability = Option.Boolean('--nullability', {
    description: 'Observe which properties the app leaves empty (read-only)',
  })

  /** Items to read per resource in nullability mode */
  maxItems = Option.String('--max-items', {
    description: `Items to read per resource with --nullability (1 to ${String(MAX_ITEMS_PER_COLLECTION)})`,
  })

  /** Time budget for the whole app in nullability mode */
  budgetSeconds = Option.String('--budget-seconds', {
    description: `Time budget for the app with --nullability, in seconds (default ${String(DEFAULT_NULLABILITY_BUDGET_MS / 1000)})`,
  })

  /** Properties not to read in nullability mode */
  skipProperty = Option.Array('--skip-property', {
    description: 'Property name not to read with --nullability (may be repeated)',
  })

  /**
   * Runs a function body inside the target app's automation process. The
   * real runner by default; a subclass (such as a test's) may substitute
   * another.
   */
  protected runner: JxaRunner = runWithApp

  /**
   * Where the nullability probe's provenance (macOS version, timestamp, and
   * clock) comes from. The real environment by default; a subclass may
   * substitute another.
   */
  protected nullabilityEnvironment: NullabilityProbeEnvironment = DEFAULT_NULLABILITY_ENVIRONMENT

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

    if (this.nullability) return this.executeNullability(manifestPath, manifest)

    this.context.stderr.write(`Probing ${manifest.app.name} (${manifest.app.bundleId})...\n`)

    // Run the probe with the JXA runner.
    // exactOptionalPropertyTypes: don't pass resources: undefined — omit key
    // when unset so the type matches ProbeManifestOptions exactly.
    const probeOptions =
      this.resource !== undefined
        ? { resources: this.resource, now: new Date().toISOString() }
        : { now: new Date().toISOString() }

    let result: AppProbeResult
    try {
      result = await probeManifest(manifest, this.runner, probeOptions)
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

  /** The `--nullability` mode: probe, merge, report, and (unless dry-run) write. */
  private async executeNullability(manifestPath: string, manifest: AppManifest): Promise<number> {
    const maxItems = parseCount(this.maxItems, '--max-items', 1)
    const budgetSeconds = parseCount(this.budgetSeconds, '--budget-seconds')
    if (typeof maxItems === 'string' || typeof budgetSeconds === 'string') {
      this.context.stderr.write(`${[maxItems, budgetSeconds].filter(isText).join('\n')}\n`)
      return 1
    }

    this.context.stderr.write(
      `Probing nullability of ${manifest.app.name} (${manifest.app.bundleId})...\n`
    )
    let observed: AppNullabilityResult
    try {
      observed = await probeNullability(manifest, this.runner, {
        ...(this.resource === undefined ? {} : { resources: this.resource }),
        ...(maxItems === undefined ? {} : { maxItems }),
        ...(budgetSeconds === undefined ? {} : { budgetMs: budgetSeconds * 1000 }),
        ...(this.skipProperty === undefined ? {} : { skipProperties: this.skipProperty }),
        environment: this.nullabilityEnvironment,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.context.stderr.write(`Probe failed: ${msg}\n`)
      return 1
    }
    const merged = mergeNullabilityObservations(manifest, observed)
    const report = nullabilityReport(observed, merged)

    if (this.json) {
      this.context.stdout.write(JSON.stringify(report, null, 2) + '\n')
    } else {
      this.printNullabilityReport(report)
    }

    if (this.dryRun) {
      this.context.stderr.write(`(dry-run — manifest NOT written)\n`)
      return 0
    }
    try {
      const written = await writeNullabilityResults(manifestPath, merged)
      this.context.stderr.write(`Wrote nullability evidence to ${manifestPath}\n`)
      if (written.keptEarlierBlocks.length > 0) {
        this.context.stderr.write(
          `Kept the earlier nullability probe record for ${written.keptEarlierBlocks.join(', ')}: this probe read no items there.\n`
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.context.stderr.write(`Failed to write manifest: ${msg}\n`)
      return 1
    }
    return 0
  }

  private printNullabilityReport(report: NullabilityReport): void {
    const out = this.context.stdout
    out.write(
      `\nNullability of ${report.appName} ${report.appVersion} (${report.bundleId}) on macOS ${report.osVersion}\n`
    )
    out.write('='.repeat(56) + '\n\n')
    for (const resource of report.resources) {
      const reach =
        resource.status === 'probed'
          ? `${String(resource.itemsRead)} items read${parentsText(resource)}`
          : STATUS_TEXT[resource.status]
      const read = resource.status === 'probed'
      const truncated = read && resource.truncated ? ', stopped early (time limit)' : ''
      out.write(`${resource.resource}  (${resource.accessPath}) — ${reach}${truncated}\n`)
      // A resource that yielded no items has no verdicts to show; the JSON
      // report still lists its properties, as not read.
      if (read) {
        const width = Math.max(
          0,
          ...resource.properties.map((p) => p.property.length),
          ...resource.skipped.map((p) => p.property.length)
        )
        for (const p of resource.properties) {
          const defect =
            resource.identifierDefect?.property === p.property
              ? '  [manifest defect: identifier not always present]'
              : ''
          out.write(`  ${p.property.padEnd(width)}  ${propertyLine(p)}${defect}\n`)
        }
        for (const p of resource.skipped) {
          out.write(`  ${p.property.padEnd(width)}  skipped (${SKIP_TEXT[p.reason]})\n`)
        }
      }
      // The status line already says the budget was spent.
      if (resource.note !== undefined && resource.status !== 'budget') {
        out.write(`  note: ${resource.note}\n`)
      }
      out.write('\n')
    }
    const contradictions = report.resources.flatMap((r) =>
      r.properties
        .filter((p) => p.contradicted !== undefined)
        .map(
          (p) => `${r.resource}.${p.property} (${String(p.contradicted)} non-null claim replaced)`
        )
    )
    if (contradictions.length > 0) {
      out.write(`Contradictions: ${contradictions.join(', ')}\n`)
    }
    const defects = report.resources.flatMap((r) =>
      r.identifierDefect === undefined
        ? []
        : [
            `${r.resource}.${r.identifierDefect.property} (${identifierDefectText(r.identifierDefect)})`,
          ]
    )
    if (defects.length > 0) {
      out.write(
        `Manifest defects: the primary identifier is not always present for ${defects.join(', ')}; choose a different identifier.\n`
      )
    }
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

// ---------------------------------------------------------------------------
// Nullability report
// ---------------------------------------------------------------------------

/** One property in the nullability report: counts and the decision, never a value. */
interface NullabilityReportProperty {
  readonly property: string
  readonly reads: number
  readonly nulls: number
  readonly failures: number
  readonly observation: PropertyMergeOutcome['observation']
  readonly change: PropertyMergeOutcome['change']
  readonly contradicted?: string
}

/** One resource in the nullability report. */
interface NullabilityReportResource {
  readonly resource: string
  readonly accessPath: string
  readonly status: AppNullabilityResult['resources'][string]['status']
  readonly itemsRead: number
  /** How many collections the items came from (the parents of a nested resource). */
  readonly sampledParents: number
  readonly truncated: boolean
  readonly properties: readonly NullabilityReportProperty[]
  readonly skipped: readonly { readonly property: string; readonly reason: SkipReason }[]
  /** The primary identifier was not present in every item read: a manifest defect. */
  readonly identifierDefect?: IdentifierDefect
  readonly note?: string
}

/** What `--nullability` prints (and emits with `--json`). */
interface NullabilityReport {
  readonly bundleId: string
  readonly appName: string
  readonly appVersion: string
  readonly osVersion: string
  readonly observedAt: string
  readonly resources: readonly NullabilityReportResource[]
}

/** Combine the observations and the merge decisions into the report. */
function nullabilityReport(
  observed: AppNullabilityResult,
  merged: NullabilityMergeResult
): NullabilityReport {
  const decisions = new Map(merged.resources.map((r) => [r.resource, r]))
  return {
    bundleId: observed.bundleId,
    appName: observed.appName,
    appVersion: observed.appVersion,
    osVersion: observed.osVersion,
    observedAt: observed.observedAt,
    resources: Object.values(observed.resources).map((resource) => {
      const decision = decisions.get(resource.resource)
      // The block's note also explains a sample the time limit cut short.
      const note = decision?.block.note ?? resource.note
      return {
        resource: resource.resource,
        accessPath: resource.accessPath,
        status: resource.status,
        itemsRead: resource.itemsRead,
        sampledParents: resource.sampledParents,
        truncated: resource.truncated,
        properties: (decision?.properties ?? []).map((outcome) => ({
          property: outcome.property,
          reads: outcome.presence.reads,
          nulls: outcome.presence.nulls,
          failures: outcome.presence.failures,
          observation: outcome.observation,
          change: outcome.change,
          ...(outcome.contradicted === undefined ? {} : { contradicted: outcome.contradicted }),
        })),
        skipped: resource.skipped,
        ...(decision?.identifierDefect === undefined
          ? {}
          : { identifierDefect: decision.identifierDefect }),
        ...(note === undefined ? {} : { note }),
      }
    }),
  }
}

const STATUS_TEXT: Readonly<Record<NullabilityReportResource['status'], string>> = {
  probed: 'probed',
  'no-items': 'no items',
  unreachable: 'unreachable',
  budget: 'skipped (time budget spent)',
  error: 'error',
}

const SKIP_TEXT: Readonly<Record<SkipReason, string>> = {
  file: 'file or data',
  references: 'list of references',
  heavy: 'large content',
  excluded: '--skip-property',
}

/** ` from N parents`, for a nested resource (one read through a parent collection). */
function parentsText(resource: NullabilityReportResource): string {
  if (!resource.accessPath.includes('/')) return ''
  const parents = resource.sampledParents === 1 ? 'parent' : 'parents'
  return ` from ${String(resource.sampledParents)} ${parents}`
}

/** The counts behind an identifier defect, e.g. `empty 10, failed 0 of 25 items`. */
function identifierDefectText(defect: IdentifierDefect): string {
  if (!defect.probed) return 'not a declared property, so not read'
  return `empty ${String(defect.empty)}, failed ${String(defect.failed)} of ${String(defect.itemsRead)} items`
}

/** The report line for one property: its verdict and counts, never a value. */
function propertyLine(p: NullabilityReportProperty): string {
  const failed = p.failures > 0 ? `, ${String(p.failures)} reads failed` : ''
  switch (p.observation) {
    case 'nullable': {
      const contradiction =
        p.contradicted === undefined ? '' : `  [contradicts ${p.contradicted} non-null claim]`
      return `nullable             (${String(p.nulls)} of ${String(p.reads)} empty${failed})${contradiction}`
    }
    case 'non-null':
      return `non-null             (0 of ${String(p.reads)} empty${failed})`
    case 'insufficient-sample':
      return `insufficient sample  (0 of ${String(p.reads)} empty${failed})`
    case 'read-failed':
      return `read failed          (${String(p.failures)} reads failed)`
    case 'not-read':
      return 'not read'
  }
}

/**
 * Parse an optional whole-number flag of at least `minimum`. Returns the
 * number, or `undefined` when absent, or an error message.
 */
function parseCount(
  value: string | undefined,
  flag: string,
  minimum = 0
): number | undefined | string {
  if (value === undefined) return undefined
  if (!/^\d+$/.test(value)) return `${flag} must be a whole number, got "${value}".`
  const count = Number(value)
  if (count < minimum) return `${flag} must be at least ${String(minimum)}, got ${value}.`
  return count
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

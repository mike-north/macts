/**
 * Runtime identifier probe for macts manifests.
 *
 * The sdef-declared identifier for a resource (e.g. `calendarIdentifier`) may
 * throw "AppleEvent handler failed" at runtime because the Apple dictionary
 * exposes it but the JXA bridge does not actually honour it.  This module
 * probes each resource by:
 *
 * 1. Reading the FIRST item of the resource's collection via JXA.
 * 2. Attempting each declared identifier property in turn, plus common
 *    fallbacks (`name`, `id`), recording which returns a value versus throws.
 * 3. Returning a {@link ResourceProbeResult} per resource, with the first
 *    working property recorded as `runtimeIdentifier`.
 *
 * The JXA-execution layer is **injectable** so this module can be unit-tested
 * without real apps or TCC permission grants.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../manifest/schemas/app.js'
import type { RuntimeProbe } from '../manifest/schemas/resource.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Outcome of probing a single identifier candidate property.
 */
export interface IdentifierProbeResult {
  /** Property name that was probed */
  property: string
  /**
   * Whether reading this property returned a non-null, non-undefined value.
   * `false` means it threw or returned null/undefined.
   */
  succeeded: boolean
  /** Error message if the probe threw (absent when `succeeded` is `true`) */
  error?: string
}

/**
 * Full probe outcome for one resource.
 */
export interface ResourceProbeResult {
  /** Resource name (matches manifest key) */
  resource: string
  /**
   * The first property that returned a usable value, or `undefined` when no
   * candidate succeeded.
   */
  runtimeIdentifier: string | undefined
  /** Per-property probe details */
  candidates: IdentifierProbeResult[]
  /**
   * Structured status ready to be written back to the manifest's
   * `resource.probe` field.
   */
  probe: RuntimeProbe
}

/**
 * Result of probing an entire app manifest.
 */
export interface AppProbeResult {
  /** Bundle ID of the probed app */
  bundleId: string
  /** App name (human-readable) */
  appName: string
  /** Per-resource results, keyed by resource name */
  resources: Record<string, ResourceProbeResult>
  /** Timestamp of the probe run (ISO 8601) */
  probedAt: string
}

// ---------------------------------------------------------------------------
// Injectable executor type
// ---------------------------------------------------------------------------

/**
 * Minimal JXA executor interface accepted by the probe.
 *
 * The real implementation is `runWithApp` from `@macts/core/jxa/executor`.
 * Tests inject a fake that simulates property-level success or failure
 * without starting `osascript`.
 *
 * @param bundleId - The application's bundle identifier
 * @param jsBody - A JXA function body (string) to run inside the app
 * @returns The JSON-serialisable value returned by `jsBody`
 */
export type JxaRunner = (bundleId: string, jsBody: string) => Promise<unknown>

// ---------------------------------------------------------------------------
// Probe constants
// ---------------------------------------------------------------------------

/**
 * Property names to try in addition to the manifest-declared identifiers.
 * Ordered by how commonly they work across Apple apps.
 */
const COMMON_FALLBACK_PROPERTIES = ['name', 'id'] as const

// ---------------------------------------------------------------------------
// Core probe logic
// ---------------------------------------------------------------------------

/**
 * Probe a single property on the first item of a resource collection.
 *
 * @param runner - Injectable JXA executor
 * @param bundleId - App bundle ID
 * @param resourcePlural - Plural form of the resource (e.g. "calendars")
 * @param property - Property name to probe
 * @returns Probe outcome for this property
 */
async function probeProperty(
  runner: JxaRunner,
  bundleId: string,
  resourcePlural: string,
  property: string
): Promise<IdentifierProbeResult> {
  // Language: JXA.  We read app[plural]()[0][property]() or app[plural]()[0][property].
  // We try the function-call form first (most AppleScript properties are methods
  // in JXA), then the bare property form, and return the first truthy result.
  const jsBody = `
    var items = app.${resourcePlural}();
    if (!items || items.length === 0) { return null; }
    var first = items[0];
    var val;
    try { val = first.${property}(); } catch(_) {}
    if (val === undefined || val === null) {
      try { val = first.${property}; } catch(_) {}
    }
    if (val === undefined || val === null) { return null; }
    return String(val);
  `

  try {
    const result = await runner(bundleId, jsBody)
    const succeeded = result !== null && result !== undefined && result !== ''
    return { property, succeeded }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { property, succeeded: false, error: message }
  }
}

/**
 * Probe whether the resource's collection has any items.
 *
 * Returns `null` when we cannot determine (runner error); returns the count
 * (which may be 0) on success.
 */
async function probeCollectionLength(
  runner: JxaRunner,
  bundleId: string,
  resourcePlural: string
): Promise<number | null> {
  const jsBody = `
    try {
      var items = app.${resourcePlural}();
      return items ? items.length : 0;
    } catch(_) {
      return -1;
    }
  `
  try {
    const result = await runner(bundleId, jsBody)
    const n = typeof result === 'number' ? result : Number(result)
    return isNaN(n) || n < 0 ? null : n
  } catch {
    return null
  }
}

/**
 * Probe all identifier candidates for a single resource.
 */
async function probeResource(
  runner: JxaRunner,
  bundleId: string,
  resourceName: string,
  resourceDef: AppManifest['resources'][string],
  now: string
): Promise<ResourceProbeResult> {
  const resourcePlural = resourceDef.plural

  // Check if the collection is non-empty
  const length = await probeCollectionLength(runner, bundleId, resourcePlural)

  if (length === null) {
    // Could not read the collection at all
    return {
      resource: resourceName,
      runtimeIdentifier: undefined,
      candidates: [],
      probe: {
        status: 'error',
        probedAt: now,
        note: `Could not read ${resourcePlural}() collection`,
      },
    }
  }

  if (length === 0) {
    return {
      resource: resourceName,
      runtimeIdentifier: undefined,
      candidates: [],
      probe: {
        status: 'no-items',
        probedAt: now,
        note: `${resourcePlural}() collection is empty; cannot probe identifiers`,
      },
    }
  }

  // Build the ordered candidate list: declared identifiers first (primary first),
  // then common fallbacks that aren't already in the list.
  const declared = (resourceDef.identifiers ?? [])
    .slice()
    .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
    .map((id) => id.property)

  const seen = new Set<string>(declared)
  const candidates: string[] = [...declared]
  for (const fb of COMMON_FALLBACK_PROPERTIES) {
    if (!seen.has(fb)) {
      candidates.push(fb)
      seen.add(fb)
    }
  }

  // Probe each candidate
  const results: IdentifierProbeResult[] = await Promise.all(
    candidates.map((prop) => probeProperty(runner, bundleId, resourcePlural, prop))
  )

  const firstSuccess = results.find((r) => r.succeeded)

  if (!firstSuccess) {
    return {
      resource: resourceName,
      runtimeIdentifier: undefined,
      candidates: results,
      probe: {
        status: 'failed',
        probedAt: now,
        note: `All ${String(candidates.length)} identifier candidates failed`,
      },
    }
  }

  return {
    resource: resourceName,
    runtimeIdentifier: firstSuccess.property,
    candidates: results,
    probe: {
      status: 'probed',
      runtimeIdentifier: firstSuccess.property,
      probedAt: now,
    },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for {@link probeManifest}.
 */
export interface ProbeManifestOptions {
  /**
   * Names of resources to probe.  When absent or empty, all resources are
   * probed.
   */
  resources?: string[]
  /**
   * Override the probe timestamp (useful in tests).  Defaults to
   * `new Date().toISOString()`.
   */
  now?: string
}

/**
 * Probe all (or selected) resources in a manifest against the live app.
 *
 * @param manifest - The parsed app manifest
 * @param runner - Injectable JXA executor (use `runWithApp` from `@macts/core`)
 * @param options - Optional filtering and overrides
 * @returns Per-resource probe results plus a top-level summary
 */
export async function probeManifest(
  manifest: AppManifest,
  runner: JxaRunner,
  options: ProbeManifestOptions = {}
): Promise<AppProbeResult> {
  const now = options.now ?? new Date().toISOString()
  const { bundleId, name: appName } = manifest.app

  const resourceNames =
    options.resources && options.resources.length > 0
      ? options.resources.filter((r) => r in manifest.resources)
      : Object.keys(manifest.resources)

  const resourceResults = await Promise.all(
    resourceNames.flatMap((name) => {
      const resourceDef = manifest.resources[name]
      if (!resourceDef) return []
      return [probeResource(runner, bundleId, name, resourceDef, now)]
    })
  )

  const resultMap: Record<string, ResourceProbeResult> = {}
  for (const r of resourceResults) {
    resultMap[r.resource] = r
  }

  return {
    bundleId,
    appName,
    resources: resultMap,
    probedAt: now,
  }
}

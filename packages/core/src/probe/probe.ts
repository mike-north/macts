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
// JXA name helpers
// ---------------------------------------------------------------------------

/**
 * Convert a PascalCase or otherwise capitalised plural to lowerCamelCase so
 * it matches the JXA collection accessor.
 *
 * Manifest `plural` values come from the sdef and are PascalCase
 * (e.g. `Calendars`, `DisplayAlarms`).  JXA exposes collections in
 * lowerCamelCase (`calendars()`, `displayAlarms()`).  Without this
 * conversion every `app[plural]()` call returns undefined and the probe
 * silently reports `no-items` for every resource.
 */
function toLowerCamelCase(s: string): string {
  if (s.length === 0) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
// Core probe logic
// ---------------------------------------------------------------------------

/**
 * Probe a single property on the first item of a resource collection.
 *
 * Uses bracket notation with JSON-stringified names throughout so that:
 *  - Arbitrary property names (with spaces, hyphens, etc.) are safe.
 *  - There is no code-injection surface from manifest-supplied strings.
 *  - The runner receives a throw when a property access fails, which is
 *    captured as a per-candidate error (that's the whole detection mechanism).
 *
 * The JXA body reads `first[prop]`.  In JXA, AppleScript properties surface
 * as zero-argument functions, so we check `typeof val === 'function'` and
 * call it if so, then coerce to string.  We do NOT swallow exceptions here —
 * a throwing property causes the runner to reject, and the caller catches
 * that rejection and records it as `succeeded: false` with the error text.
 *
 * @param runner - Injectable JXA executor
 * @param bundleId - App bundle ID
 * @param collectionAccessor - lowerCamelCase accessor for the collection
 * @param property - Property name to probe
 * @returns Probe outcome for this property
 */
async function probeProperty(
  runner: JxaRunner,
  bundleId: string,
  collectionAccessor: string,
  property: string
): Promise<IdentifierProbeResult> {
  const safeCollection = JSON.stringify(collectionAccessor)
  const safeProp = JSON.stringify(property)

  // Build the JXA body using bracket notation only — no interpolation of
  // user-supplied strings into JS syntax positions.
  const jsBody = `
    var col = ${safeCollection};
    var prop = ${safeProp};
    var items = app[col]();
    if (!items || items.length === 0) { return null; }
    var first = items[0];
    var val = first[prop];
    // Invoke the bound JXA accessor directly via first[prop]() — re-binding it
    // with .call(first) breaks the specifier and throws -1700 "Can't convert types".
    if (typeof val === 'function') { val = first[prop](); }
    if (val === undefined || val === null) { return null; }
    return String(val);
  `

  // Let exceptions propagate — a throwing property access is exactly what we
  // want to detect.  The catch here records the runner's rejection as an error.
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
 * Uses bracket notation with a JSON-stringified accessor name.
 * Returns `null` when we cannot determine (runner error); returns the count
 * (which may be 0) on success.
 */
async function probeCollectionLength(
  runner: JxaRunner,
  bundleId: string,
  collectionAccessor: string
): Promise<number | null> {
  const safeCollection = JSON.stringify(collectionAccessor)
  const jsBody = `
    try {
      var col = ${safeCollection};
      var items = app[col]();
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
  // Manifest plural is PascalCase (e.g. "Calendars"); JXA accessors are
  // lowerCamelCase ("calendars").  Convert before building any JXA body.
  const collectionAccessor = toLowerCamelCase(resourceDef.plural)

  // Check if the collection is non-empty
  const length = await probeCollectionLength(runner, bundleId, collectionAccessor)

  if (length === null) {
    // Could not read the collection at all
    return {
      resource: resourceName,
      runtimeIdentifier: undefined,
      candidates: [],
      probe: {
        status: 'error',
        probedAt: now,
        note: `Could not read ${collectionAccessor}() collection`,
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
        note: `${collectionAccessor}() collection is empty; cannot probe identifiers`,
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
    candidates.map((prop) => probeProperty(runner, bundleId, collectionAccessor, prop))
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

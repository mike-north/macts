/**
 * Nullability probe: read-only observation of which properties a live app
 * leaves empty.
 *
 * For each resource, the probe reads every property of up to
 * {@link MAX_ITEMS_PER_COLLECTION} items and counts, per property, the reads
 * that succeeded, the successful reads that found no value (the app's
 * "missing value"), and the reads that threw. The counting happens inside the
 * automation process; only the counts come back. No observed value is ever
 * returned, logged, printed, or persisted.
 *
 * The sample is spread out, not the first items: within a collection the
 * probe reads evenly spaced indices, and a nested resource's items are drawn
 * from every parent collection (each calendar, list, or folder) with an equal
 * quota, so one large, uniform parent cannot stand for the whole app. The
 * selection is deterministic: the same app state yields the same items.
 *
 * The probe only reads. It never creates, changes, or deletes anything, and
 * never runs an app command, so it can show that a field is sometimes empty
 * but can never show that a field can be reset.
 *
 * Execution is injectable (a {@link JxaRunner} and a
 * {@link NullabilityProbeEnvironment}), so the probe is tested without real
 * apps or automation permission. What the observations mean for the manifest
 * is decided separately, by `mergeNullabilityObservations`.
 *
 * @packageDocumentation
 */

import { execFile } from 'node:child_process'
import { resolvePrimaryIdentifierProperty } from '../manifest/identifier.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { HierarchyChild } from '../manifest/schemas/hierarchy.js'
import type { PropertyType } from '../manifest/schemas/property.js'
import type { NullabilityProbeStatus, Resource } from '../manifest/schemas/resource.js'
import {
  createNameResolver,
  mapDeclaredType,
  type NameResolver,
} from '../generator/contract/value-mapping.js'
import type { JxaRunner } from './probe.js'
import { toLowerCamelCase } from './probe.js'

// ---------------------------------------------------------------------------
// Limits and skipped properties
// ---------------------------------------------------------------------------

/**
 * The most items the probe reads per resource. Enough items to establish a
 * non-null claim (`NON_NULL_SAMPLE_THRESHOLD`) with room to spare, while
 * bounding the time a probe spends in one collection.
 */
export const MAX_ITEMS_PER_COLLECTION = 60

/** The default time budget for probing one app: two minutes. */
export const DEFAULT_NULLABILITY_BUDGET_MS = 120_000

/**
 * The longest a single automation call may run. Each resource is probed in
 * one call, which stops reading new items at this limit (or when the budget
 * runs out, if sooner), so the call finishes within the automation runner's
 * default 30 second timeout.
 */
export const MAX_CALL_MS = 25_000

/**
 * Property names the probe never reads, because reading them loads large
 * content (a note body, a web page source, a terminal history, a build log,
 * image data) or can trigger a download (mail message source, iCloud-backed
 * bodies, artwork). Matched exactly against manifest property keys.
 *
 * Audited against the shipped manifests: `body` (Notes Note, Reminders
 * Reminder), `content` (Mail Message and Header, Microsoft Word), `contents`
 * (iTerm Session, Terminal Tab, Script Editor Document), `entireContents`
 * (Finder Container, recursive), `text` (TextEdit, Safari Tab, iTerm,
 * OmniGraffle, Xcode, System Events), `plaintext` (Notes), `plainText` and
 * `xmlText` (System Information), `source` (Mail Message, Safari Tab),
 * `html` (OmniPlan), `history` (Terminal Tab), `buildLog` (Xcode), `data` and
 * `rawData` (Music and TV Artwork), `image` (Contacts Person), `artwork`
 * (Spotify Track), `lyrics` (Music Track); plus `htmlContent`, a common name
 * for the same kind of content.
 */
export const HEAVY_PROPERTY_NAMES: readonly string[] = [
  'artwork',
  'body',
  'buildLog',
  'content',
  'contents',
  'data',
  'entireContents',
  'history',
  'html',
  'htmlContent',
  'image',
  'lyrics',
  'plainText',
  'plaintext',
  'rawData',
  'source',
  'text',
  'xmlText',
]

/**
 * Why the probe did not read a property:
 *
 * - `file`: a file or data property, whose read can load or download content.
 * - `references`: a list of references to app objects, whose read builds a
 *   reference to every object in the list (all of a folder's notes, say).
 *   A single reference is read: it is one cheap specifier.
 * - `heavy`: named in {@link HEAVY_PROPERTY_NAMES}.
 * - `excluded`: the caller asked to skip it.
 */
export type SkipReason = 'file' | 'references' | 'heavy' | 'excluded'

/** A property the probe did not read. */
export interface SkippedProperty {
  readonly property: string
  readonly reason: SkipReason
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/**
 * What the probe observed for one property, as counts only.
 *
 * Every item read contributes to exactly one of `reads` or `failures`; a read
 * that found no value counts in both `reads` and `nulls`.
 */
export interface PropertyPresence {
  /** Reads that succeeded, whether or not they found a value. */
  readonly reads: number
  /** Successful reads that found no value. */
  readonly nulls: number
  /** Reads that threw, which are not evidence of an empty value. */
  readonly failures: number
}

/** What the probe observed for one resource. */
export interface ResourceNullabilityResult {
  /** The resource's manifest key. */
  readonly resource: string
  /** How the probe reached the items: the chain of collections, e.g. `calendars/events`. */
  readonly accessPath: string
  /** The outcome. */
  readonly status: NullabilityProbeStatus
  /** How many items were read. */
  readonly itemsRead: number
  /**
   * How many collections the items were read from: the parents (calendars,
   * lists, folders) of a nested resource, or 1 for a top-level collection
   * that yielded an item.
   */
  readonly sampledParents: number
  /** Whether reading stopped early because the time ran out. */
  readonly truncated: boolean
  /** Per-property counts, for the properties that were read. */
  readonly presence: Readonly<Record<string, PropertyPresence>>
  /** The properties that were not read, and why. */
  readonly skipped: readonly SkippedProperty[]
  /** A short explanation of an `error` status. Never contains an observed value. */
  readonly note?: string
}

/** What a nullability probe of one app observed, with its provenance. */
export interface AppNullabilityResult {
  readonly bundleId: string
  readonly appName: string
  /** The app's version, as the app reports it. */
  readonly appVersion: string
  /** The macOS product version, e.g. `27.2`. */
  readonly osVersion: string
  /** When the probe ran (ISO 8601). */
  readonly observedAt: string
  /** Per-resource results, keyed by resource key, in probe order. */
  readonly resources: Readonly<Record<string, ResourceNullabilityResult>>
}

// ---------------------------------------------------------------------------
// Environment and options
// ---------------------------------------------------------------------------

/**
 * Everything the probe learns from outside the app, injectable so tests can
 * fake it.
 */
export interface NullabilityProbeEnvironment {
  /** The macOS product version, e.g. `27.2`. */
  osVersion(): Promise<string>
  /** The probe's timestamp (ISO 8601), recorded as `observedAt`. */
  observedAt(): string
  /** A monotonic clock in milliseconds, used only to enforce the budget. */
  clock(): number
}

/**
 * Read the macOS product version with `sw_vers -productVersion`, run directly
 * (no shell).
 */
export function readMacosVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/sw_vers', ['-productVersion'], { timeout: 10_000 }, (error, stdout) => {
      if (error) {
        reject(new Error(`Could not read the macOS version: ${error.message}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

/** The real environment: `sw_vers`, the wall clock, and a monotonic clock. */
export const DEFAULT_NULLABILITY_ENVIRONMENT: NullabilityProbeEnvironment = {
  osVersion: readMacosVersion,
  observedAt: () => new Date().toISOString(),
  clock: () => performance.now(),
}

/** Options for {@link probeNullability}. */
export interface ProbeNullabilityOptions {
  /** Resource keys to probe; all resources when absent or empty. */
  readonly resources?: readonly string[]
  /**
   * The most items to read per resource. Values above
   * {@link MAX_ITEMS_PER_COLLECTION} are capped at it.
   */
  readonly maxItems?: number
  /** The time budget for the whole app, in milliseconds. */
  readonly budgetMs?: number
  /** Additional property names not to read. */
  readonly skipProperties?: readonly string[]
  /** The environment; the real one by default. */
  readonly environment?: NullabilityProbeEnvironment
}

// ---------------------------------------------------------------------------
// Access paths
// ---------------------------------------------------------------------------

/** A hierarchy entry, with the chain of resource keys that leads to it. */
interface HierarchyStep {
  readonly chain: readonly string[]
  readonly child: HierarchyChild
}

/**
 * The shortest chain of resource keys from the app to `resourceKey` in the
 * manifest's containment hierarchy, e.g. `['Calendar', 'Event']`. A resource
 * the hierarchy does not mention is read as a top-level collection, as the
 * identifier probe reads it.
 */
export function resolveAccessChain(manifest: AppManifest, resourceKey: string): string[] {
  let frontier: HierarchyStep[] = Object.values(manifest.hierarchy.children).map((child) => ({
    chain: [child.resource],
    child,
  }))
  const seen = new Set<string>()
  while (frontier.length > 0) {
    const found = frontier.find((node) => node.child.resource === resourceKey)
    if (found !== undefined) return [...found.chain]
    const next: HierarchyStep[] = []
    for (const node of frontier) {
      if (seen.has(node.child.resource)) continue
      seen.add(node.child.resource)
      for (const child of Object.values(node.child.children ?? {})) {
        next.push({ chain: [...node.chain, child.resource], child })
      }
    }
    frontier = next
  }
  return [resourceKey]
}

// ---------------------------------------------------------------------------
// The automation-process body
// ---------------------------------------------------------------------------

/** Identity tag marking embedded automation-process JavaScript for tooling. */
const js = String.raw

/**
 * The function body that probes one resource inside the automation process.
 *
 * Collection accessors and property names are embedded as JSON literals and
 * used only with bracket notation, so no manifest-supplied text becomes code.
 * Every collection along the way, top level or nested, is read through its
 * element specifier's `length` and by index, so only the items actually read
 * are ever referenced; a collection whose `length` throws or is not a number
 * is unreachable (at the top) or contributes no items (below a parent).
 *
 * Selection: the body first finds the non-empty parent collections at the
 * last level of the chain (reading only lengths), then gives each a quota of
 * `ceil(maxItems / parents)` items, read at evenly spaced indices
 * `floor(k * n / m)` (`m = min(n, quota)`), parent by parent until the cap.
 * With more parents than `maxItems`, evenly spaced parents are chosen, one
 * item each. A top-level resource is one parent: the app.
 * Each property read is wrapped in its own `try`/`catch`; the body returns only
 * the counts (and whether the collection was reachable), never a value.
 *
 * @param accessors - lowerCamelCase collection accessors from the app down to
 *   the resource, e.g. `["calendars", "events"]`.
 * @param properties - The property names to read.
 * @param maxItems - The most items to read.
 * @param timeLimitMs - Stop reading new items after this many milliseconds.
 */
export function nullabilityProbeBody(
  accessors: readonly string[],
  properties: readonly string[],
  maxItems: number,
  timeLimitMs: number
): string {
  return js`
    var accessors = ${JSON.stringify(accessors)};
    var props = ${JSON.stringify(properties)};
    var maxItems = ${JSON.stringify(maxItems)};
    var deadline = Date.now() + ${JSON.stringify(timeLimitMs)};
    var counts = {};
    for (var p = 0; p < props.length; p++) { counts[props[p]] = { reads: 0, nulls: 0, failures: 0 }; }
    var itemsRead = 0;
    var truncated = false;
    // A collection is read by index from its element specifier, never by
    // calling it: calling it builds a reference to every element first.
    function collection(container, accessor) {
      var col = container[accessor];
      if (col === null || col === undefined) { return null; }
      var n = col.length;
      if (typeof n !== 'number') { return null; }
      return { col: col, n: n };
    }
    function readItem(item) {
      for (var p = 0; p < props.length; p++) {
        var prop = props[p];
        try {
          var val = item[prop];
          // Invoke the accessor as item[prop]() — re-binding it breaks the reference.
          if (typeof val === 'function') { val = item[prop](); }
          if (val === null || val === undefined) { counts[prop].nulls++; }
          counts[prop].reads++;
        } catch (e) {
          counts[prop].failures++;
        }
      }
    }
    // (Arrays are filled by index: the body never calls .push, so a script
    // check for app commands stays simple.)
    // Up to quota indices spread evenly over 0..count-1: floor(k * count / m)
    // for k = 0..m-1, where m = min(count, quota). All of them when count <= quota.
    function spread(count, quota) {
      var m = count < quota ? count : quota;
      var picked = [];
      for (var k = 0; k < m; k++) { picked[k] = Math.floor((k * count) / m); }
      return picked;
    }
    // The non-empty collections at the last level of the chain: the parents
    // whose elements are the resource's items. Only lengths are read here.
    var leaves = [];
    function gather(found, depth) {
      if (depth === accessors.length - 1) {
        if (found.n > 0) { leaves[leaves.length] = found; }
        return true;
      }
      for (var i = 0; i < found.n; i++) {
        if (Date.now() >= deadline) { truncated = true; return false; }
        var children = null;
        try { children = collection(found.col[i], accessors[depth + 1]); } catch (e) { children = null; }
        if (children && !gather(children, depth + 1)) { return false; }
      }
      return true;
    }
    var sampledParents = 0;
    // Read each chosen parent's quota of evenly spaced items, in order, so no
    // single parent can fill the cap.
    function sample(parents) {
      var quota = parents.length === 0 ? 0 : Math.ceil(maxItems / parents.length);
      for (var c = 0; c < parents.length; c++) {
        var indices = spread(parents[c].n, quota);
        var readHere = 0;
        for (var j = 0; j < indices.length; j++) {
          if (itemsRead >= maxItems) { break; }
          if (Date.now() >= deadline) {
            truncated = true;
            if (readHere > 0) { sampledParents++; }
            return;
          }
          readItem(parents[c].col[indices[j]]);
          itemsRead++;
          readHere++;
        }
        if (readHere > 0) { sampledParents++; }
        if (itemsRead >= maxItems) { return; }
      }
    }
    var roots;
    try { roots = collection(app, accessors[0]); } catch (e) { roots = null; }
    if (roots === null) { return { reachable: false }; }
    gather(roots, 0);
    // More parents than the cap: spread over the parents too, one item each.
    var chosen = leaves;
    if (leaves.length > maxItems) {
      var picks = spread(leaves.length, maxItems);
      chosen = [];
      for (var q = 0; q < picks.length; q++) { chosen[q] = leaves[picks[q]]; }
    }
    sample(chosen);
    return {
      reachable: true,
      itemsRead: itemsRead,
      sampledParents: sampledParents,
      truncated: truncated,
      counts: counts
    };
  `
}

/** The function body that reads the app's version, as text. */
export const APP_VERSION_BODY = 'return String(app.version());'

// ---------------------------------------------------------------------------
// Parsing what the body returns
// ---------------------------------------------------------------------------

/** What one probe call reported, once validated. */
interface ReachedCollection {
  readonly reachable: true
  readonly itemsRead: number
  readonly sampledParents: number
  readonly truncated: boolean
  readonly presence: Record<string, PropertyPresence>
}

type ProbeCallResult = { readonly reachable: false } | ReachedCollection

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Validate what the body returned, keeping only counts for the requested
 * properties. Anything else is rejected, so nothing but counts can leave the
 * probe even if the app process returned more.
 */
function parseProbeCall(value: unknown, properties: readonly string[]): ProbeCallResult {
  if (!isRecord(value) || typeof value['reachable'] !== 'boolean') {
    throw new Error('The probe returned a malformed result.')
  }
  if (!value['reachable']) return { reachable: false }
  const counts = value['counts']
  if (
    !isCount(value['itemsRead']) ||
    !isCount(value['sampledParents']) ||
    typeof value['truncated'] !== 'boolean' ||
    !isRecord(counts)
  ) {
    throw new Error('The probe returned a malformed result.')
  }
  const presence: Record<string, PropertyPresence> = {}
  for (const property of properties) {
    const entry = counts[property]
    if (
      !isRecord(entry) ||
      !isCount(entry['reads']) ||
      !isCount(entry['nulls']) ||
      !isCount(entry['failures'])
    ) {
      throw new Error('The probe returned a malformed result.')
    }
    presence[property] = {
      reads: entry['reads'],
      nulls: entry['nulls'],
      failures: entry['failures'],
    }
  }
  return {
    reachable: true,
    itemsRead: value['itemsRead'],
    sampledParents: value['sampledParents'],
    truncated: value['truncated'],
    presence,
  }
}

// ---------------------------------------------------------------------------
// Probing
// ---------------------------------------------------------------------------

/** Whether a property type is a file or data value, or a list of them. */
function isFileLike(type: PropertyType | undefined): boolean {
  if (type === 'file' || type === 'data') return true
  return typeof type === 'object' && 'array' in type && isFileLike(type.array)
}

/**
 * Whether a property type is a list of references to app objects: an array
 * (possibly nested) whose item maps to a resource reference, by the same name
 * resolution the contract generator uses.
 */
function isReferenceList(type: PropertyType | undefined, names: NameResolver): boolean {
  if (type === undefined) return false
  const { shape } = mapDeclaredType(type, 'output', names)
  if (shape.kind !== 'array') return false
  let item = shape.item
  while (item.kind === 'array') item = item.item
  return item.kind === 'reference'
}

/**
 * Split a resource's properties into those to read and those to skip. The
 * primary identifier property is always read.
 *
 * @param manifest - The manifest the resource belongs to, used to resolve
 *   type names to resources.
 */
export function selectProbedProperties(
  manifest: AppManifest,
  resource: Resource,
  skipProperties: readonly string[]
): { read: string[]; skipped: SkippedProperty[] } {
  const read: string[] = []
  const skipped: SkippedProperty[] = []
  const excluded = new Set(skipProperties)
  const heavy = new Set(HEAVY_PROPERTY_NAMES)
  const names = createNameResolver(manifest)
  const identifier = resolvePrimaryIdentifierProperty(resource)
  for (const [property, definition] of Object.entries(resource.properties)) {
    // The primary identifier is always read, whatever its name or type and
    // even if the caller excluded it: an identifier is a short value, and
    // whether it is ever empty or unreadable is what shows the manifest's
    // identifier choice is wrong. A name on HEAVY_PROPERTY_NAMES (`text`,
    // say) does not make an identifier heavy.
    if (property === identifier) read.push(property)
    else if (isFileLike(definition.type)) skipped.push({ property, reason: 'file' })
    else if (isReferenceList(definition.type, names)) {
      skipped.push({ property, reason: 'references' })
    } else if (heavy.has(property)) skipped.push({ property, reason: 'heavy' })
    else if (excluded.has(property)) skipped.push({ property, reason: 'excluded' })
    else read.push(property)
  }
  return { read, skipped }
}

/** A short, value-free explanation of a failed automation call. */
function failureNote(error: unknown): string {
  const killed =
    typeof error === 'object' && error !== null && Reflect.get(error, 'killed') === true
  return killed ? 'The probe of this resource timed out.' : 'The probe of this resource failed.'
}

/**
 * Probe which properties of a live app's resources are sometimes empty.
 *
 * Resources are probed one at a time, in manifest order (or the order of
 * `options.resources`), each in a single automation call. Once the budget is
 * spent, the remaining resources are reported with status `budget` and are
 * not read. A resource the probe cannot reach, or whose call fails, is
 * reported and the probe moves on; neither is fatal.
 *
 * @param manifest - The parsed app manifest.
 * @param runner - Runs a function body inside the app's automation process.
 * @param options - Selection, limits, and the environment.
 */
export async function probeNullability(
  manifest: AppManifest,
  runner: JxaRunner,
  options: ProbeNullabilityOptions = {}
): Promise<AppNullabilityResult> {
  const environment = options.environment ?? DEFAULT_NULLABILITY_ENVIRONMENT
  const maxItems = Math.max(
    0,
    Math.min(options.maxItems ?? MAX_ITEMS_PER_COLLECTION, MAX_ITEMS_PER_COLLECTION)
  )
  const budgetMs = options.budgetMs ?? DEFAULT_NULLABILITY_BUDGET_MS
  const skipProperties = options.skipProperties ?? []
  const { bundleId, name: appName } = manifest.app
  const start = environment.clock()
  const observedAt = environment.observedAt()
  const osVersion = await environment.osVersion()
  // Every observation is recorded against the app version, so without one
  // there is nothing to record.
  let version: unknown
  try {
    version = await runner(bundleId, APP_VERSION_BODY)
  } catch {
    version = undefined
  }
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(
      `Could not read the version of ${appName}. Check that it is installed and that automation is allowed.`
    )
  }
  const appVersion = version

  const requested =
    options.resources !== undefined && options.resources.length > 0
      ? options.resources.filter((key) => Object.hasOwn(manifest.resources, key))
      : Object.keys(manifest.resources)

  const resources: Record<string, ResourceNullabilityResult> = {}
  for (const resourceKey of requested) {
    const resource = manifest.resources[resourceKey]
    if (resource === undefined) continue
    const chain = resolveAccessChain(manifest, resourceKey)
    const accessors = chain.map((key) =>
      toLowerCamelCase(manifest.resources[key]?.plural ?? `${key}s`)
    )
    const accessPath = accessors.join('/')
    const { read, skipped } = selectProbedProperties(manifest, resource, skipProperties)
    const base = {
      resource: resourceKey,
      accessPath,
      skipped,
      presence: {},
      itemsRead: 0,
      sampledParents: 0,
      truncated: false,
    }

    const remaining = budgetMs - (environment.clock() - start)
    if (remaining <= 0) {
      resources[resourceKey] = { ...base, status: 'budget' }
      continue
    }
    if (chain.some((key) => manifest.resources[key] === undefined)) {
      resources[resourceKey] = { ...base, status: 'unreachable' }
      continue
    }

    let call: ProbeCallResult
    try {
      const body = nullabilityProbeBody(accessors, read, maxItems, Math.min(remaining, MAX_CALL_MS))
      call = parseProbeCall(await runner(bundleId, body), read)
    } catch (error) {
      resources[resourceKey] = { ...base, status: 'error', note: failureNote(error) }
      continue
    }
    if (!call.reachable) {
      resources[resourceKey] = { ...base, status: 'unreachable' }
      continue
    }
    resources[resourceKey] = {
      ...base,
      status: call.itemsRead > 0 ? 'probed' : call.truncated ? 'budget' : 'no-items',
      itemsRead: call.itemsRead,
      sampledParents: call.sampledParents,
      truncated: call.truncated,
      presence: call.presence,
    }
  }

  return { bundleId, appName, appVersion, osVersion, observedAt, resources }
}

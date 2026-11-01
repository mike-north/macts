/**
 * Nullability probe: read-only observation of which properties a live app
 * leaves empty.
 *
 * For each resource, the probe reads every property of up to
 * {@link MAX_ITEMS_PER_COLLECTION} items and counts, per property, the reads
 * that succeeded, the successful reads that found no value (the app's
 * "missing value"), and the reads that threw, and counts the values it found
 * by kind (`date`, `string`, … from the closed set in `../manifest/value-kinds.ts`).
 * The counting happens inside the automation process; only the counts and
 * kind labels come back. No observed value is ever returned, logged, printed,
 * or persisted.
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
  defaultCollectionAccessor,
  resolveCollectionAccessor,
  resolvePropertyAccessor,
} from '../manifest/native-accessor.js'
import { isResourceUnsupported, isUnsupportedProperty } from '../manifest/unsupported.js'
import {
  VALUE_KINDS,
  isValueKind,
  type ValueKind,
  type ValueKindCounts,
} from '../manifest/value-kinds.js'
import {
  createNameResolver,
  mapDeclaredType,
  type NameResolver,
} from '../generator/contract/value-mapping.js'
import type { JxaRunner } from './probe.js'

// ---------------------------------------------------------------------------
// Limits and skipped properties
// ---------------------------------------------------------------------------

/**
 * The most items the probe reads per resource. Enough items to establish a
 * non-null claim (`NON_NULL_SAMPLE_THRESHOLD`) with room to spare, while
 * bounding the time a probe spends in one collection.
 */
export const MAX_ITEMS_PER_COLLECTION = 60

/**
 * How many parents the probe first visits in each intermediate collection of
 * a nested resource (the calendars of an app, the events of a calendar),
 * chosen at evenly spaced indices. Twenty parents with a quota of at least
 * three items each fill {@link MAX_ITEMS_PER_COLLECTION}. When the parents
 * visited hold too few items, the probe visits further evenly spaced parents
 * in rounds, doubling the count each round.
 *
 * @internal A tuning constant of the probe, not for use outside this package.
 */
export const PARENT_SPREAD = 20

/**
 * The most collections below the top level whose length the probe reads
 * while looking for a nested resource's items, in one call. It bounds the
 * pre-scan of a deep chain whose items are sparse (alarms on a few events of
 * many calendars), where every parent visited costs an app round trip.
 *
 * @internal A tuning constant of the probe, not for use outside this package.
 */
export const MAX_PARENT_VISITS = 1_000

/**
 * The share of a call's time limit the pre-scan of a nested resource may
 * use, so the sample of the items found always has the rest.
 *
 * @internal A tuning constant of the probe, not for use outside this package.
 */
export const PARENT_SCAN_TIME_SHARE = 0.5

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
 * - `unsupported`: the manifest marks it unsupported, with evidence that the
 *   app cannot provide it, so reading it again would only fail.
 */
export type SkipReason = 'file' | 'references' | 'heavy' | 'excluded' | 'unsupported'

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
 * that found no value counts in both `reads` and `nulls`. Each read that
 * found a value counts once in `kinds`, so the kind counts sum to
 * `reads - nulls`.
 */
export interface PropertyPresence {
  /** Reads that succeeded, whether or not they found a value. */
  readonly reads: number
  /** Successful reads that found no value. */
  readonly nulls: number
  /** Reads that threw, which are not evidence of an empty value. */
  readonly failures: number
  /**
   * The values found, counted by kind label, e.g. `{ date: 25 }`. Absent when
   * no read found a value.
   */
  readonly kinds?: ValueKindCounts
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
  /**
   * How many parents the probe looked in for items: the parents whose child
   * collection's length it read, empty or not. 1 for a top-level collection.
   * For a nested resource this can be fewer than all the parents: see
   * `PARENT_SPREAD` and `MAX_PARENT_VISITS`.
   */
  readonly parentsScanned: number
  /**
   * Whether the sample of items stopped early because the time ran out. Only
   * the sample sets it: a pre-scan of a nested resource that ran out of time
   * shows as status `budget` when it found no item, or as a note when the
   * items it found were then read in full.
   */
  readonly truncated: boolean
  /** Per-property counts, for the properties that were read. */
  readonly presence: Readonly<Record<string, PropertyPresence>>
  /** The properties that were not read, and why. */
  readonly skipped: readonly SkippedProperty[]
  /**
   * A short explanation of an `error` status; of a `no-items` status whose
   * pre-scan stopped at `MAX_PARENT_VISITS` before it looked in every
   * parent; or of a `probed` status whose pre-scan stopped at the time limit,
   * so the items came from only the parents scanned. Never contains an
   * observed value.
   */
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
 * Selection, for a nested resource: a pre-scan first finds non-empty
 * collections at the last level of the chain, reading only lengths and never
 * every parent. In each intermediate collection of length `n` it visits the
 * parents at `floor(k * n / m)` for `m = min(n, PARENT_SPREAD)`; if the
 * collections found hold fewer than `maxItems` items, it visits the further
 * parents of `m = 2 * PARENT_SPREAD`, `4 * PARENT_SPREAD`, and so on. It
 * stops at `MAX_PARENT_VISITS` collections, or once
 * `PARENT_SCAN_TIME_SHARE` of the time limit is spent, and samples what
 * it found. The same app state always yields the same parents and items.
 * The sample gives each collection found a quota of `ceil(maxItems / parents)`
 * items, read at evenly spaced indices `floor(k * n / m)`
 * (`m = min(n, quota)`), parent by parent until the cap. With more parents
 * than `maxItems`, evenly spaced parents are chosen, one item each. A
 * top-level resource is one parent: the app.
 * Each property read is wrapped in its own `try`/`catch`; the body returns only
 * the counts, the kind label counts of the values found (see
 * `../manifest/value-kinds.ts`), and whether the collection was reachable, never a
 * value.
 *
 * @param accessors - The app's collection accessors from the app down to
 *   the resource, e.g. `["calendars", "events"]` (see
 *   `resolveCollectionAccessor`).
 * @param properties - The property names to read, as manifest keys; the counts
 *   are keyed by them.
 * @param maxItems - The most items to read.
 * @param timeLimitMs - Stop reading new items after this many milliseconds.
 *   The pre-scan stops after `PARENT_SCAN_TIME_SHARE` of it.
 * @param nativeNames - The app's name for each property whose name in the app
 *   differs from its key (see `resolvePropertyAccessor`); a property not listed
 *   is read by its key.
 */
export function nullabilityProbeBody(
  accessors: readonly string[],
  properties: readonly string[],
  maxItems: number,
  timeLimitMs: number,
  nativeNames: Readonly<Record<string, string>> = {}
): string {
  return js`
    var accessors = ${JSON.stringify(accessors)};
    var props = ${JSON.stringify(properties)};
    var names = ${JSON.stringify(nativeNames)};
    var maxItems = ${JSON.stringify(maxItems)};
    var spreadBase = ${JSON.stringify(PARENT_SPREAD)};
    var maxVisits = ${JSON.stringify(MAX_PARENT_VISITS)};
    var started = Date.now();
    var deadline = started + ${JSON.stringify(timeLimitMs)};
    // The pre-scan may use only part of the time, so the sample has the rest.
    var scanDeadline = started + ${JSON.stringify(Math.floor(timeLimitMs * PARENT_SCAN_TIME_SHARE))};
    var counts = {};
    for (var p = 0; p < props.length; p++) {
      counts[props[p]] = { reads: 0, nulls: 0, failures: 0, kinds: {} };
    }
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
    // The kind label of a non-null value: one of a closed set, never the
    // value. An object specifier is callable, so it is tested first and never
    // inspected further; a date is judged by its built-in tag, so a date from
    // another realm qualifies.
    function kindOf(val) {
      if (typeof val === 'function') { return 'reference'; }
      if (typeof val === 'number') { return 'number'; }
      if (typeof val === 'boolean') { return 'boolean'; }
      if (typeof val === 'string') { return 'string'; }
      if (typeof val !== 'object') { return 'other'; }
      if (Array.isArray(val)) { return 'list'; }
      var tag = Object.prototype.toString.call(val);
      if (tag === '[object Date]') { return 'date'; }
      if (tag === '[object Object]') {
        var proto = Object.getPrototypeOf(val);
        if (proto === null || Object.getPrototypeOf(proto) === null) { return 'record'; }
      }
      return 'other';
    }
    function readItem(item) {
      for (var p = 0; p < props.length; p++) {
        var prop = props[p];
        var name = Object.prototype.hasOwnProperty.call(names, prop) ? names[prop] : prop;
        try {
          var val = item[name];
          // Invoke the accessor as item[name]() — re-binding it breaks the reference.
          if (typeof val === 'function') { val = item[name](); }
          if (val === null || val === undefined) {
            counts[prop].nulls++;
          } else {
            var kind = kindOf(val);
            var kinds = counts[prop].kinds;
            kinds[kind] = (kinds[kind] || 0) + 1;
          }
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
    // The pre-scan: find non-empty leaf collections (the last level of the
    // chain) without enumerating every parent. Each intermediate collection of
    // length n is visited at evenly spaced indices floor(k * n / m), in rounds
    // of m = spreadBase, 2 * spreadBase, 4 * spreadBase, ...; each round's
    // indices contain the previous round's, so a round visits only what is
    // new. Children found are kept, so no collection is visited twice. The
    // scan ends after a round once the leaves found hold maxItems items, once
    // every parent has been visited, at the visit limit, or at the scan
    // deadline; it keeps what it found.
    var leaves = [];
    var supply = 0;
    var visits = 0;
    var parentsScanned = 0;
    var scanLimited = false;
    var scanTimedOut = false;
    var more = false;
    var leafDepth = accessors.length - 1;
    // Whether index i is one of spread(count, m).
    function inSpread(i, count, m) {
      if (m >= count) { return true; }
      return Math.floor((Math.ceil((i * m) / count) * count) / m) === i;
    }
    // Whether the scan may visit one more collection.
    function mayVisit() {
      if (Date.now() >= scanDeadline) { scanTimedOut = true; return false; }
      if (visits >= maxVisits) { scanLimited = true; return false; }
      visits++;
      return true;
    }
    // One round below node (the collection at accessors[depth]): visit the
    // round's parents of node not visited before. old: whether the path to
    // node lies within the previous round (m = prev), so a parent there was
    // visited then. key: the indices from the top, ordering the leaves.
    function scan(node, depth, m, prev, old, key) {
      if (node.n > m) { more = true; }
      var picks = spread(node.n, m);
      for (var x = 0; x < picks.length; x++) {
        var i = picks[x];
        var seen = old && prev > 0 && inSpread(i, node.n, prev);
        var path = key.concat([i]);
        if (depth + 1 === leafDepth) {
          if (seen) { continue; }
          if (!mayVisit()) { return false; }
          parentsScanned++;
          var leaf = null;
          try { leaf = collection(node.col[i], accessors[leafDepth]); } catch (e) { leaf = null; }
          if (leaf && leaf.n > 0) {
            leaf.key = path;
            leaves[leaves.length] = leaf;
            supply += leaf.n;
          }
        } else {
          var kid = node.kids[i];
          if (kid === undefined) {
            if (!mayVisit()) { return false; }
            try { kid = collection(node.col[i], accessors[depth + 1]); } catch (e) { kid = null; }
            if (kid) { kid.kids = []; }
            node.kids[i] = kid;
          }
          if (kid && !scan(kid, depth + 1, m, prev, seen, path)) { return false; }
        }
      }
      return true;
    }
    // Leaves in index order, so spreading over them spreads over the parents.
    function byKey(a, b) {
      for (var d = 0; d < a.key.length; d++) {
        if (a.key[d] !== b.key[d]) { return a.key[d] - b.key[d]; }
      }
      return 0;
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
    if (leafDepth === 0) {
      // A top-level resource: the app is the one parent.
      parentsScanned = 1;
      if (roots.n > 0) { leaves[0] = roots; }
    } else {
      roots.kids = [];
      var m = spreadBase;
      var prev = 0;
      for (;;) {
        more = false;
        if (!scan(roots, 0, m, prev, true, [])) { break; }
        if (supply >= maxItems || !more) { break; }
        prev = m;
        m = m * 2;
      }
      leaves.sort(byKey);
    }
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
      parentsScanned: parentsScanned,
      scanLimited: scanLimited,
      scanTimedOut: scanTimedOut,
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
  readonly parentsScanned: number
  /** Whether the pre-scan stopped at its visit limit, not having looked in every parent. */
  readonly scanLimited: boolean
  /** Whether the pre-scan stopped at its deadline, not having looked in every parent. */
  readonly scanTimedOut: boolean
  /** Whether the sample stopped at the call's deadline. */
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
 * Validate a property's kind counts: a record whose every key is a
 * {@link VALUE_KINDS} label and every value a positive count, summing to the
 * values found. Returns them in label order, or `undefined` when there are
 * none; anything else is rejected, so no text but a label can leave the probe.
 */
function parseKinds(value: unknown, values: number): ValueKindCounts | undefined {
  if (!isRecord(value)) throw new Error('The probe returned a malformed result.')
  let total = 0
  for (const [label, count] of Object.entries(value)) {
    if (!isValueKind(label) || !isCount(count) || count === 0) {
      throw new Error('The probe returned a malformed result.')
    }
    total += count
  }
  if (total !== values) throw new Error('The probe returned a malformed result.')
  if (total === 0) return undefined
  const kinds: Partial<Record<ValueKind, number>> = {}
  for (const label of VALUE_KINDS) {
    const count = value[label]
    if (isCount(count)) kinds[label] = count
  }
  return kinds
}

/**
 * Validate what the body returned, keeping only counts and kind labels for
 * the requested properties. Anything else is rejected, so nothing but counts
 * and labels can leave the probe even if the app process returned more.
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
    !isCount(value['parentsScanned']) ||
    typeof value['scanLimited'] !== 'boolean' ||
    typeof value['scanTimedOut'] !== 'boolean' ||
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
      !isCount(entry['failures']) ||
      entry['nulls'] > entry['reads']
    ) {
      throw new Error('The probe returned a malformed result.')
    }
    const kinds = parseKinds(entry['kinds'], entry['reads'] - entry['nulls'])
    presence[property] = {
      reads: entry['reads'],
      nulls: entry['nulls'],
      failures: entry['failures'],
      ...(kinds === undefined ? {} : { kinds }),
    }
  }
  return {
    reachable: true,
    itemsRead: value['itemsRead'],
    sampledParents: value['sampledParents'],
    parentsScanned: value['parentsScanned'],
    scanLimited: value['scanLimited'],
    scanTimedOut: value['scanTimedOut'],
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
    else if (isUnsupportedProperty(definition)) {
      skipped.push({ property, reason: 'unsupported' })
    } else if (isFileLike(definition.type)) skipped.push({ property, reason: 'file' })
    else if (isReferenceList(definition.type, names)) {
      skipped.push({ property, reason: 'references' })
    } else if (heavy.has(property)) skipped.push({ property, reason: 'heavy' })
    else if (excluded.has(property)) skipped.push({ property, reason: 'excluded' })
    else read.push(property)
  }
  return { read, skipped }
}

/** The note on a resource with no items found by a scan that stopped at its limit. */
function scanLimitedNote(parentsScanned: number): string {
  const parents = parentsScanned === 1 ? 'parent' : 'parents'
  return `no items in the ${String(parentsScanned)} ${parents} scanned; the scan stops after ${String(MAX_PARENT_VISITS)} collections`
}

/** The note on a resource whose items came from a scan that stopped at the time limit. */
function scanTimedOutNote(parentsScanned: number): string {
  const parents = parentsScanned === 1 ? 'parent' : 'parents'
  return `the parent scan stopped at the time limit after ${String(parentsScanned)} ${parents}`
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
 * reported and the probe moves on; neither is fatal. A resource the manifest
 * marks unsupported is never probed, even when requested: the app has none.
 * Collections and properties are addressed by the app's names for them (see
 * `manifest/native-accessor.ts`), and reported under their manifest keys.
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
  const probed = requested.filter((key) => {
    const resource = manifest.resources[key]
    return resource !== undefined && !isResourceUnsupported(resource)
  })

  const resources: Record<string, ResourceNullabilityResult> = {}
  for (const resourceKey of probed) {
    const resource = manifest.resources[resourceKey]
    if (resource === undefined) continue
    const chain = resolveAccessChain(manifest, resourceKey)
    const accessors = chain.map((key) => {
      const link = manifest.resources[key]
      return link === undefined
        ? defaultCollectionAccessor(`${key}s`)
        : resolveCollectionAccessor(link)
    })
    const accessPath = accessors.join('/')
    const { read, skipped } = selectProbedProperties(manifest, resource, skipProperties)
    const base = {
      resource: resourceKey,
      accessPath,
      skipped,
      presence: {},
      itemsRead: 0,
      sampledParents: 0,
      parentsScanned: 0,
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
      const nativeNames: Record<string, string> = {}
      for (const key of read) {
        const name = resolvePropertyAccessor(key, resource.properties[key])
        if (name !== key) nativeNames[key] = name
      }
      const body = nullabilityProbeBody(
        accessors,
        read,
        maxItems,
        Math.min(remaining, MAX_CALL_MS),
        nativeNames
      )
      call = parseProbeCall(await runner(bundleId, body), read)
    } catch (error) {
      resources[resourceKey] = { ...base, status: 'error', note: failureNote(error) }
      continue
    }
    if (!call.reachable) {
      resources[resourceKey] = { ...base, status: 'unreachable' }
      continue
    }
    // No item, and the time ran out in the pre-scan or the sample: the
    // resource's emptiness is unknown, as when the budget left it unread.
    const status =
      call.itemsRead > 0 ? 'probed' : call.truncated || call.scanTimedOut ? 'budget' : 'no-items'
    resources[resourceKey] = {
      ...base,
      status,
      itemsRead: call.itemsRead,
      sampledParents: call.sampledParents,
      parentsScanned: call.parentsScanned,
      truncated: call.truncated,
      presence: call.presence,
      // "No items" from a scan that stopped short says only that the parents
      // it looked in were empty.
      ...(status === 'no-items' && call.scanLimited
        ? { note: scanLimitedNote(call.parentsScanned) }
        : {}),
      // Items from a scan the time cut short came from only the parents it
      // looked in. (With no item, the status says so; see scanExhaustedNote.)
      ...(status === 'probed' && call.scanTimedOut
        ? { note: scanTimedOutNote(call.parentsScanned) }
        : {}),
    }
  }

  return { bundleId, appName, appVersion, osVersion, observedAt, resources }
}

/**
 * Where a manifest's hierarchy places each resource: which resources hold its
 * items, and whether the application holds them directly.
 *
 * The hierarchy records the app's element containment as its scripting
 * dictionary declares it: an entry under the application is a collection the
 * application holds, and an entry under another entry is a collection each
 * item of that entry's resource holds. A resource may be placed more than
 * once, at the application and inside other resources alike.
 *
 * This is the one reading of that containment. The command-parent guard reads
 * it to find commands that address a collection the application does not
 * have, and the output reference rule reads it to find references whose
 * target can be found only within a container its `get` does not name.
 *
 * Only usable entries count: an entry whose resource is marked unsupported is
 * skipped together with everything nested under it (see
 * `usableHierarchyChildren`).
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { AppManifest } from './schemas/app.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import { usableHierarchyChildren } from './unsupported.js'

/** One usable entry of a hierarchy, at any depth, with the resource holding it. */
export interface PlacedEntry {
  /** The resource whose items hold the entry, or `undefined` at the application. */
  readonly holder: string | undefined
  /** The hierarchy entry itself. */
  readonly child: HierarchyChild
}

/**
 * Every usable entry of the manifest's hierarchy, at any depth, depth first
 * in declaration order, each with the resource that holds it.
 *
 * @param manifest - The app manifest.
 */
export function placedEntries(manifest: AppManifest): PlacedEntry[] {
  const entries: PlacedEntry[] = []
  const walk = (children: Record<string, HierarchyChild>, holder: string | undefined): void => {
    for (const [, child] of usableHierarchyChildren(manifest, children)) {
      entries.push({ holder, child })
      if (child.children !== undefined) walk(child.children, child.resource)
    }
  }
  walk(manifest.hierarchy.children, undefined)
  return entries
}

/**
 * Each manifest's nested-only resources, computed once per manifest object.
 * The output reference rule asks for them once per reference it judges, and
 * each answer would otherwise walk the whole hierarchy. Keying on the object
 * relies on a manifest not changing once it is loaded: nothing in macts edits
 * a manifest's hierarchy, resources or their unsupported markers after
 * parsing, so the answer for one object never goes stale. A manifest built by
 * editing another is a new object, with its own entry; one edited in place
 * after its first query would keep the answer it had.
 */
const nestedOnlyCache = new WeakMap<AppManifest, ReadonlySet<string>>()

/**
 * The resources the hierarchy nests under another resource and does not also
 * place at the application: their items exist only inside a container. A
 * resource the hierarchy places nowhere is not among them, since the
 * hierarchy says nothing about where its items live. The set is computed
 * once per manifest object (see {@link nestedOnlyCache}).
 *
 * @param manifest - The app manifest.
 */
export function nestedOnlyResources(manifest: AppManifest): ReadonlySet<string> {
  const cached = nestedOnlyCache.get(manifest)
  if (cached !== undefined) return cached
  const entries = placedEntries(manifest)
  const topLevel = new Set(
    entries.filter((entry) => entry.holder === undefined).map((entry) => entry.child.resource)
  )
  const nested: ReadonlySet<string> = new Set(
    entries
      .filter((entry) => entry.holder !== undefined && !topLevel.has(entry.child.resource))
      .map((entry) => entry.child.resource)
  )
  nestedOnlyCache.set(manifest, nested)
  return nested
}

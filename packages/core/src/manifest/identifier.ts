/**
 * Canonical resource-identifier derivation.
 *
 * A resource's identifier is the value that sibling operations require: `get`
 * and `delete` take it as their lookup key, and write commands that reference a
 * parent resource (e.g. `events.create` needing the calendar's id) accept it as
 * a parameter. The natural way for an agent to obtain that value is to `list`
 * the resource — so the list output MUST surface the identifier, and under a
 * name the consumer can rely on.
 *
 * This module is the single source of truth for *which* property is a
 * resource's identifier (derived from the manifest's `identifiers` array) and
 * for the *canonical name* under which every surface exposes it. Keeping the
 * derivation in one place prevents the list output and the write/get/delete
 * input from drifting apart (the `calendarIdentifier` vs `calendarId`
 * regression these helpers guard against).
 *
 * @packageDocumentation
 */

import type { IdentifierTargeting, Resource } from './schemas/resource.js'
import { resolvePrimaryIdentifier } from './primary-identifier.js'
import { hasUsableProperty, usableProperties } from './unsupported.js'

/**
 * The canonical key under which every generated surface exposes a resource's
 * primary identifier.
 *
 * App manifests declare the identifier under an app-specific property name
 * (e.g. `calendarIdentifier`, `uid`, `name`), and sibling write operations may
 * reference it under yet another name (e.g. `calendarId`). Rather than force
 * consumers to know each app's property name, list output additionally exposes
 * the identifier value under this single, stable alias. A consumer that has a
 * list item can always read `item[CANONICAL_IDENTIFIER_KEY]` and pass it to the
 * route that needs it.
 */
export const CANONICAL_IDENTIFIER_KEY = 'id'

/**
 * Resolve the manifest-declared primary identifier property name for a resource.
 *
 * The identifier is taken from the resource's `identifiers` array: the entry
 * flagged `primary` wins; otherwise the first declared entry is used. Returns
 * `undefined` when the resource declares no identifiers — callers MUST handle
 * this (a resource with no manifest identifier cannot be addressed by id, so
 * list output simply omits the canonical alias rather than inventing one).
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The identifier property name, or `undefined` if none is declared.
 */
export function resolvePrimaryIdentifierProperty(
  resource: Resource | undefined
): string | undefined {
  return resolvePrimaryIdentifier(resource)?.property
}

/**
 * How the runtime layer must target a resource by its primary identifier.
 *
 * @public
 */
export interface IdentifierTargetingResolution {
  /**
   * The targeting strategy: `byId` emits a JXA `byId(value)` lookup; `byProperty`
   * emits a `whose({ <property>: value })[0]` lookup; `byKey` emits the
   * collection's key specifier applied to the value.
   */
  strategy: IdentifierTargeting
  /**
   * The runtime property to read for list output and to match against for a
   * `byProperty` lookup. For `byId` and `byKey` this is the identifier
   * property; for `byProperty` it is `runtimeProperty` when set, else the
   * identifier property.
   *
   * This is the value-carrying property — NOT the request parameter name. The
   * request parameter (e.g. `id`, `calendarId`) is a separate schema-contract
   * concern resolved from the command's parameters.
   */
  property: string
}

/**
 * Resolve how the runtime layer must target a resource by its primary identifier.
 *
 * The structured layer addresses a resource through its primary identifier, but
 * a dictionary-declared identifier is not always runtime-valid via JXA. This
 * resolution captures BOTH which property carries the identifier value AND how
 * the runtime must use it:
 *
 * - `byId` (default): `app.<plural>.byId(value)` — the dictionary id specifier
 *   works at runtime.
 * - `byProperty`: `app.<plural>.whose({ <property>: value })[0]` — the declared
 *   identifier throws at runtime (e.g. Calendar's `calendarIdentifier()`), so the
 *   resource is matched on a property that works (e.g. `name`).
 * - `byKey`: the collection's key specifier applied to the identifier value,
 *   which the app interprets (an app that keys files by path finds whatever
 *   file is at that path).
 * - `byRoot`: a singleton root's kind, which names the application property
 *   holding its object (`../manifest/roots.ts`); normalisation gives every
 *   root this identifier, and no collection is involved.
 *
 * Returns `undefined` when the resource declares no identifiers — such a resource
 * cannot be addressed by identifier at all, and callers handle that explicitly.
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The targeting resolution, or `undefined` if no identifier is declared.
 */
export function resolveIdentifierTargeting(
  resource: Resource | undefined
): IdentifierTargetingResolution | undefined {
  const entry = resolvePrimaryIdentifier(resource)
  if (entry === undefined) {
    return undefined
  }
  // The schema leaves `targeting` optional to avoid widening the inferred type;
  // absent means the `byId` default.
  const strategy: IdentifierTargeting = entry.targeting ?? 'byId'
  // For byProperty, the JXA `whose` key may be an explicit runtimeProperty; for
  // byId and byKey, the runtime property IS the identifier property (the value
  // read in list, and the value the lookup takes).
  const property =
    strategy === 'byProperty' ? (entry.runtimeProperty ?? entry.property) : entry.property
  return { strategy, property }
}

/**
 * Resolve the property whose value a resource's records mirror under
 * {@link CANONICAL_IDENTIFIER_KEY}, or `undefined` when they carry no alias.
 *
 * The alias mirrors the runtime targeting property: the value sibling
 * operations accept as the lookup (for a `byProperty` resource its working
 * property, not the declared identifier). There is no alias when the resource
 * declares no identifier, or when it has a usable property literally named
 * `id`: that key is then a regular field with its own value and type, and an
 * alias would overwrite it (a Music track's numeric `id` with its persistent
 * ID). Every surface that writes or types the alias takes it from here, so the
 * records a list returns and the read types that describe them agree.
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The property to mirror under `id`, or `undefined` for no alias.
 */
export function resolveCanonicalIdentifierSource(
  resource: Resource | undefined
): string | undefined {
  if (resource === undefined || hasUsableProperty(resource, CANONICAL_IDENTIFIER_KEY)) {
    return undefined
  }
  return resolveIdentifierTargeting(resource)?.property
}

/**
 * Resolve the set of property names a `list` operation must read for a resource
 * so its output is usable by sibling operations.
 *
 * This is every usable property (declared and not marked unsupported, see
 * `usableProperties`) plus the primary-identifier property, which a manifest
 * may declare in `identifiers` without also listing it under `properties` and
 * which cannot be marked unsupported. Deriving the list here — rather than
 * reading `Object.keys(resource.properties)` directly — guarantees the
 * identifier is always present in list output even when it is not a regular
 * property, and that a property the app cannot provide is never read.
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The property names to read, with the identifier guaranteed present.
 *   Falls back to `['name']` for an undefined/empty resource so the executor
 *   still reads something addressable.
 */
export function resolveListOutputProperties(resource: Resource | undefined): string[] {
  const declared = resource === undefined ? [] : usableProperties(resource).map(([name]) => name)
  const idProperty = resolvePrimaryIdentifierProperty(resource)

  const names = new Set<string>(declared)
  if (idProperty !== undefined) {
    names.add(idProperty)
  }

  if (names.size === 0) {
    // No properties and no identifier declared: still read a conventional
    // `name` so the executor returns something rather than empty objects.
    return ['name']
  }

  return [...names]
}

/**
 * Whether a manifest list operation returns bounded pages, taking `pageSize`
 * and `cursor` inputs, rather than its whole collection as one page.
 *
 * This is the single paging-eligibility rule. The contract generator, the
 * generated SDK and CLI surfaces, the capability registry, the native list
 * body, and the runtime's contract registration check all ask it, so they
 * agree by construction.
 *
 * A list pages exactly when its command is the resource-scoped `list` and
 * both of these hold, each from curated manifest evidence:
 *
 * - The resource's primary identifier is claimed unique (`unique: true`).
 *   Each page is anchored on the identifier of the item just before it, and
 *   the anchor check can detect a shift of the collection only if no two
 *   items share that value; with adjacent duplicates a shift by one leaves
 *   the same value in place, and a page would silently skip or repeat an
 *   item. The claim is independent of how the identifier is targeted.
 * - The resource records that the running app reads a range of its
 *   collection (`rangeRead.supported: true`), as a live read-only
 *   observation showed. Every page is read as such a range, and an app that
 *   rejects it fails every page, so a list never pages on an untested
 *   collection.
 *
 * Anything less gives a list that reads its whole collection as one page: an
 * identifier with no claim or one claimed not unique, a resource with no
 * identifier, and a resource whose range read is unobserved or observed to
 * fail.
 *
 * @param command - The manifest command, by its scope and name.
 * @param resource - The resource the command lists, if any.
 * @returns `true` when the list operation pages.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D9 (Bounded list pages)
 */
export function listOperationPages(
  command: { readonly scope: string; readonly name: string },
  resource: Resource | undefined
): boolean {
  if (command.scope !== 'resource' || command.name !== 'list') return false
  return (
    resolvePrimaryIdentifier(resource)?.unique === true && resource?.rangeRead?.supported === true
  )
}

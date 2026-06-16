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

import type { Resource } from './schemas/resource.js'

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
  const identifiers = resource?.identifiers
  if (!identifiers || identifiers.length === 0) {
    return undefined
  }
  const primary = identifiers.find((entry) => entry.primary)
  const chosen = primary ?? identifiers[0]
  return chosen?.property
}

/**
 * Resolve the set of property names a `list` operation must read for a resource
 * so its output is usable by sibling operations.
 *
 * This is every declared property plus the primary-identifier property (which a
 * manifest may declare in `identifiers` without also listing it under
 * `properties`). Deriving the list here — rather than reading
 * `Object.keys(resource.properties)` directly — guarantees the identifier is
 * always present in list output even when it is not a regular property.
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The property names to read, with the identifier guaranteed present.
 *   Falls back to `['name']` for an undefined/empty resource so the executor
 *   still reads something addressable.
 */
export function resolveListOutputProperties(resource: Resource | undefined): string[] {
  const declared = resource?.properties ? Object.keys(resource.properties) : []
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

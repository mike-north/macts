/**
 * Which of a resource's declared identifiers is its primary one: the single
 * rule every identifier derivation (`./identifier.ts`) and the output
 * reference judgment (`./output-references.ts`) choose it by, so they never
 * read different entries.
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { Identifier, Resource } from './schemas/resource.js'

/**
 * Resolve the manifest-declared primary identifier entry for a resource.
 *
 * The entry flagged `primary` wins; otherwise the first declared entry is used.
 * Returns `undefined` when the resource declares no identifiers.
 *
 * @param resource - The resource definition from the manifest, or `undefined`.
 * @returns The primary identifier entry, or `undefined` if none is declared.
 */
export function resolvePrimaryIdentifier(resource: Resource | undefined): Identifier | undefined {
  const identifiers = resource?.identifiers
  if (!identifiers || identifiers.length === 0) {
    return undefined
  }
  const primary = identifiers.find((entry) => entry.primary)
  return primary ?? identifiers[0]
}

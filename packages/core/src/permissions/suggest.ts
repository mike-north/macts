/**
 * Recovery help for permission strings that are wrong, mis-cased or unknown.
 *
 * Permission matching is exact and case-sensitive, so a grant that differs from
 * a route's permission by a single letter's case authorizes nothing. This
 * module turns the set of permissions an app really defines into actionable
 * guidance: the closest valid permission(s), best first, so a caller (often an
 * agent) can correct the string in one step. It never changes what matches.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../manifest/schemas/index.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import { PERMISSION_FORMAT_DESCRIPTION } from './parser.js'

/** The most suggestions returned; more than a few stops being a suggestion. */
const MAX_SUGGESTIONS = 3

/**
 * The largest edit distance (over the case-folded string) at which a known
 * permission is still considered a plausible correction of the requested one.
 */
const MAX_EDIT_DISTANCE = 3

/** The app segment of a permission string: everything before the first `:`. */
function appSegment(permission: string): string {
  const index = permission.indexOf(':')
  return index === -1 ? permission : permission.slice(0, index)
}

/** Levenshtein distance between two strings. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      const deletion = (previous[j] ?? 0) + 1
      const insertion = (current[j - 1] ?? 0) + 1
      current.push(Math.min(substitution, deletion, insertion))
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

/**
 * The permissions an app's manifest defines, which are the ones worth granting
 * or suggesting: every route's permission, each resource wildcard
 * (`app:resource:*`) that covers them, and the app wildcard (`app:*:*`).
 *
 * @param manifest - The app manifest.
 * @returns Distinct permissions in route-declaration order, wildcards last.
 */
export function listKnownPermissions(manifest: AppManifest): string[] {
  const fine = resolveManifestRoutes(manifest).map((route) => route.permission)
  const resourceWildcards = new Set<string>()
  const appWildcards = new Set<string>()
  for (const permission of fine) {
    const [app, resource] = permission.split(':')
    if (app !== undefined && resource !== undefined) {
      resourceWildcards.add(`${app}:${resource}:*`)
      appWildcards.add(`${app}:*:*`)
    }
  }
  return [...new Set([...fine, ...resourceWildcards, ...appWildcards])]
}

/**
 * The known permission that equals `permission` once letter case is ignored,
 * but is not equal to it. Such a string is well-formed yet can never authorize
 * the permission it was meant to be.
 *
 * @param permission - The requested or granted permission.
 * @param known - The permissions the app defines.
 * @returns The correctly cased known permission, or `undefined` when
 *   `permission` is itself known or resembles no known one by case alone.
 */
export function findCaseOnlyMismatch(
  permission: string,
  known: readonly string[]
): string | undefined {
  if (known.includes(permission)) {
    return undefined
  }
  const folded = permission.toLowerCase()
  return known.find((candidate) => candidate.toLowerCase() === folded)
}

/**
 * The known permissions closest to a requested one, best first.
 *
 * Only permissions of the same app (compared case-insensitively) are
 * considered. A permission differing only in letter case ranks first;
 * otherwise candidates within a small edit distance follow, nearest first and
 * alphabetical among equals.
 *
 * @param requested - The permission string the caller supplied.
 * @param known - The permissions the app defines (see {@link listKnownPermissions}).
 * @returns Up to three suggestions; empty when nothing is close enough.
 */
export function suggestPermissions(requested: string, known: readonly string[]): string[] {
  const folded = requested.toLowerCase()
  const app = appSegment(folded)

  const ranked = [...new Set(known)]
    .filter((candidate) => candidate !== requested && appSegment(candidate) === app)
    .map((candidate) => {
      const candidateFolded = candidate.toLowerCase()
      return {
        candidate,
        caseOnly: candidateFolded === folded,
        distance: editDistance(folded, candidateFolded),
      }
    })
    .filter((entry) => entry.caseOnly || entry.distance <= MAX_EDIT_DISTANCE)
    .sort((a, b) => {
      if (a.caseOnly !== b.caseOnly) {
        return a.caseOnly ? -1 : 1
      }
      return a.distance - b.distance || a.candidate.localeCompare(b.candidate)
    })

  return ranked.slice(0, MAX_SUGGESTIONS).map((entry) => entry.candidate)
}

/**
 * An actionable explanation for a permission string that fails the grammar:
 * the format rule, plus the closest valid permission(s) when known.
 *
 * @param permission - The malformed permission string.
 * @param known - The permissions the app defines, when a manifest is available.
 * @returns A message stating the rule and, when possible, what was probably meant.
 */
export function explainInvalidPermission(
  permission: string,
  known: readonly string[] = []
): string {
  const suggestions = suggestPermissions(permission, known)
  if (suggestions.length === 0) {
    return PERMISSION_FORMAT_DESCRIPTION
  }
  const quoted = suggestions.map((s) => `"${s}"`).join(', ')
  return `${PERMISSION_FORMAT_DESCRIPTION}. Did you mean ${quoted}?`
}

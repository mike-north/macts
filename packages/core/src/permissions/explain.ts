/**
 * Human-readable permission-scope explainer.
 *
 * Given a set of granted permission patterns (the *scope* of an API key) and
 * an {@link AppManifest}, this module derives:
 *
 * - For each resource the manifest defines: the **granted** fine-grained
 *   operations (with their command descriptions) and the **not-granted**
 *   operations (the complement within that resource's available operations).
 * - A plain-text prose summary suitable for CLI output.
 *
 * All operation names and descriptions are sourced from the manifest — no
 * hard-coded app-specific or operation-specific prose appears in this module.
 *
 * Wildcard and coarse-operation expansion is delegated to the existing
 * {@link expandPermissions} function in `expander.ts`.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '../manifest/schemas/app.js'
import { expandPermissions, PermissionExpansionError } from './expander.js'
import { PermissionParseError } from './parser.js'

// ---------------------------------------------------------------------------
// Structured result types
// ---------------------------------------------------------------------------

/**
 * A single fine-grained operation, paired with the human-readable description
 * sourced from the manifest command that declared it.
 */
export interface ExplainedOperation {
  /** Fine-grained permission string, e.g. `calendar:events:list` */
  readonly permission: string
  /** Operation name segment, e.g. `list` */
  readonly operation: string
  /**
   * Human-readable description from the manifest command that declared this
   * permission, or `undefined` if no command carries the permission (meaning
   * the permission exists in the permissions-mapping section but no concrete
   * command declares it yet).
   */
  readonly description: string | undefined
}

/**
 * Explanation for a single resource within an app.
 */
export interface ResourceExplanation {
  /** Resource name as declared in the permissions mapping, e.g. `events` */
  readonly resource: string
  /** Operations that the scope grants on this resource. */
  readonly granted: readonly ExplainedOperation[]
  /**
   * Operations available on this resource (per the manifest) that the scope
   * does NOT grant.
   */
  readonly notGranted: readonly ExplainedOperation[]
}

/**
 * Full structured explanation for an entire scope against a manifest.
 */
export interface ScopeExplanation {
  /** App name as declared in `manifest.app.name` */
  readonly app: string
  /** Per-resource breakdowns, sorted by resource name. */
  readonly resources: readonly ResourceExplanation[]
  /**
   * `true` when the scope grants nothing at all (e.g. an empty scope, or a
   * scope whose patterns don't resolve to any permissions in this manifest).
   */
  readonly grantsNothing: boolean
}

// ---------------------------------------------------------------------------
// Core explainer logic
// ---------------------------------------------------------------------------

/**
 * Build an index from fine-grained permission string → command description
 * by scanning `manifest.commands`.  Only commands that carry a `permission`
 * field are indexed.
 */
function buildPermissionDescriptions(manifest: AppManifest): Map<string, string> {
  const map = new Map<string, string>()
  for (const command of Object.values(manifest.commands)) {
    if (command.permission !== undefined && command.permission !== '') {
      map.set(command.permission, command.description)
    }
  }
  return map
}

/**
 * Collect every fine-grained permission declared in `manifest.permissions`,
 * grouped by resource name.
 *
 * The permissions mapping section has structure:
 * ```
 * resource → coarseOp → fine-permission[]
 * ```
 * We flatten the coarse groupings to get all fine-grained permissions per
 * resource, preserving the order they appear in the manifest.
 */
function allFinePermissionsByResource(manifest: AppManifest): Map<string, string[]> {
  const result = new Map<string, string[]>()
  if (!manifest.permissions) {
    return result
  }
  for (const [resource, coarseMapping] of Object.entries(manifest.permissions)) {
    const seen = new Set<string>()
    const perms: string[] = []
    for (const finePerms of Object.values(coarseMapping)) {
      for (const p of finePerms) {
        if (!seen.has(p)) {
          seen.add(p)
          perms.push(p)
        }
      }
    }
    result.set(resource, perms)
  }
  return result
}

/**
 * Explain what a scope grants (and does not grant) against a single app
 * manifest.
 *
 * **Wildcard and coarse-operation handling**: The `scope` may contain wildcard
 * patterns (`calendar:events:*`, `calendar:*:*`) or coarse-operation aliases
 * (`calendar:events:read`).  These are fully expanded to concrete fine-grained
 * permissions before the grant/not-grant computation — so a `*` grant
 * correctly enumerates the concrete operations it covers.
 *
 * **Scope patterns for a different app**: Only permissions whose `app` segment
 * matches `manifest.app.name` (case-insensitive) are considered.  Patterns
 * referencing other apps are silently filtered out (the caller should invoke
 * this function once per manifest).
 *
 * @param scope - The granted permission patterns (may be fine, coarse, or
 *   wildcard; may reference multiple apps).
 * @param manifest - The app manifest to explain against.
 * @returns Structured explanation.
 */
export function explainScope(scope: readonly string[], manifest: AppManifest): ScopeExplanation {
  const appName = manifest.app.name.toLowerCase()

  // Filter the scope to patterns relevant to this manifest's app.
  //
  // We extract the app segment by splitting on ':' rather than calling
  // parsePermission so that patterns containing camelCase operation names
  // (e.g. `calendar:app:switchView`) are not silently dropped by the
  // all-lowercase parser regex.
  //
  // App matching is case-insensitive: both sides are lowercased so a scope
  // written as `Calendar:events:list` matches a manifest whose `app.name` is
  // `calendar` (and vice versa). `appName` is already lowercased above.
  const appScope = scope.filter((pattern) => {
    const colonIdx = pattern.indexOf(':')
    const app = colonIdx >= 0 ? pattern.slice(0, colonIdx) : pattern
    return app.toLowerCase() === appName
  })

  // Build the set of all fine-grained permission strings declared in the
  // permissions section. This is used as a fast-path fallback below.
  const permissionsSection = manifest.permissions ?? {}
  const allDeclaredFine = new Set<string>()
  for (const coarseMapping of Object.values(permissionsSection)) {
    for (const finePerms of Object.values(coarseMapping)) {
      for (const p of finePerms) {
        allDeclaredFine.add(p)
      }
    }
  }

  // Expand the filtered scope to concrete fine-grained permissions.
  //
  // Strategy (one pattern at a time):
  //
  // 1. Try the standard expander first. It handles wildcards and coarse
  //    aliases correctly.
  // 2. If expansion fails with a KNOWN, expected failure, fall back to a
  //    literal membership check: if the pattern is directly declared as a
  //    fine-grained permission in the permissions section, grant it as-is.
  //    This covers the common case where the caller supplies an already-expanded
  //    fine-grained permission list (e.g. the `result.metadata.permissions`
  //    stored on a created API key) whose entries may use camelCase operation
  //    names (`switchView`) that the all-lowercase parser rejects.
  //
  // We only tolerate the two known failure modes of `expandPermissions`:
  //   - `PermissionParseError`: the pattern's format is rejected by
  //     `parsePermission` (e.g. a camelCase operation/app segment).
  //   - `PermissionExpansionError`: the pattern is well-formed but cannot be
  //     expanded against this manifest (unknown resource/operation, or an
  //     empty/absent permissions section).
  // Any OTHER error (e.g. an internal invariant violation) is a real bug and is
  // rethrown rather than silently swallowed.
  const expandedSet = new Set<string>()
  for (const pattern of appScope) {
    try {
      const expanded = expandPermissions([pattern], permissionsSection)
      for (const p of expanded) {
        expandedSet.add(p)
      }
    } catch (error) {
      if (
        !(error instanceof PermissionParseError) &&
        !(error instanceof PermissionExpansionError)
      ) {
        // Not a known expansion/parse failure — surface the real error.
        throw error
      }
      // Known failure: fall back to a literal membership check. Permissions are
      // declared all-lowercase in the manifest, so compare case-insensitively
      // to also resolve mixed-case scope entries (e.g. `Calendar:events:list`).
      if (allDeclaredFine.has(pattern)) {
        expandedSet.add(pattern)
      } else {
        const lowered = pattern.toLowerCase()
        if (allDeclaredFine.has(lowered)) {
          expandedSet.add(lowered)
        }
        // If still not a declared fine permission, ignore silently — the scope
        // simply grants nothing for this (unresolvable) pattern.
      }
    }
  }

  // Build description index from manifest commands.
  const descriptionIndex = buildPermissionDescriptions(manifest)

  // Collect all fine-grained permissions per resource from the manifest.
  const allByResource = allFinePermissionsByResource(manifest)

  // Build per-resource explanations.
  const resourceExplanations: ResourceExplanation[] = []

  for (const [resource, allPerms] of allByResource) {
    const granted: ExplainedOperation[] = []
    const notGranted: ExplainedOperation[] = []

    for (const permission of allPerms) {
      // Extract the operation by splitting on ':' rather than calling
      // parsePermission, because manifest command permissions may contain
      // camelCase operation names (e.g. `switchView`) that fail the
      // all-lowercase parser regex — they are valid in the manifest but would
      // throw if parsed. Splitting directly is always safe.
      const parts = permission.split(':')
      const operation = parts[2]
      if (operation === undefined || operation === '') {
        // Malformed permission in manifest — skip
        continue
      }

      const entry: ExplainedOperation = {
        permission,
        operation,
        description: descriptionIndex.get(permission),
      }

      if (expandedSet.has(permission)) {
        granted.push(entry)
      } else {
        notGranted.push(entry)
      }
    }

    resourceExplanations.push({ resource, granted, notGranted })
  }

  // Sort by resource name for deterministic output.
  resourceExplanations.sort((a, b) => a.resource.localeCompare(b.resource))

  const grantsNothing = expandedSet.size === 0

  return {
    app: manifest.app.name,
    resources: resourceExplanations,
    grantsNothing,
  }
}

// ---------------------------------------------------------------------------
// Plain-text renderer
// ---------------------------------------------------------------------------

/**
 * Render a {@link ScopeExplanation} as human-readable prose.
 *
 * Example output for a scope that grants event listing and creation but not
 * deletion or calendar management:
 *
 * ```
 * Permissions granted for Calendar:
 *
 *   events:
 *     Can: list (List all events in a calendar), create (Create a new event)
 *     Cannot: get, show, update, delete
 *
 *   calendars:
 *     Cannot: list, get, reload, create, update, delete
 * ```
 *
 * When `grantsNothing` is true, the renderer emits a single summary line
 * instead.
 *
 * @param explanation - Structured explanation from {@link explainScope}.
 * @returns Multi-line plain-text string (no trailing newline).
 */
export function renderScopeExplanation(explanation: ScopeExplanation): string {
  if (explanation.grantsNothing) {
    return `Permissions granted for ${explanation.app}: none (scope grants nothing)`
  }

  const lines: string[] = [`Permissions granted for ${explanation.app}:`, '']

  for (const resource of explanation.resources) {
    lines.push(`  ${resource.resource}:`)

    if (resource.granted.length > 0) {
      const grantedParts = resource.granted.map((op) =>
        op.description !== undefined ? `${op.operation} (${op.description})` : op.operation
      )
      lines.push(`    Can: ${grantedParts.join(', ')}`)
    }

    if (resource.notGranted.length > 0) {
      const notGrantedParts = resource.notGranted.map((op) => op.operation)
      lines.push(`    Cannot: ${notGrantedParts.join(', ')}`)
    }

    if (resource.granted.length === 0 && resource.notGranted.length === 0) {
      lines.push(`    (no operations defined)`)
    }

    lines.push('')
  }

  // Remove trailing blank line.
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines.join('\n')
}

import type { PermissionCheckResult } from './types.js'
import type { PermissionHistoryEntry } from '../manifest/schemas/command.js'
import { parsePermission, isValidPermission } from './parser.js'

/**
 * Check if a set of granted permissions covers a required permission.
 *
 * Permissions are stored and matched as fine-grained only. Coarse permissions
 * are expanded at key creation time, so validation only needs to compare
 * fine-grained permissions.
 *
 * @param grantedPermissions - Array of fine-grained permissions the key has
 * @param requiredPermission - The fine-grained permission needed for an operation
 * @param permissionHistory - Optional history for helpful error messages
 * @returns Result indicating if permission is granted and why
 */
export function hasPermission(
  grantedPermissions: string[],
  requiredPermission: string,
  permissionHistory?: PermissionHistoryEntry[]
): PermissionCheckResult {
  // Validate the required permission format
  if (!isValidPermission(requiredPermission)) {
    return {
      granted: false,
      required: requiredPermission,
      hint: `Invalid permission format: "${requiredPermission}"`,
    }
  }

  // Direct match - simplest case
  if (grantedPermissions.includes(requiredPermission)) {
    return {
      granted: true,
      required: requiredPermission,
      matchedBy: requiredPermission,
    }
  }

  // Check for wildcard matches in granted permissions
  const parsed = parsePermission(requiredPermission)
  for (const granted of grantedPermissions) {
    if (matchesWildcard(granted, parsed)) {
      return {
        granted: true,
        required: requiredPermission,
        matchedBy: granted,
      }
    }
  }

  // Permission not granted - provide helpful hint
  const result: PermissionCheckResult = {
    granted: false,
    required: requiredPermission,
  }

  // Check if permission requirement changed recently
  if (permissionHistory && permissionHistory.length > 0) {
    const latest = permissionHistory[0]
    // Check if the user might have a key with the old permission
    if (latest && grantedPermissions.includes(latest.permission)) {
      result.hint = `Permission changed in v${latest.version} (was: ${latest.permission}). Regenerate your API key.`
      result.changelog = {
        version: latest.version,
        previousPermission: latest.permission,
        ...(latest.reason !== undefined && { reason: latest.reason }),
      }
    }
  }

  // Default hint if no changelog applies. Name the exact fine-grained
  // permission to add so the caller can fix the denial in one step. We also
  // suggest the resource wildcard, which authorizes every operation on the
  // resource (see the matcher's wildcard rule below).
  result.hint ??= buildMissingPermissionHint(parsed, requiredPermission)

  return result
}

/**
 * Build an actionable denial hint that names the precise missing permission and
 * the resource-wildcard alternative that would also authorize the call.
 */
function buildMissingPermissionHint(
  required: ReturnType<typeof parsePermission>,
  requiredPermission: string
): string {
  const resourceWildcard = `${required.app}:${required.resource}:*`
  return (
    `Missing required permission "${requiredPermission}". ` +
    `Grant "${requiredPermission}" (or the resource wildcard "${resourceWildcard}") to authorize this call.`
  )
}

/**
 * Check if a granted permission (potentially with wildcards) matches a required permission.
 */
function matchesWildcard(granted: string, required: ReturnType<typeof parsePermission>): boolean {
  if (!isValidPermission(granted)) {
    return false
  }

  const grantedParsed = parsePermission(granted)

  // App must always match exactly
  if (grantedParsed.app !== required.app) {
    return false
  }

  // Resource must match or be wildcard
  if (grantedParsed.resource !== '*' && grantedParsed.resource !== required.resource) {
    return false
  }

  // Operation must match or be wildcard
  if (grantedParsed.operation !== '*' && grantedParsed.operation !== required.operation) {
    return false
  }

  return true
}

/**
 * Check if any of the granted permissions cover the required permission.
 * Convenience wrapper for hasPermission that returns a boolean.
 *
 * @param grantedPermissions - Array of fine-grained permissions
 * @param requiredPermission - The required permission
 * @returns True if permission is granted
 */
export function checkPermission(grantedPermissions: string[], requiredPermission: string): boolean {
  return hasPermission(grantedPermissions, requiredPermission).granted
}

/**
 * Check multiple required permissions against granted permissions.
 *
 * @param grantedPermissions - Array of fine-grained permissions
 * @param requiredPermissions - Array of required permissions
 * @returns Object with granted (all passed) and results for each
 */
export function checkPermissions(
  grantedPermissions: string[],
  requiredPermissions: string[]
): {
  granted: boolean
  results: PermissionCheckResult[]
} {
  const results = requiredPermissions.map((required) => hasPermission(grantedPermissions, required))

  return {
    granted: results.every((r) => r.granted),
    results,
  }
}

/**
 * Filter a list of permissions to only those matching an app.
 *
 * @param permissions - Array of permission strings
 * @param app - App name to filter by
 * @returns Filtered permissions
 */
export function filterPermissionsByApp(permissions: string[], app: string): string[] {
  return permissions.filter((perm) => {
    try {
      const parsed = parsePermission(perm)
      return parsed.app === app
    } catch {
      return false
    }
  })
}

/**
 * Group permissions by resource.
 *
 * @param permissions - Array of permission strings
 * @returns Map of resource name to permissions
 */
export function groupPermissionsByResource(permissions: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>()

  for (const perm of permissions) {
    try {
      const parsed = parsePermission(perm)
      const key = parsed.resource
      const existing = result.get(key) ?? []
      existing.push(perm)
      result.set(key, existing)
    } catch {
      // Skip invalid permissions
    }
  }

  return result
}

/**
 * Get a human-readable description of what permissions grant.
 *
 * @param permissions - Array of permission strings
 * @returns Human-readable description
 */
export function describePermissions(permissions: string[]): string {
  if (permissions.length === 0) {
    return 'No permissions'
  }

  const grouped = groupPermissionsByResource(permissions)
  const parts: string[] = []

  for (const [resource, perms] of grouped) {
    const operations = perms.map((p) => {
      const parsed = parsePermission(p)
      return parsed.operation
    })
    parts.push(`${resource}: ${operations.join(', ')}`)
  }

  return parts.join('; ')
}

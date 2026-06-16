import type { PermissionsSection } from '../manifest/schemas/app.js'
import { parsePermission } from './parser.js'
import { isPureCoarseOperation } from './vocabulary.js'

/**
 * Error thrown when permission expansion fails.
 */
export class PermissionExpansionError extends Error {
  constructor(
    public readonly permission: string,
    message: string
  ) {
    super(`Failed to expand permission "${permission}": ${message}`)
    this.name = 'PermissionExpansionError'
  }
}

/**
 * Expand a coarse permission to its constituent fine-grained permissions.
 *
 * @param permission - Coarse permission string (e.g., "calendar:events:read")
 * @param permissionsSection - The permissions mapping from the manifest
 * @returns Array of fine-grained permission strings
 * @throws PermissionExpansionError if the permission cannot be expanded
 */
export function expandCoarsePermission(
  permission: string,
  permissionsSection: PermissionsSection
): string[] {
  const parsed = parsePermission(permission)

  // Handle wildcard permissions
  if (parsed.type === 'wildcard') {
    return expandWildcardPermission(permission, parsed, permissionsSection)
  }

  // For non-wildcard permissions, look up in the mapping
  const resourceMapping = permissionsSection[parsed.resource]
  if (!resourceMapping) {
    throw new PermissionExpansionError(
      permission,
      `Resource "${parsed.resource}" not found in permissions mapping`
    )
  }

  // Check if operation is a KEY in the mapping (coarse permission)
  const finePermissions = resourceMapping[parsed.operation]
  if (finePermissions) {
    return [...finePermissions]
  }

  // Operation not a key - check if the full permission is a VALUE (fine-grained)
  // If it's a valid fine-grained permission, return as-is
  for (const perms of Object.values(resourceMapping)) {
    if (perms.includes(permission)) {
      return [permission]
    }
  }

  // Neither a coarse key nor a fine-grained value - invalid
  throw new PermissionExpansionError(
    permission,
    `Operation "${parsed.operation}" not found in resource "${parsed.resource}" mapping`
  )
}

/**
 * Expand a wildcard permission to all matching fine-grained permissions.
 */
function expandWildcardPermission(
  original: string,
  parsed: ReturnType<typeof parsePermission>,
  permissionsSection: PermissionsSection
): string[] {
  const result = new Set<string>()

  if (parsed.type !== 'wildcard') {
    throw new Error('Expected wildcard permission')
  }

  // Get resources to iterate over
  const resources = parsed.resource === '*' ? Object.keys(permissionsSection) : [parsed.resource]

  for (const resource of resources) {
    const resourceMapping = permissionsSection[resource]
    if (!resourceMapping) {
      if (parsed.resource !== '*') {
        throw new PermissionExpansionError(
          original,
          `Resource "${resource}" not found in permissions mapping`
        )
      }
      continue
    }

    // Get operations to iterate over
    const operations = parsed.operation === '*' ? Object.keys(resourceMapping) : [parsed.operation]

    for (const operation of operations) {
      const finePermissions = resourceMapping[operation]
      if (!finePermissions) {
        if (parsed.operation !== '*') {
          throw new PermissionExpansionError(
            original,
            `Operation "${operation}" not found in resource "${resource}" mapping`
          )
        }
        continue
      }

      for (const perm of finePermissions) {
        result.add(perm)
      }
    }
  }

  return [...result]
}

/**
 * Expand multiple permissions, handling coarse and wildcard permissions.
 *
 * @param permissions - Array of permission strings (fine, coarse, or wildcard)
 * @param permissionsSection - The permissions mapping from the manifest
 * @returns Array of unique fine-grained permission strings
 */
export function expandPermissions(
  permissions: string[],
  permissionsSection: PermissionsSection
): string[] {
  const result = new Set<string>()

  for (const permission of permissions) {
    const expanded = expandCoarsePermission(permission, permissionsSection)
    for (const perm of expanded) {
      result.add(perm)
    }
  }

  return [...result]
}

/**
 * Find the coarse category that contains a fine-grained permission.
 *
 * @param finePermission - Fine-grained permission string
 * @param permissionsSection - The permissions mapping from the manifest
 * @returns Coarse permission string, or undefined if not found
 */
export function findCoarseCategory(
  finePermission: string,
  permissionsSection: PermissionsSection
): string | undefined {
  const parsed = parsePermission(finePermission)

  for (const [resource, mapping] of Object.entries(permissionsSection)) {
    for (const [operation, permissions] of Object.entries(mapping)) {
      if (permissions.includes(finePermission)) {
        return `${parsed.app}:${resource}:${operation}`
      }
    }
  }

  return undefined
}

/**
 * Generate a complete permission map from a manifest's permissions section.
 * The map contains both directions: coarse→fine and fine→coarse.
 */
export interface PermissionMap {
  /** Map of coarse permission to fine-grained permissions */
  coarseToFine: Map<string, string[]>
  /** Map of fine-grained permission to its coarse category */
  fineToCoarse: Map<string, string>
  /** All fine-grained permissions */
  allFine: Set<string>
  /** All coarse permissions */
  allCoarse: Set<string>
}

/**
 * Generate a permission map from a manifest's permissions section.
 *
 * @param appName - The application name (for permission string construction)
 * @param permissionsSection - The permissions mapping from the manifest
 * @returns Complete permission map
 */
export function generatePermissionMap(
  appName: string,
  permissionsSection: PermissionsSection
): PermissionMap {
  const coarseToFine = new Map<string, string[]>()
  const fineToCoarse = new Map<string, string>()
  const allFine = new Set<string>()
  const allCoarse = new Set<string>()

  for (const [resource, mapping] of Object.entries(permissionsSection)) {
    for (const [operation, permissions] of Object.entries(mapping)) {
      const coarsePermission = `${appName}:${resource}:${operation}`
      allCoarse.add(coarsePermission)
      coarseToFine.set(coarsePermission, [...permissions])

      for (const fine of permissions) {
        allFine.add(fine)
        fineToCoarse.set(fine, coarsePermission)
      }
    }
  }

  return {
    coarseToFine,
    fineToCoarse,
    allFine,
    allCoarse,
  }
}

/**
 * Validate that all command permissions are included in the permissions mapping.
 *
 * @param commandPermissions - Map of command names to their permission strings
 * @param permissionsSection - The permissions mapping from the manifest
 * @returns Array of validation errors (empty if valid)
 */
export function validateCommandPermissions(
  commandPermissions: Map<string, string>,
  permissionsSection: PermissionsSection
): string[] {
  const errors: string[] = []
  const allFinePermissions = new Set<string>()

  // Collect all fine-grained permissions from the mapping
  for (const mapping of Object.values(permissionsSection)) {
    for (const permissions of Object.values(mapping)) {
      for (const perm of permissions) {
        allFinePermissions.add(perm)
      }
    }
  }

  // Check that each command permission is in the mapping and does not use a
  // grouping-only coarse alias (read/write). A command must name a real
  // fine-grained operation; using a pure-coarse alias as its operation would
  // collide with the coarse vocabulary and authorize nothing on its own.
  for (const [commandName, permission] of commandPermissions) {
    const operation = parsePermission(permission).operation
    if (isPureCoarseOperation(operation)) {
      errors.push(
        `Command "${commandName}" has permission "${permission}" whose operation "${operation}" ` +
          `is a grouping-only coarse alias; use a concrete fine-grained operation instead`
      )
    }
    if (!allFinePermissions.has(permission)) {
      errors.push(
        `Command "${commandName}" has permission "${permission}" which is not in the permissions mapping`
      )
    }
  }

  return errors
}

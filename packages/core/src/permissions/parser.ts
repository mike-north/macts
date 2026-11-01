import type {
  ParsedPermission,
  FinePermission,
  CoarsePermission,
  WildcardPermission,
} from './types.js'
import type { CoarseOperation } from './vocabulary.js'
import { isCoarseOperation } from './vocabulary.js'

/**
 * Permission string validation regex.
 *
 * Format: `app:resource:operation`.
 * - The app segment is the normalized app name: lowercase, starting with a
 *   letter, with digits, `-` and `_` allowed (`google-chrome`).
 * - The resource and operation segments are camelCase identifiers: a lowercase
 *   first letter followed by letters and digits (`mediaItems`,
 *   `splitVertically`), because they are the manifest's own resource and
 *   command names. `-` and `_` are not allowed in them.
 * - A resource or operation may instead be `*`, a wildcard.
 *
 * The grammar only decides what is well-formed. Matching against grants stays
 * exact and case-sensitive, so `photos:mediaitems:list` never authorizes
 * `photos:mediaItems:list`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 */
const PERMISSION_REGEX =
  /^([a-z][a-z0-9_-]*):((?:[a-z][a-zA-Z0-9]*)|\*):((?:[a-z][a-zA-Z0-9]*)|\*)$/

/**
 * The permission format in user terms, for error messages and CLI help.
 * Kept next to the regex it describes.
 */
export const PERMISSION_FORMAT_DESCRIPTION =
  'Must be in format "app:resource:operation". The app is lowercase (digits, "-" and "_" allowed); ' +
  'the resource and operation are camelCase (start lowercase, then letters and digits only) or "*". ' +
  'Permissions are case-sensitive. Examples: "calendar:events:list", "photos:mediaItems:list", "calendar:*:*"'

/**
 * Error thrown when a permission string is invalid.
 */
export class PermissionParseError extends Error {
  constructor(
    public readonly permission: string,
    message: string
  ) {
    super(`Invalid permission "${permission}": ${message}`)
    this.name = 'PermissionParseError'
  }
}

/**
 * Parse a permission string into a structured permission object.
 *
 * The parser determines permission type based on:
 * 1. If resource or operation contains `*`, it's a wildcard
 * 2. If operation is a standard CRUD operation (read/create/write/delete), it's coarse
 * 3. Otherwise, it's fine-grained
 *
 * Note: The distinction between coarse and fine is contextual. The manifest's
 * permissions section defines which operations are coarse for each resource.
 * This parser makes a best-effort guess based on standard conventions.
 *
 * @param permission - Permission string in format `app:resource:operation`
 * @returns Parsed permission object
 * @throws PermissionParseError if the format is invalid
 */
export function parsePermission(permission: string): ParsedPermission {
  const match = PERMISSION_REGEX.exec(permission)

  if (!match) {
    throw new PermissionParseError(permission, PERMISSION_FORMAT_DESCRIPTION)
  }

  // TypeScript knows match is non-null here but array elements could be undefined
  // We know they exist because the regex matched, so use non-null assertions
  const app = match[1] ?? ''
  const resource = match[2] ?? ''
  const operation = match[3] ?? ''

  // Check for wildcard permissions
  if (resource === '*' || operation === '*') {
    return {
      type: 'wildcard',
      app,
      resource,
      operation,
    } satisfies WildcardPermission
  }

  // Check if operation is a standard coarse operation
  if (isCoarseOperation(operation)) {
    return {
      type: 'coarse',
      app,
      resource,
      operation,
    } satisfies CoarsePermission
  }

  // Default to fine-grained
  return {
    type: 'fine',
    app,
    resource,
    operation,
  } satisfies FinePermission
}

/**
 * Format a parsed permission back to a string.
 *
 * @param permission - Parsed permission object
 * @returns Permission string
 */
export function formatPermission(permission: ParsedPermission): string {
  return `${permission.app}:${permission.resource}:${permission.operation}`
}

/**
 * Create a fine-grained permission string.
 *
 * @param app - Application name
 * @param resource - Resource name
 * @param operation - Operation name
 * @returns Permission string
 */
export function finePermission(app: string, resource: string, operation: string): string {
  return `${app}:${resource}:${operation}`
}

/**
 * Create a coarse permission string.
 *
 * @param app - Application name
 * @param resource - Resource name
 * @param operation - CRUD operation
 * @returns Permission string
 */
export function coarsePermission(
  app: string,
  resource: string,
  operation: CoarseOperation
): string {
  return `${app}:${resource}:${operation}`
}

/**
 * Create a wildcard permission string.
 *
 * @param app - Application name
 * @param resource - Resource name or '*'
 * @param operation - Operation name or '*'
 * @returns Permission string
 */
export function wildcardPermission(app: string, resource: string, operation: string): string {
  return `${app}:${resource}:${operation}`
}

/**
 * Validate a permission string without parsing it.
 *
 * @param permission - Permission string to validate
 * @returns True if valid, false otherwise
 */
export function isValidPermission(permission: string): boolean {
  return PERMISSION_REGEX.test(permission)
}

/**
 * Extract the app name from a permission string.
 *
 * @param permission - Permission string
 * @returns App name or undefined if invalid
 */
export function extractAppName(permission: string): string | undefined {
  const match = PERMISSION_REGEX.exec(permission)
  return match?.[1]
}

/**
 * Extract the resource name from a permission string.
 *
 * @param permission - Permission string
 * @returns Resource name or undefined if invalid
 */
export function extractResourceName(permission: string): string | undefined {
  const match = PERMISSION_REGEX.exec(permission)
  return match?.[2]
}

/**
 * Extract the operation from a permission string.
 *
 * @param permission - Permission string
 * @returns Operation name or undefined if invalid
 */
export function extractOperation(permission: string): string | undefined {
  const match = PERMISSION_REGEX.exec(permission)
  return match?.[3]
}

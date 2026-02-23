/**
 * Permission string format: `<app>:<resource>:<operation>`
 *
 * Examples:
 * - Fine-grained: `calendar:events:list`, `calendar:events:show`
 * - Coarse: `calendar:events:read`, `calendar:calendars:write`
 * - Wildcard: `calendar:*:read`, `calendar:events:*`
 */

// Note: Manifest-related types (PermissionsSection, CoarseMapping, PermissionHistoryEntry)
// are defined in and exported from manifest/schemas/app.ts and manifest/schemas/command.ts.
// Import them directly from there to avoid duplicate exports.

/**
 * Fine-grained permission - one per command.
 * Format: `app:resource:operation`
 */
export interface FinePermission {
  readonly type: 'fine'
  readonly app: string
  readonly resource: string
  readonly operation: string
}

/**
 * Coarse-grained permission - CRUD-style groups.
 * Format: `app:resource:crud-operation`
 */
export interface CoarsePermission {
  readonly type: 'coarse'
  readonly app: string
  readonly resource: string
  readonly operation: CoarseOperation
}

/**
 * Wildcard permission - matches multiple permissions.
 * Format: `app:*:operation` or `app:resource:*`
 */
export interface WildcardPermission {
  readonly type: 'wildcard'
  readonly app: string
  readonly resource: string
  readonly operation: string
}

/**
 * Standard CRUD operations for coarse permissions.
 */
export const COARSE_OPERATIONS = ['read', 'create', 'write', 'delete'] as const
export type CoarseOperation = (typeof COARSE_OPERATIONS)[number]

/**
 * Special coarse operations beyond standard CRUD.
 * These are defined per-app in the manifest.
 */
export type SpecialOperation = string

/**
 * Union type for all parsed permission types.
 */
export type ParsedPermission = FinePermission | CoarsePermission | WildcardPermission

/**
 * API key payload structure.
 */
export interface ApiKeyPayload {
  /** Issuer - always 'macts' */
  iss: 'macts'
  /** Subject - unique key ID for revocation tracking */
  sub: string
  /** Issued at timestamp (Unix seconds) */
  iat: number
  /** Optional expiration timestamp (Unix seconds) */
  exp?: number
  /** List of fine-grained permissions granted */
  permissions: string[]
  /** Human-readable key name */
  name?: string
}

/**
 * API key metadata stored separately from the key itself.
 * Used for listing and management without exposing secrets.
 */
export interface ApiKeyMetadata {
  /** Unique key ID */
  id: string
  /** Human-readable name */
  name: string
  /** Permissions granted (may include coarse that were expanded) */
  permissions: string[]
  /** Original permissions as requested (before expansion) */
  originalPermissions: string[]
  /** Creation timestamp */
  createdAt: Date
  /** Expiration timestamp (undefined if no expiration) */
  expiresAt?: Date | undefined
  /** Whether the key has been revoked */
  revoked: boolean
  /** Key prefix for identification (first 8 chars after macts_sk_) */
  keyPrefix: string
}

/**
 * Result of API key validation.
 */
export interface ApiKeyValidationResult {
  /** Whether the key is valid */
  valid: boolean
  /** Decoded payload if valid */
  payload?: ApiKeyPayload
  /** Error message if invalid */
  error?: string
  /** Error code for programmatic handling */
  errorCode?: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' | 'REVOKED' | 'MALFORMED_PAYLOAD'
}

/**
 * Result of permission check.
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean
  /** Required permission that was checked */
  required: string
  /** Matching permission from the key (if granted) */
  matchedBy?: string
  /** Hint for upgrading if denied */
  hint?: string
  /** Permission change info if the requirement changed */
  changelog?: {
    version: string
    previousPermission: string
    reason?: string
  }
}

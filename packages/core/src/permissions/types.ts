/**
 * Permission string format: `<app>:<resource>:<operation>`
 *
 * Examples:
 * - Fine-grained: `calendar:events:list`, `calendar:events:show` (authorize directly)
 * - Wildcard: `calendar:events:*` (all ops on a resource), `calendar:*:*` (all)
 * - Coarse: `calendar:events:read` — *sugar* that is expanded against the
 *   manifest at key-creation time into fine-grained operations. A coarse
 *   operation never authorizes a call on its own.
 *
 * The operation vocabulary has a single source of truth in `vocabulary.ts`.
 */

import type { CoarseOperation } from './vocabulary.js'

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
 * Error codes for API key validation failures.
 */
export type ApiKeyValidationErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'MALFORMED_PAYLOAD'

/**
 * Successful API key validation.
 */
export interface ApiKeyValidationSuccess {
  /** Whether the key is valid */
  valid: true
  /** Decoded payload */
  payload: ApiKeyPayload
}

/**
 * Failed API key validation.
 */
export interface ApiKeyValidationFailure {
  /** Whether the key is valid */
  valid: false
  /** Error message */
  error: string
  /** Error code for programmatic handling */
  errorCode: ApiKeyValidationErrorCode
}

/**
 * Result of API key validation.
 *
 * Discriminated on `valid`: narrowing on `result.valid` gives direct access
 * to `payload` (success) or `error`/`errorCode` (failure) without guards.
 */
export type ApiKeyValidationResult = ApiKeyValidationSuccess | ApiKeyValidationFailure

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

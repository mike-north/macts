/**
 * API key types and interfaces for macts.
 *
 * Re-exports relevant types from @macts/core and adds API-specific types.
 *
 * @packageDocumentation
 */

// Re-export core types
export type {
  ApiKeyPayload,
  ApiKeyMetadata,
  ApiKeyValidationErrorCode,
  ApiKeyValidationSuccess,
  ApiKeyValidationFailure,
  ApiKeyValidationResult,
  PermissionCheckResult,
} from '@macts/core'

/**
 * Options for creating an API key.
 */
export interface CreateApiKeyOptions {
  /** Human-readable name for the key */
  name: string
  /**
   * Permissions to grant.
   * Can include fine-grained, coarse, or wildcard permissions.
   * Coarse and wildcard permissions are expanded at creation time.
   */
  permissions: string[]
  /**
   * Optional expiration.
   * Can be a Date, Unix timestamp, or duration string (e.g., "30d", "1h").
   */
  expires?: Date | number | string | undefined
}

/**
 * Result of creating an API key.
 */
export interface CreateApiKeyResult {
  /** The signed API key token (prefixed with macts_sk_) */
  token: string
  /** Unique key ID for management/revocation */
  keyId: string
  /** Metadata about the created key */
  metadata: import('@macts/core').ApiKeyMetadata
}

/**
 * Options for listing API keys.
 */
export interface ListApiKeysOptions {
  /** Include revoked keys */
  includeRevoked?: boolean
  /** Filter by name pattern */
  namePattern?: string
}

/**
 * Duration string format for expiration.
 * Examples: "30d", "1h", "2w", "6m"
 */
export type DurationString = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'}`

/**
 * Parse a duration string into milliseconds.
 *
 * @param duration - Duration string (e.g., "30d", "1h")
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  const match = /^(\d+)([smhdwMy])$/.exec(duration)
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }

  // The regex guarantees these groups exist
  const value = parseInt(match[1] ?? '', 10)
  const unit = match[2] ?? ''

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    M: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  }

  const multiplier = multipliers[unit]
  if (multiplier === undefined) {
    throw new Error(`Invalid duration unit: ${unit}`)
  }
  return value * multiplier
}

/**
 * Calculate expiration timestamp from various input formats.
 *
 * @param expires - Expiration as Date, Unix timestamp (seconds), or duration string
 * @returns Unix timestamp in seconds
 */
export function calculateExpiration(expires: Date | number | string): number {
  if (expires instanceof Date) {
    return Math.floor(expires.getTime() / 1000)
  }

  if (typeof expires === 'number') {
    // If it looks like milliseconds (> year 3000 in seconds), convert
    if (expires > 32503680000) {
      return Math.floor(expires / 1000)
    }
    return expires
  }

  // Duration string
  const durationMs = parseDuration(expires)
  return Math.floor((Date.now() + durationMs) / 1000)
}

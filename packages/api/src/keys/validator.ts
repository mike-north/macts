/**
 * API key validation for macts.
 *
 * Validates JWT tokens and checks permissions.
 *
 * @packageDocumentation
 */

import * as jose from 'jose'
import type {
  ApiKeyPayload,
  ApiKeyValidationResult,
  PermissionCheckResult,
  PermissionHistoryEntry,
} from '@macts/core'
import { hasPermission, checkPermission, checkPermissions, isValidPermission } from '@macts/core'
import { getSigningSecret, isKeyRevoked } from './storage.js'
import { TtlCache } from './cache.js'

/** API key prefix */
const KEY_PREFIX = 'macts_sk_'

/** Cache for revocation checks (5-second TTL) */
const revocationCache = new TtlCache<boolean>(5000)

/**
 * Validate an API key token.
 *
 * Checks:
 * 1. Token format (must start with macts_sk_)
 * 2. JWT signature
 * 3. Expiration (if set)
 * 4. Revocation status
 *
 * @param token - The API key token to validate
 * @returns Validation result with payload if valid
 */
export async function validateApiKey(token: string): Promise<ApiKeyValidationResult> {
  // Check prefix
  if (!token.startsWith(KEY_PREFIX)) {
    return {
      valid: false,
      error: 'Invalid token format: must start with macts_sk_',
      errorCode: 'INVALID_FORMAT',
    }
  }

  // Extract JWT
  const jwt = token.slice(KEY_PREFIX.length)

  // Get signing secret
  const secret = await getSigningSecret()
  const secretKey = new TextEncoder().encode(secret)

  // Verify JWT
  let payload: jose.JWTPayload
  try {
    const result = await jose.jwtVerify(jwt, secretKey, {
      issuer: 'macts',
    })
    payload = result.payload
  } catch (err) {
    if (err instanceof jose.errors.JWTExpired) {
      return {
        valid: false,
        error: 'Token has expired',
        errorCode: 'EXPIRED',
      }
    }
    if (err instanceof jose.errors.JWSSignatureVerificationFailed) {
      return {
        valid: false,
        error: 'Invalid token signature',
        errorCode: 'INVALID_SIGNATURE',
      }
    }
    return {
      valid: false,
      error: `Token validation failed: ${(err as Error).message}`,
      errorCode: 'INVALID_FORMAT',
    }
  }

  // Validate payload structure
  if (!isValidPayload(payload)) {
    return {
      valid: false,
      error: 'Malformed token payload',
      errorCode: 'MALFORMED_PAYLOAD',
    }
  }

  const apiKeyPayload = payload as unknown as ApiKeyPayload

  // Check revocation (with cache)
  const keyId = apiKeyPayload.sub
  let revoked = revocationCache.get(keyId)
  if (revoked === undefined) {
    revoked = isKeyRevoked(keyId)
    revocationCache.set(keyId, revoked)
  }
  if (revoked) {
    return {
      valid: false,
      error: 'Token has been revoked',
      errorCode: 'REVOKED',
    }
  }

  return {
    valid: true,
    payload: apiKeyPayload,
  }
}

/**
 * Type guard for valid API key payload.
 *
 * Validates both structural requirements and permission string format.
 */
function isValidPayload(payload: jose.JWTPayload): boolean {
  return (
    payload.iss === 'macts' &&
    typeof payload.sub === 'string' &&
    typeof payload.iat === 'number' &&
    Array.isArray(payload['permissions']) &&
    (payload['permissions'] as unknown[]).every(
      (p) => typeof p === 'string' && isValidPermission(p)
    )
  )
}

/**
 * Validate a token and check if it has a required permission.
 *
 * @param token - API key token
 * @param requiredPermission - Permission to check
 * @param permissionHistory - Optional history for helpful error messages
 * @returns Permission check result
 */
export async function validateAndCheckPermission(
  token: string,
  requiredPermission: string,
  permissionHistory?: PermissionHistoryEntry[]
): Promise<PermissionCheckResult & { validationError?: string }> {
  const validation = await validateApiKey(token)

  if (!validation.valid) {
    return {
      granted: false,
      required: requiredPermission,
      hint: validation.error ?? 'Invalid token',
    }
  }

  return hasPermission(validation.payload?.permissions ?? [], requiredPermission, permissionHistory)
}

/**
 * Check if a validated payload has a specific permission.
 *
 * Use this when you've already validated the token and have the payload.
 *
 * @param payload - Validated API key payload
 * @param requiredPermission - Permission to check
 * @param permissionHistory - Optional history for helpful error messages
 * @returns Permission check result
 */
export function checkPayloadPermission(
  payload: ApiKeyPayload,
  requiredPermission: string,
  permissionHistory?: PermissionHistoryEntry[]
): PermissionCheckResult {
  return hasPermission(payload.permissions, requiredPermission, permissionHistory)
}

/**
 * Check multiple permissions against a validated payload.
 *
 * @param payload - Validated API key payload
 * @param requiredPermissions - Permissions to check
 * @returns Object with overall granted status and individual results
 */
export function checkPayloadPermissions(
  payload: ApiKeyPayload,
  requiredPermissions: string[]
): { granted: boolean; results: PermissionCheckResult[] } {
  return checkPermissions(payload.permissions, requiredPermissions)
}

/**
 * Extract permissions from a token without full validation.
 *
 * Useful for debugging and inspection. Does NOT verify signature.
 *
 * @param token - API key token
 * @returns Permissions array or undefined if token is malformed
 */
export function extractPermissionsFromToken(token: string): string[] | undefined {
  if (!token.startsWith(KEY_PREFIX)) {
    return undefined
  }

  const jwt = token.slice(KEY_PREFIX.length)
  const parts = jwt.split('.')

  if (parts.length !== 3) {
    return undefined
  }

  try {
    const payloadPart = parts[1]
    if (!payloadPart) return undefined
    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf-8')
    ) as ApiKeyPayload
    return payload.permissions
  } catch {
    return undefined
  }
}

/**
 * Get the key ID from a token without validation.
 *
 * @param token - API key token
 * @returns Key ID or undefined if token is malformed
 */
export function extractKeyIdFromToken(token: string): string | undefined {
  if (!token.startsWith(KEY_PREFIX)) {
    return undefined
  }

  const jwt = token.slice(KEY_PREFIX.length)
  const parts = jwt.split('.')

  if (parts.length !== 3) {
    return undefined
  }

  try {
    const payloadPart = parts[1]
    if (!payloadPart) return undefined
    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf-8')
    ) as ApiKeyPayload
    return payload.sub
  } catch {
    return undefined
  }
}

// Re-export convenience functions from core
export { hasPermission, checkPermission, checkPermissions }

/**
 * API key generation for macts.
 *
 * Creates signed JWT tokens with expanded permissions.
 * Coarse and wildcard permissions are expanded to fine-grained at creation time.
 *
 * @packageDocumentation
 */

import * as jose from 'jose'
import type { ApiKeyPayload, ApiKeyMetadata, PermissionsSection } from '@macts/core'
import { expandPermissions } from '@macts/core'
import type { CreateApiKeyOptions, CreateApiKeyResult } from './types.js'
import { calculateExpiration } from './types.js'
import { getSigningSecret, addKeyMetadata, generateKeyId } from './storage.js'

/** API key prefix for identification */
const KEY_PREFIX = 'macts_sk_'

/**
 * Create a new API key with the specified permissions.
 *
 * Permissions are expanded at creation time:
 * - Coarse permissions (calendar:events:read) expand to their fine-grained equivalents
 * - Wildcard permissions (calendar:*:read) expand to all matching permissions
 * - Fine-grained permissions are included as-is
 *
 * @param options - Key creation options
 * @param permissionsSection - Permissions mapping from manifest (for expansion)
 * @returns Created key token and metadata
 */
export async function createApiKey(
  options: CreateApiKeyOptions,
  permissionsSection?: PermissionsSection
): Promise<CreateApiKeyResult> {
  const keyId = generateKeyId()
  const now = Math.floor(Date.now() / 1000)

  // Expand permissions if mapping is provided
  let expandedPermissions: string[]
  if (permissionsSection) {
    expandedPermissions = expandPermissions(options.permissions, permissionsSection)
  } else {
    // Without mapping, keep permissions as-is (they're assumed to be fine-grained)
    expandedPermissions = [...options.permissions]
  }

  // Calculate expiration if provided
  let exp: number | undefined
  let expiresAt: Date | undefined
  if (options.expires !== undefined) {
    exp = calculateExpiration(options.expires)
    expiresAt = new Date(exp * 1000)
  }

  // Build JWT payload
  const payload: ApiKeyPayload = {
    iss: 'macts',
    sub: keyId,
    iat: now,
    permissions: expandedPermissions,
    name: options.name,
  }

  if (exp !== undefined) {
    payload.exp = exp
  }

  // Sign the token
  const secret = await getSigningSecret()
  const secretKey = new TextEncoder().encode(secret)

  const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secretKey)

  // Add prefix for easy identification
  const prefixedToken = KEY_PREFIX + token

  // Create metadata for storage
  const metadata: ApiKeyMetadata = {
    id: keyId,
    name: options.name,
    permissions: expandedPermissions,
    originalPermissions: options.permissions,
    createdAt: new Date(now * 1000),
    expiresAt,
    revoked: false,
    keyPrefix: token.slice(0, 8),
  }

  // Store metadata
  addKeyMetadata(metadata)

  return {
    token: prefixedToken,
    keyId,
    metadata,
  }
}

/**
 * Create an API key without expansion (all permissions treated as fine-grained).
 *
 * Use this when you don't have access to the manifest or when permissions
 * are already fine-grained.
 *
 * @param options - Key creation options
 * @returns Created key token and metadata
 */
export async function createApiKeySimple(
  options: CreateApiKeyOptions
): Promise<CreateApiKeyResult> {
  return createApiKey(options)
}

/**
 * Create an API key with full access to a specific app.
 *
 * @param appName - Application name
 * @param name - Human-readable key name
 * @param expires - Optional expiration
 * @returns Created key token and metadata
 */
export async function createFullAccessKey(
  appName: string,
  name: string,
  expires?: Date | number | string
): Promise<CreateApiKeyResult> {
  return createApiKey({
    name,
    permissions: [`${appName}:*:*`],
    expires,
  })
}

/**
 * Create a read-only API key for a specific app.
 *
 * @param appName - Application name
 * @param name - Human-readable key name
 * @param permissionsSection - Permissions mapping for expansion
 * @param expires - Optional expiration
 * @returns Created key token and metadata
 */
export async function createReadOnlyKey(
  appName: string,
  name: string,
  permissionsSection: PermissionsSection,
  expires?: Date | number | string
): Promise<CreateApiKeyResult> {
  return createApiKey(
    {
      name,
      permissions: [`${appName}:*:read`],
      expires,
    },
    permissionsSection
  )
}

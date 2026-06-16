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
import { expandPermissions, parsePermission, isPureCoarseOperation } from '@macts/core'
import type { CreateApiKeyOptions, CreateApiKeyResult } from './types.js'
import { calculateExpiration } from './types.js'
import { getSigningSecret, addKeyMetadata, generateKeyId } from './storage.js'

/** API key prefix for identification */
const KEY_PREFIX = 'macts_sk_'

/**
 * Error thrown when a coarse permission is requested without a manifest to
 * expand it against. Coarse operations (read/create/write/delete) are sugar
 * that must be resolved into fine-grained operations at creation time; storing
 * one unexpanded would silently authorize nothing, so we reject it instead.
 */
export class UnexpandableCoarsePermissionError extends Error {
  constructor(public readonly permission: string) {
    super(
      `Cannot create a key with coarse permission "${permission}" without a manifest. ` +
        `The coarse operations "read" and "write" only authorize calls once expanded ` +
        `against a manifest's permissions section. ` +
        `Pass a manifest (the CLI's --manifest flag) to expand it, ` +
        `grant the resource wildcard "${asResourceWildcard(permission)}", ` +
        `or grant fine-grained permissions directly (e.g. "${asFineExample(permission)}").`
    )
    this.name = 'UnexpandableCoarsePermissionError'
  }
}

/** Build the resource wildcard suggestion (`app:resource:*`) for an error hint. */
function asResourceWildcard(permission: string): string {
  const parsed = parsePermission(permission)
  return `${parsed.app}:${parsed.resource}:*`
}

/** Build a concrete fine-grained example (`app:resource:list`) for an error hint. */
function asFineExample(permission: string): string {
  const parsed = parsePermission(permission)
  const resource = parsed.resource === '*' ? 'resource' : parsed.resource
  return `${parsed.app}:${resource}:list`
}

/**
 * Identify any requested permission that uses a *grouping-only* coarse
 * operation (`read` / `write`). These never name a real command, so a bare
 * scope using one authorizes nothing unless expanded against a manifest — we
 * reject them rather than store a dead scope.
 *
 * This covers both a concrete resource (`calendar:events:read`) and a wildcard
 * resource paired with a grouping-only operation (`calendar:*:read`).
 *
 * `create` / `delete` are intentionally *not* flagged: they double as genuine
 * fine-grained operations, so `calendar:events:create` authorizes the `create`
 * call directly and needs no manifest. A wildcard operation (`*`) is likewise
 * matched directly and needs no expansion.
 */
function findUnexpandableCoarsePermissions(permissions: string[]): string[] {
  return permissions.filter((permission) => {
    const parsed = parsePermission(permission)
    return parsed.operation !== '*' && isPureCoarseOperation(parsed.operation)
  })
}

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

  // Expand permissions if a manifest mapping is provided. Without one, coarse
  // operations cannot be resolved to the fine-grained operations they cover, so
  // we reject them precisely rather than store a scope that authorizes nothing.
  let expandedPermissions: string[]
  if (permissionsSection) {
    expandedPermissions = expandPermissions(options.permissions, permissionsSection)
  } else {
    const coarse = findUnexpandableCoarsePermissions(options.permissions)
    if (coarse.length > 0 && coarse[0] !== undefined) {
      throw new UnexpandableCoarsePermissionError(coarse[0])
    }
    // Remaining permissions are fine-grained or wildcards; store as-is.
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

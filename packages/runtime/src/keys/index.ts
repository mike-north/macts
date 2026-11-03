/**
 * API key management for macts.
 *
 * Provides JWT-based API keys with fine-grained permission control.
 * Keys support both fine-grained and coarse CRUD-style permissions.
 *
 * The token is the grant. A key's permissions and expiry are signed into its
 * token when it is issued, and validation reads them only from the token. The
 * stored record is the receipt of what was issued plus the key's status
 * (active, revoked, or missing when no record is stored). `createApiKey` is the
 * only way to store a key, and it stores exactly the grant it signed; the
 * record's permissions and expiry cannot be edited afterwards, so they match
 * the grant `createApiKey` signed. To narrow what a key may do, set its per-key
 * governance policy with `setKeyPolicy`: the policy intersects with the host
 * policy and is resolved per request. To shorten or otherwise change a key's
 * grant, revoke the key with `revokeKey` and issue a new one.
 *
 * @example
 * ```typescript
 * import {
 *   createApiKey,
 *   validateApiKey,
 *   validateAndCheckPermission
 * } from '@macts/runtime';
 *
 * // Create a key with coarse permissions (expanded at creation)
 * const result = await createApiKey({
 *   name: 'CI Pipeline',
 *   permissions: ['calendar:events:read', 'calendar:calendars:read'],
 *   expires: '30d',
 * }, permissionsMapping);
 *
 * // Validate a key
 * const validation = await validateApiKey(result.token);
 * if (validation.valid) {
 *   console.log('Permissions:', validation.payload.permissions);
 * }
 *
 * // Check permission
 * const check = await validateAndCheckPermission(
 *   result.token,
 *   'calendar:events:list'
 * );
 * if (check.granted) {
 *   // Execute operation
 * }
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  ApiKeyPayload,
  ApiKeyMetadata,
  ApiKeyValidationErrorCode,
  ApiKeyValidationSuccess,
  ApiKeyValidationFailure,
  ApiKeyValidationResult,
  PermissionCheckResult,
  CreateApiKeyOptions,
  CreateApiKeyResult,
  ListApiKeysOptions,
  DurationString,
} from './types.js'
export { parseDuration, calculateExpiration } from './types.js'

// Generator
export {
  createApiKey,
  createApiKeySimple,
  createFullAccessKey,
  createReadOnlyKey,
  UnexpandableCoarsePermissionError,
  PermissionCaseMismatchError,
} from './generator.js'

// Validator
export {
  validateApiKey,
  validateAndCheckPermission,
  checkPayloadPermission,
  checkPayloadPermissions,
  extractPermissionsFromToken,
  extractKeyIdFromToken,
  hasPermission,
  checkPermission,
  checkPermissions,
} from './validator.js'

// Cache
export { TtlCache } from './cache.js'

// Encryption
export { deriveEncryptionKey, encrypt, decrypt } from './encryption.js'

// Storage
//
// Nothing here writes a key's grant: records are stored only by `createApiKey`,
// which stores exactly what it signed, and a stored record can only be renamed,
// revoked or deleted afterwards.
export {
  closeKeyStore,
  getSigningSecret,
  setSigningSecret,
  generateSecret,
  loadKeyMetadata,
  updateKeyMetadata,
  getKeyMetadata,
  revokeKey,
  deleteKeyMetadata,
  getKeyRecordStatus,
  // Deprecated, and kept so existing callers keep working.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  isKeyRevoked,
  generateKeyId,
  setKeyPolicy,
  getKeyPolicy,
  deleteKeyPolicy,
  listKeyPolicyIds,
  KeyPolicyError,
} from './storage.js'
export type { KeyMetadataUpdate, KeyRecordStatus } from './storage.js'

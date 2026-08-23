/**
 * API key management for macts.
 *
 * Provides JWT-based API keys with fine-grained permission control.
 * Keys support both fine-grained and coarse CRUD-style permissions.
 *
 * @example
 * ```typescript
 * import {
 *   createApiKey,
 *   validateApiKey,
 *   validateAndCheckPermission
 * } from '@macts/api/keys';
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
export {
  getSigningSecret,
  setSigningSecret,
  generateSecret,
  loadKeyMetadata,
  saveKeyMetadata,
  addKeyMetadata,
  updateKeyMetadata,
  getKeyMetadata,
  revokeKey,
  deleteKeyMetadata,
  isKeyRevoked,
  generateKeyId,
} from './storage.js'

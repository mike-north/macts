/**
 * Type tests for permissions types.
 *
 * These tests verify compile-time type correctness using tsd.
 * They complement runtime tests in *.test.ts files.
 */

import { expectType, expectNotAssignable, expectAssignable } from 'tsd'
import type {
  FinePermission,
  CoarsePermission,
  WildcardPermission,
  ParsedPermission,
  ApiKeyPayload,
  ApiKeyMetadata,
  ApiKeyValidationResult,
  ApiKeyValidationErrorCode,
  PermissionCheckResult,
} from './types.js'
// CoarseOperation is single-sourced in the vocabulary module.
import type { CoarseOperation } from './vocabulary.js'

// =============================================================================
// CoarseOperation Type Tests
// =============================================================================

// Positive: Valid coarse operations are assignable
expectAssignable<CoarseOperation>('read')
expectAssignable<CoarseOperation>('create')
expectAssignable<CoarseOperation>('write')
expectAssignable<CoarseOperation>('delete')

// Negative: Invalid operations should not be assignable
expectNotAssignable<CoarseOperation>('list')
expectNotAssignable<CoarseOperation>('show')
expectNotAssignable<CoarseOperation>('admin')
expectNotAssignable<CoarseOperation>('')

// =============================================================================
// ParsedPermission Discriminated Union Tests
// =============================================================================

declare const parsed: ParsedPermission

// Test discriminated union narrowing
if (parsed.type === 'fine') {
  expectType<'fine'>(parsed.type)
  expectType<string>(parsed.app)
  expectType<string>(parsed.resource)
  expectType<string>(parsed.operation)
}

if (parsed.type === 'coarse') {
  expectType<'coarse'>(parsed.type)
  expectType<string>(parsed.app)
  expectType<string>(parsed.resource)
  expectType<CoarseOperation>(parsed.operation)
}

if (parsed.type === 'wildcard') {
  expectType<'wildcard'>(parsed.type)
  expectType<string>(parsed.app)
  expectType<string>(parsed.resource)
  expectType<string>(parsed.operation)
}

// =============================================================================
// FinePermission Type Tests
// =============================================================================

// Positive: Valid FinePermission
const validFine: FinePermission = {
  type: 'fine',
  app: 'calendar',
  resource: 'events',
  operation: 'list',
}
expectType<FinePermission>(validFine)

// Note: Readonly property tests are covered by TypeScript's built-in type checking
// tsd doesn't have a clean way to test that assignments fail on readonly properties

// =============================================================================
// CoarsePermission Type Tests
// =============================================================================

// Positive: Valid CoarsePermission
const validCoarse: CoarsePermission = {
  type: 'coarse',
  app: 'calendar',
  resource: 'events',
  operation: 'read',
}
expectType<CoarsePermission>(validCoarse)

// Negative: Invalid operation for coarse permission - 'list' is not a valid CoarseOperation
expectNotAssignable<CoarsePermission>({
  type: 'coarse' as const,
  app: 'calendar',
  resource: 'events',
  operation: 'list',
})

// =============================================================================
// WildcardPermission Type Tests
// =============================================================================

// Positive: Various valid wildcard forms
const wildcardResource: WildcardPermission = {
  type: 'wildcard',
  app: 'calendar',
  resource: '*',
  operation: 'read',
}
expectType<WildcardPermission>(wildcardResource)

const wildcardOperation: WildcardPermission = {
  type: 'wildcard',
  app: 'calendar',
  resource: 'events',
  operation: '*',
}
expectType<WildcardPermission>(wildcardOperation)

const wildcardBoth: WildcardPermission = {
  type: 'wildcard',
  app: 'calendar',
  resource: '*',
  operation: '*',
}
expectType<WildcardPermission>(wildcardBoth)

// =============================================================================
// ApiKeyPayload Type Tests
// =============================================================================

// Positive: Valid payload
const validPayload: ApiKeyPayload = {
  iss: 'macts',
  sub: 'key_123',
  iat: 1234567890,
  permissions: ['calendar:events:list'],
}
expectType<ApiKeyPayload>(validPayload)

// Positive: With optional fields
const payloadWithOptionals: ApiKeyPayload = {
  iss: 'macts',
  sub: 'key_123',
  iat: 1234567890,
  exp: 1234567890,
  permissions: ['calendar:events:list'],
  name: 'Test Key',
}
expectType<ApiKeyPayload>(payloadWithOptionals)

// Negative: Wrong issuer literal - iss must be exactly 'macts'
expectNotAssignable<ApiKeyPayload>({
  iss: 'other',
  sub: 'key_123',
  iat: 1234567890,
  permissions: [],
})

// =============================================================================
// ApiKeyMetadata Type Tests
// =============================================================================

// Positive: Valid metadata
const validMetadata: ApiKeyMetadata = {
  id: 'key_123',
  name: 'Test Key',
  permissions: ['calendar:events:list'],
  originalPermissions: ['calendar:events:read'],
  createdAt: new Date(),
  revoked: false,
  keyPrefix: 'macts_sk_',
}
expectType<ApiKeyMetadata>(validMetadata)

// Positive: With optional expiresAt
const metadataWithExpiry: ApiKeyMetadata = {
  id: 'key_123',
  name: 'Test Key',
  permissions: ['calendar:events:list'],
  originalPermissions: ['calendar:events:read'],
  createdAt: new Date(),
  expiresAt: new Date(),
  revoked: false,
  keyPrefix: 'macts_sk_',
}
expectType<ApiKeyMetadata>(metadataWithExpiry)

// expiresAt can be explicitly undefined
const metadataExplicitUndefined: ApiKeyMetadata = {
  id: 'key_123',
  name: 'Test Key',
  permissions: [],
  originalPermissions: [],
  createdAt: new Date(),
  expiresAt: undefined,
  revoked: false,
  keyPrefix: 'macts_sk_',
}
expectType<ApiKeyMetadata>(metadataExplicitUndefined)

// =============================================================================
// ApiKeyValidationResult Type Tests
// =============================================================================

// Positive: Valid result
const validResult: ApiKeyValidationResult = {
  valid: true,
  payload: validPayload,
}
expectAssignable<ApiKeyValidationResult>(validResult)

// Positive: Invalid result with error
const invalidResult: ApiKeyValidationResult = {
  valid: false,
  error: 'Token expired',
  errorCode: 'EXPIRED',
}
expectAssignable<ApiKeyValidationResult>(invalidResult)

// Discriminated union narrowing on `valid`
declare const validationResult: ApiKeyValidationResult

if (validationResult.valid) {
  expectType<true>(validationResult.valid)
  expectType<ApiKeyPayload>(validationResult.payload)
} else {
  expectType<false>(validationResult.valid)
  expectType<string>(validationResult.error)
  expectType<ApiKeyValidationErrorCode>(validationResult.errorCode)
}

// Negative: success arm requires payload
expectNotAssignable<ApiKeyValidationResult>({ valid: true as const })

// Negative: failure arm requires error and errorCode
expectNotAssignable<ApiKeyValidationResult>({ valid: false as const })
expectNotAssignable<ApiKeyValidationResult>({
  valid: false as const,
  error: 'Token expired',
})

// Negative: unknown error code is rejected
expectNotAssignable<ApiKeyValidationResult>({
  valid: false as const,
  error: 'nope',
  errorCode: 'UNKNOWN_CODE',
})

// Test all error codes are assignable
expectAssignable<ApiKeyValidationErrorCode>('INVALID_FORMAT')
expectAssignable<ApiKeyValidationErrorCode>('INVALID_SIGNATURE')
expectAssignable<ApiKeyValidationErrorCode>('EXPIRED')
expectAssignable<ApiKeyValidationErrorCode>('REVOKED')
expectAssignable<ApiKeyValidationErrorCode>('MALFORMED_PAYLOAD')
expectNotAssignable<ApiKeyValidationErrorCode>(undefined)

// =============================================================================
// PermissionCheckResult Type Tests
// =============================================================================

// Positive: Granted result
const grantedResult: PermissionCheckResult = {
  granted: true,
  required: 'calendar:events:list',
  matchedBy: 'calendar:*:read',
}
expectType<PermissionCheckResult>(grantedResult)

// Positive: Denied result with hint
const deniedResult: PermissionCheckResult = {
  granted: false,
  required: 'calendar:events:list',
  hint: 'Missing required permission',
}
expectType<PermissionCheckResult>(deniedResult)

// Positive: Denied result with changelog
const deniedWithChangelog: PermissionCheckResult = {
  granted: false,
  required: 'calendar:events:write',
  hint: 'Permission changed',
  changelog: {
    version: '1.2.0',
    previousPermission: 'calendar:events:show',
    reason: 'show now modifies view state',
  },
}
expectType<PermissionCheckResult>(deniedWithChangelog)

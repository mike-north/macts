/**
 * Type tests for the key store's update surface.
 *
 * A key's permissions and expiry are carried by its signed token, so the only
 * stored field a caller may change is the name. These tests pin that contract
 * at compile time; `storage.test.ts` covers the runtime guard for callers that
 * are not type-checked.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { ApiKeyMetadata, KeyMetadataUpdate } from './index.js'
import { updateKeyMetadata } from './index.js'

/** The update parameter as the public function declares it. */
type UpdateParameter = Parameters<typeof updateKeyMetadata>[1]

// =============================================================================
// Positive: renaming
// =============================================================================

expectType<KeyMetadataUpdate>({} as UpdateParameter)
expectType<ApiKeyMetadata | undefined>(updateKeyMetadata('key_a', { name: 'Renamed' }))
expectType<ApiKeyMetadata | undefined>(updateKeyMetadata('key_a', {}))
expectAssignable<UpdateParameter>({ name: 'Renamed' })
expectAssignable<UpdateParameter>({})

// =============================================================================
// Negative: the grant cannot be updated
// =============================================================================

// `name` is the only field, so no other field can appear in an update, with or
// without a name beside it.
expectType<'name'>({} as keyof UpdateParameter)

expectNotAssignable<UpdateParameter>({ permissions: ['calendar:*:*'] })
expectNotAssignable<UpdateParameter>({ originalPermissions: ['calendar:*:*'] })
expectNotAssignable<UpdateParameter>({ expiresAt: new Date('2099-01-01T00:00:00Z') })

// Revocation is `revokeKey`, and the issue record's other fields never change.
expectNotAssignable<UpdateParameter>({ revoked: true })
expectNotAssignable<UpdateParameter>({ createdAt: new Date('2020-01-01T00:00:00Z') })
expectNotAssignable<UpdateParameter>({ keyPrefix: 'other...' })

// The name must be a string.
expectNotAssignable<UpdateParameter>({ name: 42 })

/**
 * Type tests for API key types.
 *
 * These tests verify compile-time type correctness using tsd.
 * They complement runtime tests in types.test.ts.
 */

import { expectType, expectAssignable, expectNotAssignable } from 'tsd'
import type {
  CreateApiKeyOptions,
  CreateApiKeyResult,
  ListApiKeysOptions,
  DurationString,
} from './types.js'

// =============================================================================
// DurationString Template Literal Type Tests
// =============================================================================

// Positive: Valid duration strings are assignable
expectAssignable<DurationString>('30s')
expectAssignable<DurationString>('5m')
expectAssignable<DurationString>('1h')
expectAssignable<DurationString>('7d')
expectAssignable<DurationString>('2w')
expectAssignable<DurationString>('6M')
expectAssignable<DurationString>('1y')
expectAssignable<DurationString>('30d')
expectAssignable<DurationString>('365d')
expectAssignable<DurationString>('100h')

// Negative: Invalid duration strings
expectNotAssignable<DurationString>('30') // Missing unit
expectNotAssignable<DurationString>('d') // Missing number
expectNotAssignable<DurationString>('30x') // Invalid unit

// =============================================================================
// CreateApiKeyOptions Type Tests
// =============================================================================

// Positive: Minimal valid options
const minimalOptions: CreateApiKeyOptions = {
  name: 'Test Key',
  permissions: ['calendar:events:list'],
}
expectType<CreateApiKeyOptions>(minimalOptions)

// Positive: With Date expiration
const withDateExpiry: CreateApiKeyOptions = {
  name: 'Test Key',
  permissions: ['calendar:events:list'],
  expires: new Date(),
}
expectType<CreateApiKeyOptions>(withDateExpiry)

// Positive: With number (Unix timestamp) expiration
const withTimestampExpiry: CreateApiKeyOptions = {
  name: 'Test Key',
  permissions: ['calendar:events:list'],
  expires: 1234567890,
}
expectType<CreateApiKeyOptions>(withTimestampExpiry)

// Positive: With string (duration) expiration
const withDurationExpiry: CreateApiKeyOptions = {
  name: 'Test Key',
  permissions: ['calendar:events:list'],
  expires: '30d',
}
expectType<CreateApiKeyOptions>(withDurationExpiry)

// =============================================================================
// CreateApiKeyResult Type Tests
// =============================================================================

declare const result: CreateApiKeyResult

// All fields are required and properly typed
expectType<string>(result.token)
expectType<string>(result.keyId)
expectType<import('@macts/core').ApiKeyMetadata>(result.metadata)

// =============================================================================
// ListApiKeysOptions Type Tests
// =============================================================================

// Positive: Empty options (all optional)
const emptyListOptions: ListApiKeysOptions = {}
expectType<ListApiKeysOptions>(emptyListOptions)

// Positive: With includeRevoked
const withIncludeRevoked: ListApiKeysOptions = {
  includeRevoked: true,
}
expectType<ListApiKeysOptions>(withIncludeRevoked)

// Positive: With namePattern
const withNamePattern: ListApiKeysOptions = {
  namePattern: 'test*',
}
expectType<ListApiKeysOptions>(withNamePattern)

// Positive: With all options
const fullListOptions: ListApiKeysOptions = {
  includeRevoked: false,
  namePattern: 'production-*',
}
expectType<ListApiKeysOptions>(fullListOptions)

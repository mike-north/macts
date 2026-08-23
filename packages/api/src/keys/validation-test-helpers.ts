/**
 * Shared test assertion helpers for API key validation results.
 *
 * These narrow the `ApiKeyValidationResult` discriminated union so tests can
 * access `payload` (success) or `error`/`errorCode` (failure) directly.
 */

import { expect } from 'vitest'
import type {
  ApiKeyValidationResult,
  ApiKeyValidationSuccess,
  ApiKeyValidationFailure,
} from '@macts/core'

/**
 * Assert that a validation result is successful, narrowing to the success arm.
 */
export function assertValidationSuccess(
  result: ApiKeyValidationResult
): asserts result is ApiKeyValidationSuccess {
  expect(result.valid).toBe(true)
}

/**
 * Assert that a validation result is a failure, narrowing to the failure arm.
 */
export function assertValidationFailure(
  result: ApiKeyValidationResult
): asserts result is ApiKeyValidationFailure {
  expect(result.valid).toBe(false)
}

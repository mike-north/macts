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
  // Guard against ill-typed mocks that claim success without a payload.
  if (result.valid) {
    expect(result.payload).toBeDefined()
  }
}

/**
 * Assert that a validation result is a failure, narrowing to the failure arm.
 */
export function assertValidationFailure(
  result: ApiKeyValidationResult
): asserts result is ApiKeyValidationFailure {
  expect(result.valid).toBe(false)
  // Guard against ill-typed mocks that claim failure without error details.
  if (!result.valid) {
    expect(result.error).toBeTruthy()
    expect(result.errorCode).toBeTruthy()
  }
}

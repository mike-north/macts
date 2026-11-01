/**
 * Type tests for the structured error family.
 *
 * Switching on `code` narrows to the class and its details; the registry
 * covers every wire code and excludes the client-only transport failure.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import {
  ERROR_CLASSES,
  MactsError,
  RateLimitedError,
  TargetNotFoundError,
  TransportError,
  ValidationError,
  type AnyMactsError,
  type ApprovalRejectionState,
  type NoDetails,
  type PolicyLayerName,
  type ErrorCode,
  type ValidationIssue,
  type WireError,
  type WireErrorCode,
} from '../index.js'

declare const error: AnyMactsError

// Switching on the code narrows class and details.
switch (error.code) {
  case 'VALIDATION_FAILED':
    expectType<ValidationError>(error)
    expectType<readonly ValidationIssue[]>(error.details.issues)
    break
  case 'PERMISSION_DENIED':
    expectType<string>(error.details.required)
    break
  case 'RATE_LIMITED':
    expectType<RateLimitedError>(error)
    expectType<number>(error.details.retryAfterSeconds)
    break
  case 'TRANSPORT_FAILED':
    expectType<TransportError>(error)
    break
  default:
    break
}

// Every class is a MactsError and an Error.
expectAssignable<MactsError>(new TargetNotFoundError('missing', {}))
expectAssignable<Error>(new TargetNotFoundError('missing', {}))

// Code literals are fixed per class.
expectType<'TARGET_NOT_FOUND'>(new TargetNotFoundError('missing', {}).code)

// The transport failure is client-only: not a wire code, not in the registry.
expectNotAssignable<WireErrorCode>('TRANSPORT_FAILED')
expectAssignable<ErrorCode>('TRANSPORT_FAILED')
expectType<WireErrorCode>(null as unknown as keyof typeof ERROR_CLASSES)

// The registry constructs the class of its own code.
expectType<ValidationError>(new ERROR_CLASSES.VALIDATION_FAILED('bad', { issues: [] }))

// Wire errors pair each code with its own details.
expectAssignable<WireError>({
  code: 'TARGET_NOT_FOUND',
  message: 'No such event',
  details: { resource: 'events' },
})
expectNotAssignable<WireError>({
  code: 'TARGET_NOT_FOUND',
  message: 'mismatched details',
  details: { issues: [] },
})
expectNotAssignable<WireError>({
  code: 'TRANSPORT_FAILED',
  message: 'never sent by a service',
  details: { reason: 'unreachable' },
})

// Reconstruction relies on the wire code narrowing the details to that code's
// own shape.
declare const wireError: WireError
switch (wireError.code) {
  case 'APPROVAL_REJECTED':
    expectType<string>(wireError.details.permission)
    expectType<PolicyLayerName>(wireError.details.layer)
    expectType<ApprovalRejectionState>(wireError.details.state)
    break
  case 'APP_UNAVAILABLE':
    expectType<'not-installed' | 'not-responding'>(wireError.details.reason)
    break
  case 'TIMEOUT':
    expectType<number>(wireError.details.timeoutMs)
    break
  case 'UNEXPECTED_VALUE':
    expectType<readonly ValidationIssue[]>(wireError.details.issues)
    break
  case 'CANCELLED':
    expectType<NoDetails>(wireError.details)
    break
  default:
    expectNotAssignable<'TRANSPORT_FAILED'>(wireError.code)
    break
}

// Edge: optional details may be omitted, and details-free codes take an empty
// object.
expectAssignable<WireError>({ code: 'TARGET_NOT_FOUND', message: 'gone', details: {} })
expectAssignable<WireError>({ code: 'CANCELLED', message: 'aborted', details: {} })
expectNotAssignable<WireError>({
  code: 'CANCELLED',
  message: 'aborted',
  details: { reason: 'caller' },
})

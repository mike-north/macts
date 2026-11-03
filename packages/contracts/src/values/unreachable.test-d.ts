/**
 * Type tests for `UnreachableError`.
 *
 * Its constructor accepts only `never`, so passing the switched-on value from
 * a `default` branch compiles exactly when every member of a closed union has
 * been handled. The cases cover a local union and the closed unions this
 * package exports.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectNotAssignable, expectType } from 'tsd'
import {
  UnreachableError,
  type ErrorCode,
  type SpecialDoubleState,
  type ValuePlanKind,
} from '../index.js'

type UnreachableValue = ConstructorParameters<typeof UnreachableError>[0]

// The value parameter is exactly `never`.
expectType<never>(null as unknown as UnreachableValue)

type Status = 'confirmed' | 'tentative' | 'cancelled'

// Positive: an exhaustive switch narrows the default branch to `never`, which
// the constructor accepts.
export function isActive(status: Status): boolean {
  switch (status) {
    case 'confirmed':
    case 'tentative':
      return true
    case 'cancelled':
      return false
    default:
      throw new UnreachableError(status, 'event status')
  }
}

// Negative: when a member is left unhandled, the residual reaching `default`
// is that member, which the constructor rejects.
export function isConfirmed(status: Status): boolean {
  switch (status) {
    case 'confirmed':
      return true
    case 'tentative':
      return false
    default:
      expectType<'cancelled'>(status)
      expectNotAssignable<UnreachableValue>(status)
      return false
  }
}

// Edge: a widened string can never be proven unreachable.
expectNotAssignable<UnreachableValue>('confirmed' as string)

// The error exposes the offending value for diagnosis.
expectType<unknown>(new UnreachableError(null as never).value)

// Exhaustiveness over closed unions this package exports. Each positive switch
// handles every member; each negative leaves one out and shows that the
// residual is rejected. Adding a member to one of these unions makes the
// positive switch fail to compile, which is the guarantee consumers rely on.

export function describeCode(code: ErrorCode): string {
  switch (code) {
    case 'VALIDATION_FAILED':
    case 'UNEXPECTED_VALUE':
    case 'UNAUTHENTICATED':
    case 'RATE_LIMITED':
    case 'PERMISSION_DENIED':
    case 'POLICY_DENIED':
    case 'APPROVAL_PENDING':
    case 'APPROVAL_REJECTED':
    case 'TARGET_NOT_FOUND':
    case 'FILE_NOT_FOUND':
    case 'INVALID_SELECTION':
    case 'COLLECTION_CHANGED':
    case 'APP_UNAVAILABLE':
    case 'APP_AUTHORIZATION_REQUIRED':
    case 'APP_OPERATION_FAILED':
    case 'TIMEOUT':
    case 'CANCELLED':
    case 'TRANSFER_FAILED':
    case 'INTERNAL':
    case 'TRANSPORT_FAILED':
      return code
    default:
      throw new UnreachableError(code, 'error code')
  }
}

export function isClientOnly(code: ErrorCode): boolean {
  switch (code) {
    case 'TRANSPORT_FAILED':
      return true
    case 'VALIDATION_FAILED':
    case 'UNEXPECTED_VALUE':
    case 'UNAUTHENTICATED':
    case 'RATE_LIMITED':
    case 'PERMISSION_DENIED':
    case 'POLICY_DENIED':
    case 'APPROVAL_PENDING':
    case 'APPROVAL_REJECTED':
    case 'TARGET_NOT_FOUND':
    case 'FILE_NOT_FOUND':
    case 'INVALID_SELECTION':
    case 'COLLECTION_CHANGED':
    case 'APP_UNAVAILABLE':
    case 'APP_AUTHORIZATION_REQUIRED':
    case 'APP_OPERATION_FAILED':
    case 'TIMEOUT':
    case 'CANCELLED':
    case 'TRANSFER_FAILED':
      return false
    default:
      // `INTERNAL` is unhandled, so it is the residual and is rejected.
      expectType<'INTERNAL'>(code)
      expectNotAssignable<UnreachableValue>(code)
      return false
  }
}

export function isLeaf(kind: ValuePlanKind): boolean {
  switch (kind) {
    case 'string':
    case 'boolean':
    case 'integer':
    case 'double':
    case 'date':
    case 'point':
    case 'rectangle':
    case 'rgb':
    case 'enum':
    case 'reference':
    case 'file':
    case 'file-source':
    case 'unknown':
    case 'none':
    case 'passthrough':
      return true
    case 'array':
    case 'record':
    case 'nullable':
      return false
    default:
      throw new UnreachableError(kind, 'value plan kind')
  }
}

export function isComposite(kind: ValuePlanKind): boolean {
  switch (kind) {
    case 'array':
    case 'record':
    case 'nullable':
      return true
    case 'string':
    case 'boolean':
    case 'integer':
    case 'double':
    case 'date':
    case 'point':
    case 'rectangle':
    case 'rgb':
    case 'enum':
    case 'reference':
    case 'file':
    case 'file-source':
    case 'unknown':
    case 'none':
      return false
    default:
      // `passthrough` is unhandled, so it is the residual and is rejected.
      expectType<'passthrough'>(kind)
      expectNotAssignable<UnreachableValue>(kind)
      return false
  }
}

export function toNumber(state: SpecialDoubleState): number {
  switch (state) {
    case 'NaN':
      return Number.NaN
    case 'Infinity':
      return Number.POSITIVE_INFINITY
    case '-Infinity':
      return Number.NEGATIVE_INFINITY
    case '-0':
      return -0
    default:
      throw new UnreachableError(state, 'special double state')
  }
}

export function isInfinite(state: SpecialDoubleState): boolean {
  switch (state) {
    case 'Infinity':
    case '-Infinity':
      return true
    case 'NaN':
      return false
    default:
      // `-0` is unhandled, so it is the residual and is rejected.
      expectType<'-0'>(state)
      expectNotAssignable<UnreachableValue>(state)
      return false
  }
}

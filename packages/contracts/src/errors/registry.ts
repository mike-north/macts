/**
 * The registry from wire error code to canonical class.
 *
 * Remote reconstruction looks classes up here, which is what makes a decoded
 * error the same class a local invocation would have thrown. The registry's
 * type requires an entry for every wire code, so adding a code without a class
 * is a compile error.
 *
 * @packageDocumentation
 */

import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  ApprovalPendingError,
  ApprovalRejectedError,
  AuthenticationError,
  FileNotFoundError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  PermissionDeniedError,
  PolicyDeniedError,
  TargetNotFoundError,
  TransferError,
  UnexpectedValueError,
  ValidationError,
  type MactsErrorByCode,
} from './classes.js'
import type { ErrorCode, ErrorDetailsByCode, WireErrorCode } from './details.js'

/** Constructor of the canonical class for code `C`. */
export type MactsErrorConstructor<C extends ErrorCode> = new (
  message: string,
  details: ErrorDetailsByCode[C],
  options?: ErrorOptions
) => MactsErrorByCode[C]

/** Canonical class for every code a service may send. */
export const ERROR_CLASSES: { readonly [C in WireErrorCode]: MactsErrorConstructor<C> } =
  Object.freeze({
    VALIDATION_FAILED: ValidationError,
    UNEXPECTED_VALUE: UnexpectedValueError,
    UNAUTHENTICATED: AuthenticationError,
    PERMISSION_DENIED: PermissionDeniedError,
    POLICY_DENIED: PolicyDeniedError,
    APPROVAL_PENDING: ApprovalPendingError,
    APPROVAL_REJECTED: ApprovalRejectedError,
    TARGET_NOT_FOUND: TargetNotFoundError,
    FILE_NOT_FOUND: FileNotFoundError,
    INVALID_SELECTION: InvalidSelectionError,
    APP_UNAVAILABLE: AppUnavailableError,
    APP_AUTHORIZATION_REQUIRED: AppAuthorizationRequiredError,
    APP_OPERATION_FAILED: AppOperationError,
    TIMEOUT: OperationTimeoutError,
    CANCELLED: OperationCancelledError,
    TRANSFER_FAILED: TransferError,
    INTERNAL: InternalError,
  })

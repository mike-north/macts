/**
 * The canonical structured error classes.
 *
 * These classes are declared here and nowhere else. Every entry point (the
 * remote client, the local client, adapters) throws and re-exports these same
 * bindings, and the remote client reconstructs them from the wire, so `catch`,
 * `instanceof`, `code`, and `details` behave identically in both localities.
 * Packages must not declare parallel or subclassed copies.
 *
 * @packageDocumentation
 */

import type { ErrorCode, ErrorDetailsByCode } from './details.js'

/**
 * Base of every structured macts failure.
 *
 * @remarks
 * `code` identifies the failure category and narrows `details` when switching
 * over {@link AnyMactsError}. `cause` is retained locally for diagnosis and is
 * never serialized.
 */
export abstract class MactsError<C extends ErrorCode = ErrorCode> extends Error {
  /** The failure category. */
  abstract readonly code: C
  /** Structured, serializable facts about the failure. */
  readonly details: ErrorDetailsByCode[C]

  /**
   * @param message - Human-readable description. Never includes credentials.
   * @param details - Structured details for this code.
   * @param options - Standard error options; `cause` stays local.
   */
  constructor(message: string, details: ErrorDetailsByCode[C], options?: ErrorOptions) {
    super(message, options)
    this.details = details
  }
}

/** Caller input violated the operation contract; nothing was executed. */
export class ValidationError extends MactsError<'VALIDATION_FAILED'> {
  override readonly code = 'VALIDATION_FAILED'
  override readonly name = 'ValidationError'
}

/**
 * An app result violated the operation contract, for example an enum member
 * this SDK does not know or an integer outside the supported domain.
 */
export class UnexpectedValueError extends MactsError<'UNEXPECTED_VALUE'> {
  override readonly code = 'UNEXPECTED_VALUE'
  override readonly name = 'UnexpectedValueError'
}

/** The credential was missing or could not establish authority. */
export class AuthenticationError extends MactsError<'UNAUTHENTICATED'> {
  override readonly code = 'UNAUTHENTICATED'
  override readonly name = 'AuthenticationError'
}

/** The authority lacks the permission the operation requires. */
export class PermissionDeniedError extends MactsError<'PERMISSION_DENIED'> {
  override readonly code = 'PERMISSION_DENIED'
  override readonly name = 'PermissionDeniedError'
}

/** Governance policy forbids the call. */
export class PolicyDeniedError extends MactsError<'POLICY_DENIED'> {
  override readonly code = 'POLICY_DENIED'
  override readonly name = 'PolicyDeniedError'
}

/** The call requires confirmation and nobody is configured to decide; it did not run. */
export class ApprovalPendingError extends MactsError<'APPROVAL_PENDING'> {
  override readonly code = 'APPROVAL_PENDING'
  override readonly name = 'ApprovalPendingError'
}

/** The call was put to a person and not approved; it did not run. */
export class ApprovalRejectedError extends MactsError<'APPROVAL_REJECTED'> {
  override readonly code = 'APPROVAL_REJECTED'
  override readonly name = 'ApprovalRejectedError'
}

/** A singular target does not exist. Distinct from permission denial. */
export class TargetNotFoundError extends MactsError<'TARGET_NOT_FOUND'> {
  override readonly code = 'TARGET_NOT_FOUND'
  override readonly name = 'TargetNotFoundError'
}

/** A referenced file does not exist or has disappeared. */
export class FileNotFoundError extends MactsError<'FILE_NOT_FOUND'> {
  override readonly code = 'FILE_NOT_FOUND'
  override readonly name = 'FileNotFoundError'
}

/** A range or index selection is invalid for its collection. Never reported as an empty result. */
export class InvalidSelectionError extends MactsError<'INVALID_SELECTION'> {
  override readonly code = 'INVALID_SELECTION'
  override readonly name = 'InvalidSelectionError'
}

/** The app is not installed or is not responding. */
export class AppUnavailableError extends MactsError<'APP_UNAVAILABLE'> {
  override readonly code = 'APP_UNAVAILABLE'
  override readonly name = 'AppUnavailableError'
}

/**
 * The operating system has not authorized automating the app. Distinct from
 * macts permission denial: the fix is granting automation access on the Mac.
 */
export class AppAuthorizationRequiredError extends MactsError<'APP_AUTHORIZATION_REQUIRED'> {
  override readonly code = 'APP_AUTHORIZATION_REQUIRED'
  override readonly name = 'AppAuthorizationRequiredError'
}

/** The app reported a failure that no more specific class describes. */
export class AppOperationError extends MactsError<'APP_OPERATION_FAILED'> {
  override readonly code = 'APP_OPERATION_FAILED'
  override readonly name = 'AppOperationError'
}

/** The operation exceeded its time budget. Whether the app completed it is unknown. */
export class OperationTimeoutError extends MactsError<'TIMEOUT'> {
  override readonly code = 'TIMEOUT'
  override readonly name = 'OperationTimeoutError'
}

/** The caller aborted the operation. */
export class OperationCancelledError extends MactsError<'CANCELLED'> {
  override readonly code = 'CANCELLED'
  override readonly name = 'OperationCancelledError'
}

/** A transfer expired, was incomplete, exceeded its size limit, or is unknown. */
export class TransferError extends MactsError<'TRANSFER_FAILED'> {
  override readonly code = 'TRANSFER_FAILED'
  override readonly name = 'TransferError'
}

/** An unexpected failure inside macts. The message is sanitized. */
export class InternalError extends MactsError<'INTERNAL'> {
  override readonly code = 'INTERNAL'
  override readonly name = 'InternalError'
}

/**
 * The client could not obtain a usable response from the service: it was
 * unreachable, answered with something that is not a valid response, or speaks
 * a different protocol version. Raised only by clients.
 */
export class TransportError extends MactsError<'TRANSPORT_FAILED'> {
  override readonly code = 'TRANSPORT_FAILED'
  override readonly name = 'TransportError'
}

/** Each code's class. */
export interface MactsErrorByCode {
  readonly VALIDATION_FAILED: ValidationError
  readonly UNEXPECTED_VALUE: UnexpectedValueError
  readonly UNAUTHENTICATED: AuthenticationError
  readonly PERMISSION_DENIED: PermissionDeniedError
  readonly POLICY_DENIED: PolicyDeniedError
  readonly APPROVAL_PENDING: ApprovalPendingError
  readonly APPROVAL_REJECTED: ApprovalRejectedError
  readonly TARGET_NOT_FOUND: TargetNotFoundError
  readonly FILE_NOT_FOUND: FileNotFoundError
  readonly INVALID_SELECTION: InvalidSelectionError
  readonly APP_UNAVAILABLE: AppUnavailableError
  readonly APP_AUTHORIZATION_REQUIRED: AppAuthorizationRequiredError
  readonly APP_OPERATION_FAILED: AppOperationError
  readonly TIMEOUT: OperationTimeoutError
  readonly CANCELLED: OperationCancelledError
  readonly TRANSFER_FAILED: TransferError
  readonly INTERNAL: InternalError
  readonly TRANSPORT_FAILED: TransportError
}

/**
 * Any structured error. Switching on `code` narrows to the class and its
 * `details`.
 */
export type AnyMactsError = MactsErrorByCode[ErrorCode]

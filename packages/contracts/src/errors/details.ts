/**
 * Error codes and the structured details each code carries.
 *
 * {@link ErrorDetailsByCode} is the single table from which the code union, the
 * per-class `details` types, and the wire envelope are derived. Details are
 * protocol metadata: strings, booleans, and small integers that JSON carries
 * exactly. They never contain credentials, signed URLs, or bytes, and they use
 * consumer vocabulary rather than native automation terminology.
 *
 * @packageDocumentation
 */

import type { ValidationIssue } from '../issues.js'

/**
 * A governance policy layer: the machine-wide host policy, or the narrower
 * policy attached to the authenticated key. Same vocabulary as the governance
 * policy layers.
 */
export type PolicyLayerName = 'host' | 'key'

/**
 * Why a held call was not approved: a person rejected it, or no decision
 * arrived in time. Same vocabulary as the governance approval denial states.
 */
export type ApprovalRejectionState = 'rejected' | 'timeout'

/** Why a credential could not establish authority. */
export type AuthenticationFailureReason =
  | 'missing'
  | 'malformed'
  | 'invalid'
  | 'expired'
  | 'revoked'

/** A permission rename that explains why a formerly sufficient grant no longer is. */
export interface PermissionChangelog {
  /** Version that introduced the current permission. */
  readonly version: string
  /** The permission that used to grant this operation. */
  readonly previousPermission: string
  /** Why the permission changed, when recorded. */
  readonly reason?: string
}

/** Details for codes that carry none. */
export type NoDetails = Readonly<Record<string, never>>

/**
 * Structured details by error code.
 *
 * @remarks
 * Adding a code here requires a class, a registry entry (unless it is
 * client-side only), and a decision-record entry.
 */
export interface ErrorDetailsByCode {
  /** Caller input violated the operation contract. */
  readonly VALIDATION_FAILED: { readonly issues: readonly ValidationIssue[] }
  /** An app result violated the operation contract. */
  readonly UNEXPECTED_VALUE: { readonly issues: readonly ValidationIssue[] }
  /** The credential was missing or could not establish authority. */
  readonly UNAUTHENTICATED: { readonly reason: AuthenticationFailureReason }
  /** The authority lacks the operation's permission. */
  readonly PERMISSION_DENIED: {
    readonly required: string
    readonly hint?: string
    readonly changelog?: PermissionChangelog
  }
  /** Governance policy forbids the call outright. */
  readonly POLICY_DENIED: { readonly permission: string; readonly layer: PolicyLayerName }
  /** The call is held for confirmation and nobody is configured to decide; it did not run. */
  readonly APPROVAL_PENDING: { readonly permission: string; readonly layer: PolicyLayerName }
  /** The call was held, put to a person, and not approved; it did not run. */
  readonly APPROVAL_REJECTED: {
    readonly permission: string
    readonly layer: PolicyLayerName
    readonly state: ApprovalRejectionState
  }
  /** A singular target does not exist. */
  readonly TARGET_NOT_FOUND: { readonly resource?: string }
  /** A referenced file does not exist or has disappeared. */
  readonly FILE_NOT_FOUND: { readonly path?: string }
  /** A range or index selection is invalid for the collection it addresses. */
  readonly INVALID_SELECTION: { readonly resource?: string }
  /** The app is not installed or is not responding. */
  readonly APP_UNAVAILABLE: {
    readonly app: string
    readonly reason: 'not-installed' | 'not-responding'
  }
  /** The operating system has not authorized automating the app. */
  readonly APP_AUTHORIZATION_REQUIRED: { readonly app: string }
  /** The app reported a failure that no more specific code describes. */
  readonly APP_OPERATION_FAILED: { readonly app: string; readonly appErrorCode?: number }
  /** The operation exceeded its time budget. */
  readonly TIMEOUT: { readonly timeoutMs: number }
  /** The caller aborted the operation. */
  readonly CANCELLED: NoDetails
  /** A transfer could not be used. */
  readonly TRANSFER_FAILED: {
    readonly reason: 'expired' | 'incomplete' | 'too-large' | 'unknown-transfer'
  }
  /** An unexpected failure inside macts; the message is sanitized. */
  readonly INTERNAL: { readonly correlationId?: string }
  /**
   * The client could not obtain a usable response from the service. Raised
   * only by clients; a service never sends it.
   */
  readonly TRANSPORT_FAILED: {
    readonly reason: 'unreachable' | 'invalid-response' | 'protocol-mismatch'
    readonly status?: number
    readonly receivedCode?: string
  }
}

/** Every structured error code. */
export type ErrorCode = keyof ErrorDetailsByCode

/** The codes a service may send on the wire: every code except client-only transport failure. */
export type WireErrorCode = Exclude<ErrorCode, 'TRANSPORT_FAILED'>

/**
 * Wire form of a structured error.
 *
 * @remarks
 * Clients choose the class to reconstruct from `code`, never from the HTTP
 * status. An unknown code, or details that fail their code's schema,
 * reconstruct as a transport failure with reason `'protocol-mismatch'`.
 */
export type WireError = {
  readonly [C in WireErrorCode]: {
    readonly code: C
    readonly message: string
    readonly details: ErrorDetailsByCode[C]
  }
}[WireErrorCode]

/** The body of an error response. */
export interface WireErrorEnvelope {
  /** The structured error. */
  readonly error: WireError
}

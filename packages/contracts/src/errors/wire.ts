/**
 * Wire codec for structured errors.
 *
 * A service encodes a {@link MactsError} into the `{ "error": { code, message,
 * details } }` envelope; a client decodes that envelope back into the canonical
 * class from the registry, so `instanceof`, `code`, and `details` match what a
 * local invocation would have thrown. The envelope is protocol metadata with
 * its own per-code schemas and is deliberately separate from the value codec.
 * It never carries `cause`, `stack`, credentials, signed URLs, or bytes.
 *
 * Decoding treats the body as untrusted. Anything that is not a well-formed
 * envelope for a known code becomes a client-side {@link TransportError} with
 * reason `'protocol-mismatch'`; it is never guessed into another class.
 *
 * See phases/13-sdk-value-and-execution-contracts.md (D6).
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import {
  TransportError,
  type AnyMactsError,
  type MactsError,
  type MactsErrorByCode,
} from './classes.js'
import type { ErrorDetailsByCode, WireError, WireErrorCode, WireErrorEnvelope } from './details.js'
import { ERROR_CLASSES } from './registry.js'

/** Longest `receivedCode` kept on a protocol-mismatch, so hostile input cannot bloat an error. */
const MAX_RECEIVED_CODE_LENGTH = 64

/**
 * Wire schema of one `ValidationIssue` (declared in `issues.ts`): the path into
 * the offending value, a human-readable message, and an optional stable code.
 * Shared by the two codes whose details carry issues.
 */
const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  code: z.exactOptional(z.string()),
})

const issuesDetailsSchema = z.object({ issues: z.array(validationIssueSchema) })
const policyLayerSchema = z.enum(['host', 'key'])
const permissionLayerDetailsSchema = z.object({
  permission: z.string(),
  layer: policyLayerSchema,
})

/**
 * The details schema for every code a service may send.
 *
 * @remarks
 * Known fields are validated strictly (enums exactly as in
 * {@link ErrorDetailsByCode}; optional fields may be absent but never
 * `undefined`, matching the details types under `exactOptionalPropertyTypes`). Unknown extra keys are stripped rather than
 * rejected: a newer service may add informational fields without breaking older
 * clients, and stripping keeps unexpected data out of reconstructed errors. The
 * mapped type requires an entry per wire code, so a new code without a schema is
 * a compile error.
 */
export const WIRE_ERROR_DETAILS_SCHEMAS: {
  readonly [C in WireErrorCode]: z.ZodType<ErrorDetailsByCode[C]>
} = Object.freeze({
  VALIDATION_FAILED: issuesDetailsSchema,
  UNEXPECTED_VALUE: issuesDetailsSchema,
  UNAUTHENTICATED: z.object({
    reason: z.enum(['missing', 'malformed', 'invalid', 'expired', 'revoked']),
  }),
  RATE_LIMITED: z.object({ retryAfterSeconds: z.number().int().nonnegative() }),
  PERMISSION_DENIED: z.object({
    required: z.string(),
    hint: z.exactOptional(z.string()),
    changelog: z.exactOptional(
      z.object({
        version: z.string(),
        previousPermission: z.string(),
        reason: z.exactOptional(z.string()),
      })
    ),
  }),
  POLICY_DENIED: permissionLayerDetailsSchema,
  APPROVAL_PENDING: permissionLayerDetailsSchema,
  APPROVAL_REJECTED: z.object({
    permission: z.string(),
    layer: policyLayerSchema,
    state: z.enum(['rejected', 'timeout']),
  }),
  TARGET_NOT_FOUND: z.object({
    resource: z.exactOptional(z.string()),
    entryIndex: z.exactOptional(z.number().int().nonnegative()),
  }),
  FILE_NOT_FOUND: z.object({ path: z.exactOptional(z.string()) }),
  INVALID_SELECTION: z.object({ resource: z.exactOptional(z.string()) }),
  COLLECTION_CHANGED: z.object({}),
  APP_UNAVAILABLE: z.object({
    app: z.string(),
    reason: z.enum(['not-installed', 'not-responding']),
  }),
  APP_AUTHORIZATION_REQUIRED: z.object({ app: z.string() }),
  APP_OPERATION_FAILED: z.object({
    app: z.string(),
    appErrorCode: z.exactOptional(z.number()),
  }),
  TIMEOUT: z.object({ timeoutMs: z.number().int().nonnegative() }),
  CANCELLED: z.object({}),
  TRANSFER_FAILED: z.object({
    reason: z.enum(['expired', 'incomplete', 'too-large', 'unknown-transfer']),
  }),
  INTERNAL: z.object({ correlationId: z.exactOptional(z.string()) }),
})

/** Whether `code` names a code a service may send (an own key of the schema table). */
function isWireErrorCode(code: unknown): code is WireErrorCode {
  return typeof code === 'string' && Object.hasOwn(WIRE_ERROR_DETAILS_SCHEMAS, code)
}

/**
 * Encode a structured error for the wire.
 *
 * @remarks
 * Copies `code`, `message`, and `details` only; `cause` and `stack` stay local.
 * A {@link TransportError} is client-only and a service never sends it, so it
 * is rejected by the parameter type. Should one arrive through a cast anyway,
 * encoding throws a plain `TypeError` (not a macts error, which would itself
 * need encoding) rather than emitting a code no client accepts.
 *
 * @param error - A structured error whose code is a wire code.
 * @returns The wire form of the error.
 * @throws `TypeError` when the error's code is not a wire code or its details violate their schema.
 */
export function toWireError(error: MactsError<WireErrorCode>): WireError {
  if (!isWireErrorCode(error.code)) {
    throw new TypeError(`Error code ${String(error.code)} cannot be sent on the wire`)
  }
  // Details pass through the same schema a client applies, so only declared
  // fields leave the service: anything attached to `details` beyond its
  // contract (by a cast or a careless producer) is dropped, never disclosed.
  const parsed = WIRE_ERROR_DETAILS_SCHEMAS[error.code].safeParse(error.details)
  if (!parsed.success) {
    throw new TypeError(`Details of error code ${error.code} do not match their schema`)
  }
  // The union over codes is correlated with `details`; TypeScript cannot relate
  // the two fields of a generic MactsError to one WireError member, though the
  // schema table guarantees they agree.
  return { code: error.code, message: error.message, details: parsed.data } as WireError
}

/**
 * Encode a structured error as an error response body.
 *
 * @param error - A structured error whose code is a wire code.
 * @returns `{ error }` holding the wire form of the error.
 * @throws `TypeError` when the error's code is not a wire code or its details violate their schema.
 */
export function toWireErrorEnvelope(error: MactsError<WireErrorCode>): WireErrorEnvelope {
  return { error: toWireError(error) }
}

/** Optional facts the client knows about the response and may attach to a failure. */
export interface FromWireErrorOptions {
  /**
   * HTTP status of the response. Advisory only: it is recorded on a
   * protocol-mismatch failure and never influences which class is chosen.
   */
  readonly status?: number
}

/**
 * Build the client-side failure for a body that is not a well-formed envelope
 * for a known code. The message is a fixed description chosen by the caller and
 * never echoes received text; the received code, when it was a string, is kept
 * only in the bounded `receivedCode` field, and the advisory HTTP status only
 * in `status`.
 */
function protocolMismatch(
  message: string,
  options: FromWireErrorOptions | undefined,
  receivedCode: unknown
): TransportError {
  return new TransportError(message, {
    reason: 'protocol-mismatch',
    ...(options?.status === undefined ? {} : { status: options.status }),
    ...(typeof receivedCode === 'string'
      ? { receivedCode: receivedCode.slice(0, MAX_RECEIVED_CODE_LENGTH) }
      : {}),
  })
}

/**
 * Whether an untrusted value is a non-null, non-array object whose own keys can
 * be read. Used only to walk the envelope; field values are validated
 * separately.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Construct the canonical class for `code` from validated details.
 *
 * @returns The reconstructed error, or `undefined` exactly when `details` fail
 *   the code's schema; the caller turns that into a protocol mismatch.
 */
function reconstruct<C extends WireErrorCode>(
  code: C,
  message: string,
  details: unknown
): MactsErrorByCode[C] | undefined {
  const parsed = WIRE_ERROR_DETAILS_SCHEMAS[code].safeParse(details)
  if (!parsed.success) return undefined
  return new ERROR_CLASSES[code](message, parsed.data)
}

/**
 * Reconstruct the canonical error from an error response body.
 *
 * @remarks
 * The class comes from `body.error.code` through the registry, never from the
 * HTTP status. A body that is not an envelope, an unknown code, a non-string
 * message, or details that fail the code's schema yield a {@link TransportError}
 * with reason `'protocol-mismatch'`. `receivedCode` is attached only when the
 * received code was a string, truncated to a bounded length. The returned error
 * has no `cause`.
 *
 * @param body - The parsed response body; untrusted.
 * @param options - Response facts to record on a protocol mismatch.
 * @returns The reconstructed error.
 */
export function fromWireErrorEnvelope(
  body: unknown,
  options?: FromWireErrorOptions
): AnyMactsError {
  if (!isRecord(body) || !Object.hasOwn(body, 'error')) {
    return protocolMismatch('Response is not an error envelope', options, undefined)
  }
  const wire = body['error']
  if (!isRecord(wire)) {
    return protocolMismatch('Response error is not an object', options, undefined)
  }
  const code = Object.hasOwn(wire, 'code') ? wire['code'] : undefined
  if (!isWireErrorCode(code)) {
    return protocolMismatch('Response error has an unrecognized code', options, code)
  }
  const message = Object.hasOwn(wire, 'message') ? wire['message'] : undefined
  if (typeof message !== 'string') {
    return protocolMismatch('Response error message is missing or not a string', options, code)
  }
  const details = Object.hasOwn(wire, 'details') ? wire['details'] : undefined
  return (
    reconstruct(code, message, details) ??
    protocolMismatch('Response error details do not match their code', options, code)
  )
}

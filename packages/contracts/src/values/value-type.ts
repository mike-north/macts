/**
 * The contract of a single value: its SDK schema, wire schema, native plan,
 * and codecs.
 *
 * Generated code composes one value type per field, parameter, and result from
 * shared constructors. Every representation of that value (the SDK validator,
 * the wire validator from which HTTP and MCP JSON Schemas are derived, and the
 * plan the native codec follows) comes from that single composition, so no two
 * surfaces interpret a manifest type independently.
 *
 * Codecs report failure as data rather than by throwing. Only the runtime and
 * clients turn a failed result into a canonical error, which keeps error
 * construction (and therefore error class identity) in one place.
 *
 * @packageDocumentation
 */

import type { ZodType } from 'zod'
import type { FileValue, FileWire } from '../files/index.js'
import type { ValidationIssue } from '../issues.js'
import type { AnyReference, ReferenceWire } from '../references/index.js'
import type { ValuePlan } from './plan.js'
import type { WireValue } from './wire.js'

/**
 * Outcome of encoding or decoding a value.
 *
 * @remarks
 * A failure lists every issue found, each with its path inside the value.
 */
export type CodecResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] }

/**
 * What a client supplies when decoding wire values into SDK values.
 *
 * @remarks
 * References and file values are live objects bound to the client that decoded
 * them, so resolving or fetching follows that client's locality (local
 * runtime or remote service) without separate APIs.
 */
export interface DecodeContext {
  /** Produce a reference bound to the decoding client. */
  bindReference(reference: ReferenceWire): AnyReference<unknown>
  /** Produce a file value bound to the decoding client. */
  bindFile(file: FileWire): FileValue
}

/**
 * The full contract of one value.
 *
 * @typeParam Sdk - The value as SDK callers see it (numbers, `Date`, branded
 * integers, references, file values).
 */
export interface ValueType<Sdk> {
  /** Serializable shape that drives the native codec. */
  readonly plan: ValuePlan
  /** Validator for SDK values. */
  readonly sdk: ZodType<Sdk>
  /**
   * Validator for wire values. HTTP and MCP JSON Schemas are derived from it,
   * and the runtime validates raw requests against it.
   */
  readonly wire: ZodType<WireValue>
  /**
   * Convert an SDK value to wire form, validating it first.
   *
   * @remarks
   * Accepts `unknown` because runtime values can bypass static types (casts,
   * untyped callers); validation is what enforces the contract.
   */
  encode(value: unknown): CodecResult<WireValue>
  /** Convert a wire value to its SDK form, validating it first. */
  decode(wire: unknown, context: DecodeContext): CodecResult<Sdk>
}

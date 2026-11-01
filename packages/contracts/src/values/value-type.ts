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
import type { FileData, FileValue } from '../files/index.js'
import type { ValidationIssue } from '../issues.js'
import type {
  CollectionReferenceVariant,
  ObjectReferenceVariant,
  ReferenceData,
} from '../references/index.js'
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
 * runtime or remote service) without separate APIs. Binders receive decoded
 * data, never wire encodings: the value type has already validated the wire
 * form and decoded every nested value.
 */
export interface DecodeContext {
  /**
   * Produce a reference bound to the decoding client from its decoded data.
   *
   * @remarks
   * `reference` carries identifiers decoded through the app's resource table,
   * selector positions as `Integer`, and any containers (and identity
   * collection entries) as nested data. The result must be the bound form of
   * the same variant (same resource, form, and cardinality, with the same data
   * fields), with nested containers and entries bound as well, so that the
   * result is itself valid encode input.
   */
  bindReference(
    reference: ReferenceData
  ): ObjectReferenceVariant<unknown, unknown> | CollectionReferenceVariant<unknown, unknown>
  /**
   * Produce a file value bound to the decoding client from its decoded data.
   *
   * @remarks
   * The binder keeps `file.grant` private to the file value's `fetch`; it
   * must not appear on the result.
   */
  bindFile(file: FileData): FileValue
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

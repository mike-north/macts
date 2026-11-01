/**
 * Internal codec machinery shared by the value-type constructors.
 *
 * A {@link ValueType}'s public `encode` and `decode` take a whole value and
 * return a result. Composite types (arrays, records, nullable values) need
 * more: to report every issue in one pass, each with its full path, and to
 * word messages that name that path. This module gives every value type built
 * by the constructors a path-aware {@link Codec}, registered against the value
 * type so composites can reach it, and adapts any other `ValueType` (one not
 * built by {@link defineValueType}) through its public methods.
 *
 * An issue path always names where the offending value sits in the user's
 * data, in both directions: record keys and array indexes only. Wire-only
 * structure never appears in a path; in particular, the `record` envelope that
 * wraps a user record in dynamic wire content adds no segment. Paths reported
 * by the zod wire schemas describe the raw wire document instead, and may
 * differ inside dynamic content.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import type { ZodType } from 'zod'
import type { IssuePath, ValidationIssue } from '../issues.js'
import { describeReceived, issue, isPlainObject, quote } from './issue-helpers.js'
import type { ValuePlan } from './plan.js'
import type { CodecResult, DecodeContext, ValueType } from './value-type.js'
import type { WireValue } from './wire.js'

/**
 * Marks a value that failed its contract. A codec returns it only after
 * recording at least one issue, so callers can stop at the sentinel without
 * losing the reason.
 */
export const INVALID: unique symbol = Symbol('invalid value')

/** The type of {@link INVALID}. */
export type Invalid = typeof INVALID

/** Issues collected during one encode or decode pass. */
export type Issues = ValidationIssue[]

/** Path-aware encoder and decoder for one value type. */
export interface Codec<Sdk> {
  /** Encode `value`, located at `path`, recording every issue found. */
  encode(value: unknown, path: IssuePath, issues: Issues): WireValue | Invalid
  /** Decode `wire`, located at `path`, recording every issue found. */
  decode(wire: unknown, path: IssuePath, context: DecodeContext, issues: Issues): Sdk | Invalid
}

/** The codec of each value type built by {@link defineValueType}. */
const CODECS = new WeakMap<ValueType<unknown>, Codec<unknown>>()

/**
 * Assemble a value type from one composition: its plan, schemas, and codec all
 * come from the same constructor call. A `description` is attached to both
 * schemas.
 */
export function defineValueType<Sdk>(
  parts: {
    readonly plan: ValuePlan
    readonly sdk: ZodType<Sdk>
    readonly wire: ZodType<WireValue>
    readonly codec: Codec<Sdk>
  },
  description: string | undefined
): ValueType<Sdk> {
  const { codec } = parts
  const type: ValueType<Sdk> = Object.freeze({
    plan: deepFreeze(parts.plan),
    sdk: description === undefined ? parts.sdk : parts.sdk.describe(description),
    wire: description === undefined ? parts.wire : parts.wire.describe(description),
    encode(value: unknown): CodecResult<WireValue> {
      const issues: Issues = []
      return finish(codec.encode(value, [], issues), issues)
    },
    decode(wire: unknown, context: DecodeContext): CodecResult<Sdk> {
      const issues: Issues = []
      return finish(codec.decode(wire, [], context, issues), issues)
    },
  })
  CODECS.set(type, codec)
  return type
}

/**
 * The path-aware codec of `type`: its registered codec when it was built by
 * {@link defineValueType}, otherwise an adapter over its public methods that
 * prefixes the issues it reports with the current path.
 */
export function codecOf<Sdk>(type: ValueType<Sdk>): Codec<Sdk> {
  const registered = CODECS.get(type)
  // `defineValueType<Sdk>` is the only writer, and it registers each value
  // type with its own `Codec<Sdk>`, so the entry for `type` has the same `Sdk`.
  if (registered !== undefined) return registered as Codec<Sdk>
  return {
    encode(value, path, issues) {
      const result = type.encode(value)
      if (result.ok) return result.value
      for (const entry of result.issues) issues.push(prefixed(path, entry))
      return INVALID
    },
    decode(wire, path, context, issues) {
      const result = type.decode(wire, context)
      if (result.ok) return result.value
      for (const entry of result.issues) issues.push(prefixed(path, entry))
      return INVALID
    },
  }
}

function prefixed(path: IssuePath, entry: ValidationIssue): ValidationIssue {
  return path.length === 0 ? entry : { ...entry, path: [...path, ...entry.path] }
}

function finish<T>(value: T | Invalid, issues: Issues): CodecResult<T> {
  if (value !== INVALID && issues.length === 0) return { ok: true, value }
  if (issues.length === 0) {
    // A codec returned the sentinel without saying why; report that rather
    // than an unexplained failure.
    issues.push(issue([], 'invalid-type', 'The value does not satisfy its contract.'))
  }
  return { ok: false, issues: Object.freeze(issues) }
}

/**
 * Record a type mismatch: `not-nullable` when the value is `null` (so a
 * caller learns the field is not nullable rather than merely mistyped),
 * otherwise `invalid-type`.
 */
export function mismatch(
  value: unknown,
  path: IssuePath,
  issues: Issues,
  expected: string
): Invalid {
  issues.push(
    value === null
      ? issue(
          path,
          'not-nullable',
          `Expected ${expected}; received null, which is not allowed here.`
        )
      : issue(path, 'invalid-type', `Expected ${expected}; received ${describeReceived(value)}.`)
  )
  return INVALID
}

/**
 * Record a problem with a required field located at `path` (whose last
 * segment names the field): `missing-field` when it is absent (`undefined`),
 * otherwise a type mismatch as {@link mismatch} reports it.
 */
export function fieldMismatch(
  value: unknown,
  path: IssuePath,
  issues: Issues,
  expected: string
): Invalid {
  if (value !== undefined) return mismatch(value, path, issues, expected)
  const key = String(path[path.length - 1] ?? 'value')
  issues.push(
    issue(
      path,
      'missing-field',
      `The required field ${quote(key)} is missing; expected ${expected}.`
    )
  )
  return INVALID
}

/**
 * Read the payload of the single-key control record `key` at a typed
 * position, recording an issue when `wire` is not exactly that record.
 */
export function controlPayload(
  wire: unknown,
  key: string,
  path: IssuePath,
  issues: Issues,
  expected: string
): unknown {
  if (!isPlainObject(wire)) return mismatch(wire, path, issues, expected)
  const keys = Object.keys(wire)
  if (keys.length !== 1 || keys[0] !== key) {
    issues.push(
      issue(
        path,
        'invalid-control-record',
        `Expected ${expected}, an object with exactly the key "${key}"; received ${describeReceived(wire)}.`
      )
    )
    return INVALID
  }
  return wire[key]
}

/** Freeze a plan and every plan nested in it. Plans are plain JSON data. */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}

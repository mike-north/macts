/**
 * Internal zod schemas for SDK values, shared by every value-type constructor
 * that embeds an integer or a date in a larger SDK shape, or that validates a
 * handle-like SDK object (a reference or a file source).
 *
 * They state the SDK-side domain of each leaf once (the integer bounds that
 * apply at a position, and the years a date can carry on the wire), so that a
 * selector position or a file's observation time validates exactly as a
 * top-level integer or date does. They also state the SDK side of the
 * declared-fields rule (see `declared-fields`) once. This module is not part
 * of the package's public surface.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { Integer } from './integer.js'
import { EARLIEST_DATE_MS, LATEST_DATE_MS } from './wire-checks.js'

/** An SDK integer schema for `min..max` whose output carries the brand. */
export function integerSdkSchema(min: number, max: number) {
  return z
    .int()
    .min(min)
    .max(max)
    .transform((value) => Integer.validate(value))
}

/**
 * An SDK date schema: a valid `Date` whose UTC year is `0000..9999`, the
 * instants a wire date can carry.
 */
export function dateSdkSchema() {
  return z.date().min(new Date(EARLIEST_DATE_MS)).max(new Date(LATEST_DATE_MS))
}

/**
 * A function member of a handle-like SDK object, such as a bound reference's
 * `resolve`: the only kind of undeclared own property the SDK schemas admit.
 */
const SDK_FUNCTION_MEMBER = z.custom<(...args: never[]) => unknown>(
  (member) => typeof member === 'function',
  { error: 'Only the declared fields and function members are allowed here.' }
)

/**
 * An SDK schema for a handle-like object of `shape`, matching what encoding
 * accepts under the declared-fields rule: the declared fields are validated,
 * function members are allowed, and any other own enumerable property is
 * rejected. Prototype members and accessors are not own enumerable
 * properties, so class instances validate by their declared fields.
 */
export function sdkObject<Shape extends z.core.$ZodLooseShape>(shape: Shape) {
  return z.object(shape).catchall(SDK_FUNCTION_MEMBER)
}

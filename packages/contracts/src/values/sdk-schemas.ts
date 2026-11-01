/**
 * Internal zod schemas for SDK leaf values, shared by every value-type
 * constructor that embeds an integer or a date in a larger SDK shape.
 *
 * They state the SDK-side domain of each leaf once (the integer bounds that
 * apply at a position, and the years a date can carry on the wire), so that a
 * selector position or a file's observation time validates exactly as a
 * top-level integer or date does. This module is not part of the package's
 * public surface.
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

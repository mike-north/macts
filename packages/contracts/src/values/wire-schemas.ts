/**
 * Zod schemas for the wire control records.
 *
 * These schemas are the validators for raw wire values, and the source from
 * which HTTP and MCP JSON Schemas are derived, with
 * `z.toJSONSchema(schema, { target: 'draft-7' })`. Each control record is a
 * strict single-key object: any other key is rejected. What JSON Schema can
 * express (structure, the integer and date text patterns) is expressed
 * structurally; what it cannot (numeric range, calendar validity) is enforced
 * by refinements, which are omitted from the derived JSON Schema but always
 * applied when validating.
 *
 * Value types compose these schemas into the wire schema of each field,
 * parameter, and result, so every surface validates control records the same
 * way.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { INTEGER_LIMITS } from './integer.js'
import { DATE_TEXT_PATTERN, checkDateText, wireIntegerSchema } from './wire-checks.js'
import {
  SPECIAL_DOUBLE_STATES,
  type DynamicWireValue,
  type WireDate,
  type WireDouble,
  type WireInteger,
} from './wire.js'

/**
 * Schema for an integer control record, `{ "integer": "<decimal text>" }`.
 *
 * @remarks
 * The text must match `^(0|-?[1-9][0-9]*)$` (so `"-0"`, `"007"`, and `"+1"`
 * are rejected) and its value must lie within {@link INTEGER_LIMITS} (so
 * `"9007199254740992"` is rejected). Validating text never rounds it.
 */
export const WireIntegerSchema: z.ZodType<WireInteger> = wireIntegerSchema(
  INTEGER_LIMITS.min,
  INTEGER_LIMITS.max
)

/**
 * Schema for a double control record, `{ "double": <payload> }`.
 *
 * @remarks
 * The payload is a finite JSON number or one of the special states `"NaN"`,
 * `"Infinity"`, `"-Infinity"`, and `"-0"`. A non-finite number (such as an
 * overflowing literal that parses to `Infinity`) is rejected rather than
 * rounded. A JSON `-0` number is accepted, although encoders always emit the
 * `"-0"` state.
 */
export const WireDoubleSchema: z.ZodType<WireDouble> = z.strictObject({
  double: z.union([z.number(), z.literal(SPECIAL_DOUBLE_STATES)], {
    error:
      'A double payload must be a finite JSON number or one of "NaN", "Infinity", ' +
      '"-Infinity", or "-0".',
  }),
})

/**
 * Schema for a date control record, `{ "date": "<ISO 8601 text>" }`.
 *
 * @remarks
 * The text is `YYYY-MM-DDTHH:mm:ss.sss` with exactly three fractional digits,
 * followed by `Z` or `±HH:MM`, and must name a real instant: the day must
 * exist in its month, hours are `00..23`, minutes and seconds `00..59`, offset
 * hours `00..23`, and offset minutes `00..59`.
 */
export const WireDateSchema: z.ZodType<WireDate> = z.strictObject({
  date: z
    .string({
      error: 'A date payload must be ISO 8601 text, for example "2026-10-31T17:04:05.120Z".',
    })
    .regex(DATE_TEXT_PATTERN, {
      error: (iss) => (typeof iss.input === 'string' ? dateTextMessage(iss.input) : undefined),
    })
    .superRefine((text, ctx) => {
      if (!DATE_TEXT_PATTERN.test(text)) return
      const result = checkDateText(text)
      if (!result.ok) ctx.addIssue({ code: 'custom', message: result.message })
    }),
})

function dateTextMessage(text: string): string {
  const result = checkDateText(text)
  return result.ok ? 'Invalid date text.' : result.message
}

/**
 * The payload of a control record whose kind this version cannot accept in
 * dynamic content yet. It always fails with a message saying so, and its JSON
 * Schema (`not: {}`) admits nothing, so the derived schema never advertises the
 * kind as accepted.
 */
function unsupportedDynamicPayload(kind: string) {
  return z
    .unknown()
    .refine((_payload: unknown): _payload is never => false, {
      error: `${kind} in dynamic content are not supported yet.`,
    })
    .meta({ not: {} })
}

/**
 * Schema for a value in dynamic content (an `unknown` position), where no
 * contract describes the shape.
 *
 * @remarks
 * Strings, booleans, and `null` stand for themselves; arrays hold dynamic
 * values; every object is a control record: an integer, a double, a date, or
 * a `{ "record": { … } }` envelope around a user record whose values are
 * dynamic values in turn. A bare number or a bare user object is rejected.
 * References and file values are part of the dynamic wire form but are not
 * supported in dynamic content yet; they are rejected with an issue that says
 * so.
 */
export const DynamicWireValueSchema: z.ZodType<DynamicWireValue> = z.lazy(() =>
  z.union(
    [
      z.string(),
      z.boolean(),
      z.null(),
      z.array(DynamicWireValueSchema),
      WireIntegerSchema,
      WireDoubleSchema,
      WireDateSchema,
      z.strictObject({ record: z.record(z.string(), DynamicWireValueSchema) }),
      z.strictObject({ reference: unsupportedDynamicPayload('References') }),
      z.strictObject({ file: unsupportedDynamicPayload('File values') }),
    ],
    {
      error:
        'A dynamic value must be a string, a boolean, null, an array, or a single-key control ' +
        'record ({"integer": …}, {"double": …}, {"date": …}, or {"record": {…}} around a user ' +
        'record); bare numbers and bare objects are not dynamic values.',
    }
  )
)

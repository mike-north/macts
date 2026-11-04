/**
 * Passthrough value types for operations whose contracts do not yet carry
 * derived value types.
 *
 * An operation descriptor needs an input and an output {@link ValueType}. Until
 * generated contracts supply value types composed from the value library, the
 * runtime builds descriptors from the manifest instead, and their values carry
 * no wire encoding: the input is today's plain JSON request record and the
 * output is whatever plain JSON the app produced. Both use `PASSTHROUGH_PLAN`,
 * so an executor converts nothing, and their codecs return the validated value
 * unchanged.
 *
 * These value types are a bridge, not a value-library constructor. The
 * generator never produces them, and they disappear once every operation's
 * descriptor comes from a generated contract.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import {
  PASSTHROUGH_PLAN,
  type CodecResult,
  type JsonValue,
  type ValidationIssue,
  type ValueType,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'

/**
 * Any JSON value: what a passthrough position may hold.
 *
 * @remarks
 * Rejects values JSON cannot carry (non-finite numbers, `undefined`, functions,
 * class instances such as `Date`), so a passthrough value that reaches an
 * executor is exactly what a JSON round trip would deliver.
 */
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

/** A record of JSON values: the shape every operation input takes. */
const wireRecordSchema: z.ZodType<WireRecord> = z.record(z.string(), jsonValueSchema)

/**
 * Translate zod issues into the canonical issue shape.
 *
 * @remarks
 * Paths keep record keys and array indexes as they are. zod also permits
 * symbol keys, which no JSON value contains; they are rendered as text so an
 * issue is always serializable.
 *
 * @param issues - The issues from a failed zod parse.
 * @returns One canonical issue per zod issue, in the same order.
 */
export function toValidationIssues(issues: readonly z.core.$ZodIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
    message: issue.message,
    code: issue.code,
  }))
}

/** Run `schema` over `value` and report the result in codec form. */
function parseAsCodecResult<T>(schema: z.ZodType<T>, value: unknown): CodecResult<T> {
  const parsed = schema.safeParse(value)
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, issues: toValidationIssues(parsed.error.issues) }
}

/**
 * A value type whose SDK and wire forms are the same plain JSON, validated by
 * `schema`.
 */
function passthroughValueType(schema: z.ZodType<WireValue>): ValueType<unknown> {
  return {
    plan: PASSTHROUGH_PLAN,
    sdk: schema,
    wire: schema,
    encode: (value) => parseAsCodecResult(schema, value),
    decode: (wire) => parseAsCodecResult(schema, wire),
  }
}

/**
 * The input value type of a manifest-derived operation.
 *
 * @remarks
 * Validates the command's request contract first, so parameter issues are
 * reported against the parameter names, then requires every value in the
 * record to be plain JSON.
 *
 * @param requestSchema - The command's request schema: for an operation the
 *   runtime registers from a manifest, its declared input
 *   (`buildDeclaredInputSchema`), which admits no other key.
 * @returns A passthrough value type for the operation's input record.
 */
export function passthroughInputType(requestSchema: z.ZodType): ValueType<unknown> {
  return passthroughValueType(requestSchema.pipe(wireRecordSchema))
}

/**
 * The output value type of every manifest-derived operation: any plain JSON
 * value.
 *
 * @remarks
 * The manifest declares no result contract the runtime can check, so this
 * accepts every JSON value. Its plan is `passthrough`, so the runtime does
 * not validate results against it (phases/13 D11); operations registered from
 * a generated contract are validated against their real output contract.
 */
export const PASSTHROUGH_OUTPUT_TYPE: ValueType<unknown> = passthroughValueType(jsonValueSchema)

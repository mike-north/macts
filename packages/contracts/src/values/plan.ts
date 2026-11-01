/**
 * Serializable value plans.
 *
 * A plan is a JSON-serializable description of a value's shape and of the
 * classification of every leaf in it. Plans exist because the native codec runs
 * inside the automation process, where neither zod nor any other host code is
 * available: the plan is embedded in the native script as data and tells the
 * codec how to convert each native value to its wire form (and back) before
 * serialization.
 *
 * A plan is derived from the same value-type composition that produces the SDK
 * and wire schemas, never written separately, so the three cannot disagree. The
 * one exception is {@link PASSTHROUGH_PLAN}, which describes the absence of a
 * wire encoding rather than a value shape. Plans are provider-neutral: they
 * name value kinds, not native representations.
 *
 * @packageDocumentation
 */

/** Whether a record field must be present. */
export type FieldPresence = 'required' | 'optional'

/**
 * One field of a record plan.
 *
 * @remarks
 * Presence and value domain are separate axes: an optional field may still be
 * nullable (its `value` is a `nullable` plan), and a required field may be
 * nullable too. An absent optional field is omitted, never encoded as `null`.
 */
export interface FieldPlan {
  /** The field's value shape. */
  readonly value: ValuePlan
  /** Whether the field must be present. */
  readonly presence: FieldPresence
}

/**
 * The shape of a value, by kind.
 *
 * @remarks
 * - `integer` and `double` fix numeric classification; a `double` leaf that
 *   holds an integral value is still encoded as a double.
 * - `nullable` admits `null` as data in addition to `value`.
 * - `reference` names the manifest resource key and the cardinality.
 * - `file` is file content an operation returns; `file-source` is a source of
 *   bytes an operation consumes.
 * - `unknown` is dynamic content whose shape no contract describes; it is
 *   encoded self-descriptively.
 * - `none` is the result of an operation that produces no value. Its wire
 *   form is `null`, whatever the native result was, and it decodes to
 *   `undefined`.
 * - `passthrough` marks a value that carries no wire encoding at all; see
 *   {@link PASSTHROUGH_PLAN}.
 */
export type ValuePlan =
  | { readonly kind: 'string' }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'integer' }
  | { readonly kind: 'double' }
  | { readonly kind: 'date' }
  | { readonly kind: 'point' }
  | { readonly kind: 'rectangle' }
  | { readonly kind: 'rgb' }
  | { readonly kind: 'enum'; readonly members: readonly string[] }
  | { readonly kind: 'array'; readonly items: ValuePlan }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, FieldPlan>> }
  | { readonly kind: 'nullable'; readonly value: ValuePlan }
  | {
      readonly kind: 'reference'
      readonly resource: string
      readonly cardinality: 'one' | 'many'
    }
  | { readonly kind: 'file' }
  | { readonly kind: 'file-source' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'none' }
  | { readonly kind: 'passthrough' }

/** The discriminant of {@link ValuePlan}. */
export type ValuePlanKind = ValuePlan['kind']

/**
 * The plan for a value that is plain JSON rather than wire-encoded.
 *
 * @remarks
 * It lets dispatch run through the executor seam before operations carry
 * plans derived from their value types. Under this plan the codec converts
 * nothing: decode returns the JSON value as given, and encode returns the
 * native result as-is, so plain JSON serialization applies. Numbers are bare
 * JSON numbers with no classification, and non-finite values, negative zero,
 * and dates are not preserved.
 *
 * It is distinct from `unknown`. An `unknown` position holds dynamic content
 * in the self-describing wire encoding, where every object is a control record
 * and user records are enveloped. Passthrough content is not wire-encoded, so
 * those decoding rules do not apply to it. Generated operation descriptors
 * never use this plan.
 */
export const PASSTHROUGH_PLAN: Extract<ValuePlan, { readonly kind: 'passthrough' }> = Object.freeze(
  { kind: 'passthrough' }
)

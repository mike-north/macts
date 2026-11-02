/**
 * Constructors for value types.
 *
 * Generated code describes every field, parameter, and result by composing
 * these constructors, conventionally through a short alias:
 *
 * ```ts
 * const t = ValueTypes
 * const Event = t.record({
 *   id: t.string(),
 *   start: t.date(),
 *   attendees: t.optional(t.array(t.string())),
 *   note: t.optional(t.nullable(t.string())),
 * })
 * ```
 *
 * Each constructor call yields one {@link ValueType} whose native plan, SDK
 * schema, wire schema, and codecs all come from that single call, so no two
 * surfaces interpret a value independently. Codecs validate the actual runtime
 * value (values can bypass static types through casts or untyped callers),
 * report every problem with its path and a stable code from
 * {@link VALUE_ISSUE_CODES}, and never throw. Constructors do throw, with a
 * `TypeError`, when the composition itself is malformed (for example an enum
 * with no members), because that is a programming error in the contract.
 *
 * @packageDocumentation
 */

import { z, type ZodType } from 'zod'
import type { FileSource, FileValue } from '../files/index.js'
import type { IssuePath } from '../issues.js'
import type {
  CollectionReferenceVariant,
  ObjectReferenceVariant,
  ReferenceScope,
} from '../references/index.js'
import { RGB_CHANNEL_MAX, type Rgb } from './color.js'
import { INVALID, codecOf, defineValueType, mismatch, type Codec, type Issues } from './codec.js'
import { DYNAMIC_CODEC } from './dynamic-codec.js'
import { fileSourceType, fileType } from './file-types.js'
import type { Point, Rectangle } from './geometry.js'
import { INTEGER_LIMITS, type Integer } from './integer.js'
import { defineField, describeReceived, issue, isPlainObject, quote } from './issue-helpers.js'
import {
  BOOLEAN_CODEC,
  DATE_CODEC,
  DOUBLE_CODEC,
  STRING_CODEC,
  enumCodec,
  integerCodec,
} from './leaf-codecs.js'
import type { FieldPlan, ValuePlan } from './plan.js'
import { referenceType } from './reference-type.js'
import type { ValueType } from './value-type.js'
import { dateSdkSchema, integerSdkSchema } from './sdk-schemas.js'
import { wireIntegerSchema } from './wire-checks.js'
import {
  DynamicWireValueSchema,
  WireDateSchema,
  WireDoubleSchema,
  WireIntegerSchema,
} from './wire-schemas.js'
import type { WireValue } from './wire.js'

/** Options every value-type constructor accepts. */
export interface ValueTypeOptions {
  /**
   * Text describing the value. It is attached to both the SDK and wire
   * schemas, and so appears in the JSON Schema derived from the wire schema.
   */
  readonly description?: string
}

/**
 * A record field that may be absent, made with
 * {@link ValueTypeConstructors.optional}.
 *
 * @remarks
 * This is a field marker, not a value type: it is meaningful only as a field
 * of {@link ValueTypeConstructors.record}. Presence and nullability are
 * separate axes, so an optional field may also be nullable
 * (`t.optional(t.nullable(…))`).
 */
export interface OptionalField<Sdk> {
  /** Marks the field as optional. */
  readonly presence: 'optional'
  /** The value type of the field when it is present. */
  readonly type: ValueType<Sdk>
}

/** What a record field can be: a value type (required) or an {@link OptionalField}. */
export type RecordField = ValueType<unknown> | OptionalField<unknown>

/** The fields of a record, keyed by field name. */
export type RecordFields = Readonly<Record<string, RecordField>>

/** The SDK type of a value type. */
export type InferSdk<T extends ValueType<unknown>> = T extends ValueType<infer Sdk> ? Sdk : never

/**
 * The SDK type of one record field: the SDK type of its value type, whether
 * or not the field is optional.
 */
export type RecordFieldSdk<Field> =
  Field extends OptionalField<infer Sdk> ? Sdk : Field extends ValueType<infer Sdk> ? Sdk : never

/** The names of the optional fields among `Fields`. */
export type OptionalFieldNames<Fields extends RecordFields> = {
  [K in keyof Fields]: Fields[K] extends OptionalField<unknown> ? K : never
}[keyof Fields]

/**
 * The SDK type of a record with `Fields`: a readonly object whose required
 * fields are always present and whose optional fields may be absent.
 *
 * @remarks
 * With `exactOptionalPropertyTypes`, an optional field means "may be absent",
 * not "may hold `undefined`". (Encoding still treats an own property holding
 * `undefined` as absent, because values can bypass static types.) The
 * required and optional halves are merged into a single object type so that
 * editors display the record as one shape.
 */
export type RecordSdk<Fields extends RecordFields> = {
  readonly [K in Exclude<keyof Fields, OptionalFieldNames<Fields>>]: RecordFieldSdk<Fields[K]>
} & {
  readonly [K in OptionalFieldNames<Fields>]?: RecordFieldSdk<Fields[K]>
} extends infer Shape
  ? { [K in keyof Shape]: Shape[K] }
  : never

/**
 * The value-type constructors; see {@link ValueTypes}.
 *
 * @remarks
 * Every constructor except `optional` returns a {@link ValueType} and accepts
 * {@link ValueTypeOptions}.
 */
export interface ValueTypeConstructors {
  /** A string, which stands for itself on the wire. */
  string(options?: ValueTypeOptions): ValueType<string>
  /** A boolean, which stands for itself on the wire. */
  boolean(options?: ValueTypeOptions): ValueType<boolean>
  /**
   * An {@link (Integer:type)} within {@link INTEGER_LIMITS}, carried as decimal text
   * (`{"integer": "42"}`).
   *
   * @remarks
   * Encoding rejects any number that is not an integer in the domain,
   * including values that reached an integer position through a cast. `-0`
   * encodes as `"0"`.
   */
  integer(options?: ValueTypeOptions): ValueType<Integer>
  /**
   * A double. Finite values travel as JSON numbers (`{"double": 3}`); `NaN`,
   * `Infinity`, `-Infinity`, and `-0` travel as explicit states. A double
   * whose value is integral stays a double.
   */
  double(options?: ValueTypeOptions): ValueType<number>
  /**
   * A point in time: a `Date` in the SDK, ISO 8601 text with three fractional
   * digits on the wire. Encoding emits `Z`; decoding honors any explicit
   * offset. Dates must lie in years `0000..9999` (UTC).
   */
  date(options?: ValueTypeOptions): ValueType<Date>
  /** A {@link Point}, whose members are doubles on the wire. */
  point(options?: ValueTypeOptions): ValueType<Point>
  /** A {@link Rectangle}, whose members are doubles on the wire. */
  rectangle(options?: ValueTypeOptions): ValueType<Rectangle>
  /** An {@link (Rgb:interface)} color, whose channels are integers in `0..65535` on the wire. */
  rgb(options?: ValueTypeOptions): ValueType<Rgb>
  /**
   * A closed enum of string `members`.
   *
   * @remarks
   * The SDK type is the union of the members. Decoding a value that is not a
   * member fails (the static type stays closed) with an issue explaining that
   * the app may be newer than the SDK.
   *
   * @throws `TypeError` when `members` is empty or has duplicates.
   */
  enumeration<const Members extends readonly [string, ...string[]]>(
    members: Members,
    options?: ValueTypeOptions
  ): ValueType<Members[number]>
  /**
   * An array whose elements are all `item`.
   *
   * @throws `TypeError` when `item` is a `none` type.
   */
  array<Sdk>(item: ValueType<Sdk>, options?: ValueTypeOptions): ValueType<readonly Sdk[]>
  /**
   * A record with exactly `fields`. Undeclared fields are rejected in both
   * directions.
   *
   * @remarks
   * A required field must be present and not `undefined`; `null` is allowed
   * only when its type is nullable. An optional field that is absent (or holds
   * `undefined`) is omitted from the wire, and a decoded record has no own
   * property for it. A present `null` stays an own property holding `null`.
   *
   * @throws `TypeError` when a field is neither a value type nor an optional
   * field, or is a `none` type.
   */
  record<const Fields extends RecordFields>(
    fields: Fields,
    options?: ValueTypeOptions
  ): ValueType<RecordSdk<Fields>>
  /**
   * `inner`, or `null` as data.
   *
   * @throws `TypeError` when `inner` is a `none` type.
   */
  nullable<Sdk>(inner: ValueType<Sdk>, options?: ValueTypeOptions): ValueType<Sdk | null>
  /** Mark a record field as optional; see {@link OptionalField}. */
  optional<Sdk>(inner: ValueType<Sdk>): OptionalField<Sdk>
  /**
   * Dynamic content whose shape no contract describes.
   *
   * @remarks
   * On the wire every object is a control record and user records travel in
   * a `{"record": {…}}` envelope. Numbers encode as doubles, because a plain
   * number carries no evidence of being an integer. The SDK schema accepts any
   * value; encoding decides what can be represented (functions, symbols,
   * bigints, circular structures, and class instances other than `Date` and
   * arrays cannot).
   */
  unknown(options?: ValueTypeOptions): ValueType<unknown>
  /**
   * The result of an operation that produces no value: `undefined` in the
   * SDK, `null` on the wire.
   *
   * @remarks
   * Valid only as an operation's result. Using it as an array item, a
   * nullable value, or a record field throws `TypeError`.
   */
  none(options?: ValueTypeOptions): ValueType<undefined>
  /**
   * A reference to one object of `resource`, in either form: an
   * {@link IdentityReference} or a {@link SelectorReference}.
   *
   * @remarks
   * `scope` returns the app the references belong to and its resource table:
   * the app contract itself (a {@link ReferenceScope}). The table supplies the
   * identifier value type of `resource` and of every resource a container can
   * name. It is a thunk so that record types of mutually referencing
   * resources can compose: constructing the value type never calls it, while
   * encoding, decoding, and schema use do.
   *
   * On the wire a reference is `{"reference": {…}}` (see {@link ReferenceWire}).
   * Encoding reads only the data fields and never calls `resolve`, so a bound
   * reference and a plain {@link ObjectReferenceData} descriptor encode alike.
   * Every level of the reference (its containers and entries too) must name
   * the scope's `app`; a missing or different `app` is an issue at that
   * level's `app`, and `app` is never written to the wire. Decoding sets the
   * scope's `app` at every level and hands the decoded {@link ReferenceData}
   * to `DecodeContext.bindReference`. A materialized {@link ReferenceList} is
   * `t.array(t.reference(scope, resource, 'one'))`.
   *
   * A reference is resolved through its resource's `get` operation, so
   * encoding rejects one whose resource has no `get` in the scope's table.
   * Every container must also be a resource with `get`. Decoding does not
   * check either, so a reference an operation returned is always bound.
   *
   * The SDK type is the bound reference, which is what decoding produces. An
   * input position can be typed by the data form instead
   * ({@link ObjectReferenceData}): the value type is assignable to a value
   * type of the data form, because every bound reference is valid data.
   *
   * @typeParam T - The referenced record.
   * @typeParam Id - The SDK type of the resource's identifier.
   * @typeParam R - The resource key, inferred from `resource` as a literal.
   * @throws `TypeError` when `scope` is not a function, `resource` is not a
   * non-empty string, or `cardinality` is neither `'one'` nor `'many'`; and,
   * when the value type is used, when `scope` returns something other than an
   * app and its resource table.
   */
  reference<T = unknown, Id = unknown, R extends string = string>(
    scope: () => ReferenceScope,
    resource: R,
    cardinality: 'one',
    options?: ValueTypeOptions
  ): ValueType<ObjectReferenceVariant<T, Id, R>>
  /**
   * A deferred collection of `resource` objects, in either form: an
   * {@link IdentityCollectionReference} or a
   * {@link SelectorCollectionReference}.
   *
   * @remarks
   * As the single-object overload, with collection semantics: identity
   * entries are single identity references to `resource`, and a range
   * selector has `start <= end`. A collection is resolved through its
   * resource's `list` operation, so encoding rejects one whose resource has
   * no `list`.
   *
   * @typeParam T - The member record.
   * @typeParam Id - The SDK type of the resource's identifier.
   * @typeParam R - The resource key, inferred from `resource` as a literal.
   * @throws `TypeError` as the single-object overload.
   */
  reference<T = unknown, Id = unknown, R extends string = string>(
    scope: () => ReferenceScope,
    resource: R,
    cardinality: 'many',
    options?: ValueTypeOptions
  ): ValueType<CollectionReferenceVariant<T, Id, R>>
  /**
   * A {@link FileValue} an operation returns: `{"file": {…}}` on the wire.
   *
   * @remarks
   * Decoding hands the decoded {@link FileData} to `DecodeContext.bindFile`,
   * which keeps the grant private to the bound value. Encoding is the
   * runtime's, from `FileData`; a value without a grant, such as a bound
   * `FileValue`, is rejected, because operation inputs take file sources.
   */
  file(options?: ValueTypeOptions): ValueType<FileValue>
  /**
   * A {@link FileSource} an operation consumes: `{"fileSource": {…}}` on the
   * wire.
   *
   * @remarks
   * An uploaded file encodes as its `uploadId` only; its `expiresAt` must be
   * a valid `Date` but is not sent, because the service is authoritative for
   * expiry. Decoding admits only caller-owned files: upload handles are
   * resolved by the service from the wire form, so decoding one fails.
   */
  fileSource(options?: ValueTypeOptions): ValueType<FileSource>
}

const DOUBLE_SDK_SCHEMA = z.union([
  z.number(),
  z.nan(),
  z.literal([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]),
])

function stringType(options?: ValueTypeOptions): ValueType<string> {
  return defineValueType(
    { plan: { kind: 'string' }, sdk: z.string(), wire: z.string(), codec: STRING_CODEC },
    options?.description
  )
}

function booleanType(options?: ValueTypeOptions): ValueType<boolean> {
  return defineValueType(
    { plan: { kind: 'boolean' }, sdk: z.boolean(), wire: z.boolean(), codec: BOOLEAN_CODEC },
    options?.description
  )
}

function integerType(options?: ValueTypeOptions): ValueType<Integer> {
  return defineValueType(
    {
      plan: { kind: 'integer' },
      sdk: integerSdkSchema(INTEGER_LIMITS.min, INTEGER_LIMITS.max),
      wire: WireIntegerSchema,
      codec: integerCodec(),
    },
    options?.description
  )
}

function doubleType(options?: ValueTypeOptions): ValueType<number> {
  return defineValueType(
    {
      plan: { kind: 'double' },
      sdk: DOUBLE_SDK_SCHEMA,
      wire: WireDoubleSchema,
      codec: DOUBLE_CODEC,
    },
    options?.description
  )
}

function dateType(options?: ValueTypeOptions): ValueType<Date> {
  return defineValueType(
    {
      plan: { kind: 'date' },
      sdk: dateSdkSchema(),
      wire: WireDateSchema,
      codec: DATE_CODEC,
    },
    options?.description
  )
}

/** An integer channel in `0..RGB_CHANNEL_MAX`, used only inside {@link rgbType}. */
const RGB_CHANNEL = defineValueType(
  {
    plan: { kind: 'integer' },
    sdk: integerSdkSchema(0, RGB_CHANNEL_MAX),
    wire: wireIntegerSchema(0, RGB_CHANNEL_MAX),
    codec: integerCodec(0, RGB_CHANNEL_MAX),
  },
  undefined
)

function pointType(options?: ValueTypeOptions): ValueType<Point> {
  const double = doubleType()
  return fixedRecord({ kind: 'point' }, 'a point {x, y}', { x: double, y: double }, options)
}

function rectangleType(options?: ValueTypeOptions): ValueType<Rectangle> {
  const double = doubleType()
  return fixedRecord(
    { kind: 'rectangle' },
    'a rectangle {x, y, width, height}',
    { x: double, y: double, width: double, height: double },
    options
  )
}

function rgbType(options?: ValueTypeOptions): ValueType<Rgb> {
  return fixedRecord(
    { kind: 'rgb' },
    'an RGB color {r, g, b}',
    { r: RGB_CHANNEL, g: RGB_CHANNEL, b: RGB_CHANNEL },
    options
  )
}

function enumerationType<const Members extends readonly [string, ...string[]]>(
  members: Members,
  options?: ValueTypeOptions
): ValueType<Members[number]> {
  if (!Array.isArray(members) || members.length === 0) {
    throw new TypeError('An enumeration needs at least one member.')
  }
  const duplicate = members.find((member, index) => members.indexOf(member) !== index)
  if (duplicate !== undefined) {
    throw new TypeError(
      `An enumeration's members must be unique; ${quote(duplicate)} appears more than once.`
    )
  }
  const frozen: readonly Members[number][] = Object.freeze([...members])
  return defineValueType(
    {
      plan: { kind: 'enum', members: frozen },
      sdk: z.enum(members),
      wire: z.enum(members),
      codec: enumCodec(frozen),
    },
    options?.description
  )
}

function arrayType<Sdk>(
  item: ValueType<Sdk>,
  options?: ValueTypeOptions
): ValueType<readonly Sdk[]> {
  rejectNone(item, 'An array item')
  const itemCodec = codecOf(item)
  const codec: Codec<readonly Sdk[]> = {
    encode(value, path, issues) {
      if (!Array.isArray(value)) return mismatch(value, path, issues, 'an array')
      const items: readonly unknown[] = value
      const encoded: WireValue[] = []
      let valid = true
      for (const [index, element] of items.entries()) {
        const wire = itemCodec.encode(element, [...path, index], issues)
        if (wire === INVALID) valid = false
        else encoded.push(wire)
      }
      return valid ? encoded : INVALID
    },
    decode(wire, path, context, issues) {
      if (!Array.isArray(wire)) return mismatch(wire, path, issues, 'an array')
      const items: readonly unknown[] = wire
      const decoded: Sdk[] = []
      let valid = true
      for (const [index, element] of items.entries()) {
        const value = itemCodec.decode(element, [...path, index], context, issues)
        if (value === INVALID) valid = false
        else decoded.push(value)
      }
      return valid ? decoded : INVALID
    },
  }
  return defineValueType(
    {
      plan: { kind: 'array', items: item.plan },
      sdk: z.array(item.sdk),
      wire: z.array(item.wire),
      codec,
    },
    options?.description
  )
}

function recordType<const Fields extends RecordFields>(
  fields: Fields,
  options?: ValueTypeOptions
): ValueType<RecordSdk<Fields>> {
  return composeRecord(
    fields,
    'a record (a plain object)',
    (fieldPlans) => ({ kind: 'record', fields: fieldPlans }),
    options
  )
}

/**
 * A value type whose SDK and wire forms are records with fixed `fields`, but
 * whose plan is its own kind (points, rectangles, colors), so the native codec
 * can apply that kind's native conversion.
 */
function fixedRecord<const Fields extends RecordFields>(
  plan: ValuePlan,
  expected: string,
  fields: Fields,
  options: ValueTypeOptions | undefined
): ValueType<RecordSdk<Fields>> {
  return composeRecord(fields, expected, () => plan, options)
}

interface FieldEntry {
  readonly key: string
  readonly optional: boolean
  readonly type: ValueType<unknown>
  readonly codec: Codec<unknown>
}

function composeRecord<const Fields extends RecordFields>(
  fields: Fields,
  expected: string,
  planFor: (fieldPlans: Readonly<Record<string, FieldPlan>>) => ValuePlan,
  options: ValueTypeOptions | undefined
): ValueType<RecordSdk<Fields>> {
  if (!isPlainObject(fields)) throw new TypeError('A record needs an object of fields.')
  const entries: readonly FieldEntry[] = Object.keys(fields).map((key) =>
    fieldEntry(key, fields[key])
  )
  const declared = new Set(entries.map((entry) => entry.key))
  const known = entries.map((entry) => quote(entry.key)).join(', ')

  const unknownFields = (
    value: Readonly<Record<string, unknown>>,
    path: IssuePath,
    issues: Issues
  ): boolean => {
    let found = false
    for (const key of Object.keys(value)) {
      if (declared.has(key)) continue
      found = true
      issues.push(
        issue(
          [...path, key],
          'unknown-field',
          `${quote(key)} is not a field of ${expected}` +
            (known === '' ? ', which has no fields.' : ` (its fields are ${known}).`)
        )
      )
    }
    return found
  }

  const codec: Codec<Readonly<Record<string, unknown>>> = {
    encode(value, path, issues) {
      if (!isPlainObject(value)) return mismatch(value, path, issues, expected)
      const out = {}
      let valid = true
      for (const entry of entries) {
        const field = Object.hasOwn(value, entry.key) ? value[entry.key] : undefined
        if (field === undefined) {
          if (!entry.optional) {
            valid = false
            issues.push(missingField(path, entry.key))
          }
          continue
        }
        const wire = entry.codec.encode(field, [...path, entry.key], issues)
        if (wire === INVALID) valid = false
        else defineField(out, entry.key, wire)
      }
      if (unknownFields(value, path, issues)) valid = false
      return valid ? out : INVALID
    },
    decode(wire, path, context, issues) {
      if (!isPlainObject(wire)) return mismatch(wire, path, issues, expected)
      const out = {}
      let valid = true
      for (const entry of entries) {
        // JSON cannot carry `undefined`; an own property holding it (possible
        // only in-process) carries no data and is read as absent.
        const field = Object.hasOwn(wire, entry.key) ? wire[entry.key] : undefined
        if (field === undefined) {
          if (!entry.optional) {
            valid = false
            issues.push(missingField(path, entry.key))
          }
          continue
        }
        const value = entry.codec.decode(field, [...path, entry.key], context, issues)
        if (value === INVALID) valid = false
        else defineField(out, entry.key, value)
      }
      if (unknownFields(wire, path, issues)) valid = false
      return valid ? out : INVALID
    },
  }

  const fieldPlans: Readonly<Record<string, FieldPlan>> = Object.fromEntries(
    entries.map((entry) => [
      entry.key,
      { presence: entry.optional ? 'optional' : 'required', value: entry.type.plan },
    ])
  )
  const sdk = z.strictObject(
    Object.fromEntries(
      entries.map((entry) => [
        entry.key,
        entry.optional ? entry.type.sdk.optional() : entry.type.sdk,
      ])
    )
  )
  const wire = z.strictObject(
    Object.fromEntries(
      entries.map((entry): [string, ZodType<WireValue>] => [
        entry.key,
        entry.optional ? entry.type.wire.exactOptional() : entry.type.wire,
      ])
    )
  )

  // The schemas and codec above are built field by field from `fields`, so
  // their values have exactly the shape `RecordSdk<Fields>` describes. The
  // compiler cannot follow a mapped type through that runtime construction,
  // so the correspondence is asserted once, here.
  return defineValueType(
    {
      plan: planFor(fieldPlans),
      sdk: sdk as unknown as ZodType<RecordSdk<Fields>>,
      wire,
      codec: codec as Codec<RecordSdk<Fields>>,
    },
    options?.description
  )
}

function missingField(path: IssuePath, key: string) {
  return issue([...path, key], 'missing-field', `The required field ${quote(key)} is missing.`)
}

function fieldEntry(key: string, field: RecordField | undefined): FieldEntry {
  if (isOptionalField(field)) return checkedEntry(key, true, field.type)
  if (isValueType(field)) return checkedEntry(key, false, field)
  throw new TypeError(
    `Record field ${quote(key)} must be a value type or t.optional(…); received ${describeReceived(field)}.`
  )
}

function checkedEntry(key: string, optional: boolean, type: ValueType<unknown>): FieldEntry {
  rejectNone(type, `Record field ${quote(key)}`)
  return { key, optional, type, codec: codecOf(type) }
}

/**
 * `none` describes the absence of an operation's result, so it is valid only
 * as that result, never nested inside another value.
 */
function rejectNone(type: ValueType<unknown>, role: string): void {
  if (type.plan.kind === 'none') {
    throw new TypeError(
      `${role} cannot be t.none(): none describes the absence of a result and is valid only as ` +
        "an operation's result."
    )
  }
}

function isOptionalField(value: unknown): value is OptionalField<unknown> {
  return isPlainObject(value) && value['presence'] === 'optional' && isValueType(value['type'])
}

function isValueType(value: unknown): value is ValueType<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'plan' in value &&
    'encode' in value &&
    typeof value.encode === 'function' &&
    'decode' in value &&
    typeof value.decode === 'function'
  )
}

function nullableType<Sdk>(
  inner: ValueType<Sdk>,
  options?: ValueTypeOptions
): ValueType<Sdk | null> {
  rejectNone(inner, 'A nullable value')
  const innerCodec = codecOf(inner)
  return defineValueType<Sdk | null>(
    {
      plan: { kind: 'nullable', value: inner.plan },
      sdk: inner.sdk.nullable(),
      wire: inner.wire.nullable(),
      codec: {
        encode: (value, path, issues) =>
          value === null ? null : innerCodec.encode(value, path, issues),
        decode: (wire, path, context, issues) =>
          wire === null ? null : innerCodec.decode(wire, path, context, issues),
      },
    },
    options?.description
  )
}

function optionalField<Sdk>(inner: ValueType<Sdk>): OptionalField<Sdk> {
  if (!isValueType(inner)) {
    throw new TypeError(`t.optional(…) needs a value type; received ${describeReceived(inner)}.`)
  }
  return Object.freeze({ presence: 'optional', type: inner })
}

function unknownType(options?: ValueTypeOptions): ValueType<unknown> {
  return defineValueType(
    {
      plan: { kind: 'unknown' },
      sdk: z.unknown(),
      wire: DynamicWireValueSchema,
      codec: DYNAMIC_CODEC,
    },
    options?.description
  )
}

function noneType(options?: ValueTypeOptions): ValueType<undefined> {
  return defineValueType<undefined>(
    {
      plan: { kind: 'none' },
      sdk: z.undefined(),
      wire: z.null(),
      codec: {
        encode(value, path, issues) {
          if (value === undefined) return null
          issues.push(
            issue(
              path,
              'invalid-type',
              `Expected no value (undefined); received ${describeReceived(value)}.`
            )
          )
          return INVALID
        },
        decode(wire, path, _context, issues) {
          if (wire === null) return undefined
          issues.push(
            issue(
              path,
              'invalid-type',
              `Expected null (no value); received ${describeReceived(wire)}.`
            )
          )
          return INVALID
        },
      },
    },
    options?.description
  )
}

/**
 * The value-type constructors, as one namespace so generated code can alias
 * it (`const t = ValueTypes`).
 *
 * @example
 * ```ts
 * const t = ValueTypes
 * const Status = t.enumeration(['confirmed', 'tentative', 'cancelled'])
 * const Update = t.record({ id: t.string(), status: t.optional(Status) })
 * const result = Update.encode({ id: 'E1', status: 'confirmed' })
 * ```
 */
export const ValueTypes: ValueTypeConstructors = Object.freeze({
  string: stringType,
  boolean: booleanType,
  integer: integerType,
  double: doubleType,
  date: dateType,
  point: pointType,
  rectangle: rectangleType,
  rgb: rgbType,
  enumeration: enumerationType,
  array: arrayType,
  record: recordType,
  nullable: nullableType,
  optional: optionalField,
  unknown: unknownType,
  none: noneType,
  reference: referenceType,
  file: fileType,
  fileSource: fileSourceType,
})

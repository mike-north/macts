/**
 * Type tests for the value-type constructors.
 *
 * Each constructor's SDK type is what callers see: branded integers, `Date`,
 * closed enum unions, readonly arrays, and records whose optional fields may
 * be absent (with `exactOptionalPropertyTypes`, never "present but
 * `undefined`"). Presence and nullability are independent, so all four
 * pairings must infer distinctly. `optional` is a field marker, not a value
 * type.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (Presence, Nullability, and Updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §A5 (closed enums)
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (SDK types versus wire types)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (Reference Hydration Contracts)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (Binary Transfer Handle Shapes)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import {
  ValueTypes,
  type CollectionReferenceVariant,
  type FileSource,
  type FileValue,
  type ObjectReferenceVariant,
  type ReferenceRegistry,
  type CodecResult,
  type DecodeContext,
  type InferSdk,
  type Integer,
  type OptionalField,
  type Point,
  type Rectangle,
  type Rgb,
  type ValueType,
  type WireValue,
} from '../index.js'

const t = ValueTypes

// Leaves.
expectType<ValueType<string>>(t.string())
expectType<ValueType<boolean>>(t.boolean())
expectType<ValueType<Integer>>(t.integer())
expectType<ValueType<number>>(t.double())
expectType<ValueType<Date>>(t.date())
expectType<ValueType<Point>>(t.point())
expectType<ValueType<Rectangle>>(t.rectangle())
expectType<ValueType<Rgb>>(t.rgb())
expectType<ValueType<unknown>>(t.unknown())
expectType<ValueType<undefined>>(t.none())

// Options are accepted everywhere.
expectType<ValueType<string>>(t.string({ description: 'A title.' }))

// Enums infer a closed union of their members, without `as const`.
const status = t.enumeration(['confirmed', 'tentative', 'cancelled'])
expectType<ValueType<'confirmed' | 'tentative' | 'cancelled'>>(status)
expectNotAssignable<InferSdk<typeof status>>('postponed')
expectNotAssignable<InferSdk<typeof status>>('confirmed' as string)

// Composites.
expectType<ValueType<readonly Integer[]>>(t.array(t.integer()))
expectType<ValueType<string | null>>(t.nullable(t.string()))
expectType<ValueType<readonly (Date | null)[]>>(t.array(t.nullable(t.date())))

// Codec results carry the SDK type on decode and the wire type on encode.
declare const context: DecodeContext
expectType<CodecResult<Integer>>(t.integer().decode({ integer: '1' }, context))
expectType<CodecResult<WireValue>>(t.integer().encode(1))

// Records: the documented example infers exactly.
const note = t.record({ id: t.string(), note: t.optional(t.nullable(t.string())) })
expectAssignable<ValueType<unknown>>(note)
expectType<{ readonly id: string; readonly note?: string | null }>(
  null as unknown as InferSdk<typeof note>
)
expectAssignable<InferSdk<typeof note>>({ id: 'E1' })
expectAssignable<InferSdk<typeof note>>({ id: 'E1', note: null })
expectAssignable<InferSdk<typeof note>>({ id: 'E1', note: 'text' })

// Negative: required fields must be present, values keep their types, and an
// optional field is "may be absent", not "may be undefined".
expectNotAssignable<InferSdk<typeof note>>({ note: 'text' })
expectNotAssignable<InferSdk<typeof note>>({ id: 1 })
expectNotAssignable<InferSdk<typeof note>>({ id: 'E1', note: undefined })
expectNotAssignable<InferSdk<typeof note>>({ id: 'E1', note: 3 })

// Presence × nullability: all four pairings are distinct.
const matrix = t.record({
  requiredValue: t.integer(),
  requiredNullable: t.nullable(t.integer()),
  optionalValue: t.optional(t.integer()),
  optionalNullable: t.optional(t.nullable(t.integer())),
})
type Matrix = InferSdk<typeof matrix>
expectAssignable<ValueType<unknown>>(matrix)
expectType<{
  readonly requiredValue: Integer
  readonly requiredNullable: Integer | null
  readonly optionalValue?: Integer
  readonly optionalNullable?: Integer | null
}>(null as unknown as Matrix)
declare const integer: Integer
expectNotAssignable<Matrix>({ requiredValue: null, requiredNullable: null })
expectNotAssignable<Matrix>({ requiredValue: integer })
expectNotAssignable<Matrix>({ requiredValue: integer, requiredNullable: null, optionalValue: null })
expectAssignable<Matrix>({ requiredValue: integer, requiredNullable: null, optionalNullable: null })

// Records nest through arrays and other records.
const agenda = t.record({
  title: t.string(),
  sessions: t.array(
    t.record({
      start: t.date(),
      status,
      attendees: t.optional(t.array(t.string())),
    })
  ),
  owner: t.nullable(t.record({ name: t.string() })),
})
expectAssignable<ValueType<unknown>>(agenda)
expectType<{
  readonly title: string
  readonly sessions: readonly {
    readonly start: Date
    readonly status: 'confirmed' | 'tentative' | 'cancelled'
    readonly attendees?: readonly string[]
  }[]
  readonly owner: { readonly name: string } | null
}>(null as unknown as InferSdk<typeof agenda>)

// Edge: a record with no fields is the empty object type.
expectType<ValueType<Record<never, never>>>(t.record({}))

// `optional` is a field marker, not a value type: it cannot be used where a
// value type is required.
expectType<OptionalField<string>>(t.optional(t.string()))
expectNotAssignable<ValueType<unknown>>(t.optional(t.string()))
expectNotAssignable<Parameters<typeof t.array>[0]>(t.optional(t.string()))
expectNotAssignable<Parameters<typeof t.nullable>[0]>(t.optional(t.string()))

// References: the cardinality overload fixes the bound union, and the record
// and identifier types default to unknown.
declare const registry: () => ReferenceRegistry
interface Note {
  readonly title: string
}
expectType<ValueType<ObjectReferenceVariant<unknown>>>(t.reference(registry, 'note', 'one'))
expectType<ValueType<CollectionReferenceVariant<unknown>>>(t.reference(registry, 'note', 'many'))
const noteRef = t.reference<Note, string>(registry, 'note', 'one')
expectType<ValueType<ObjectReferenceVariant<Note, string>>>(noteRef)
expectType<ValueType<CollectionReferenceVariant<Note, string>>>(
  t.reference<Note, string>(registry, 'note', 'many', { description: 'Notes.' })
)
expectNotAssignable<ValueType<CollectionReferenceVariant<Note, string>>>(noteRef)

// A materialized reference list is an array of single references, and records
// compose reference fields.
expectType<ValueType<readonly ObjectReferenceVariant<Note, string>[]>>(t.array(noteRef))
const folder = t.record({ name: t.string(), pinned: t.optional(t.nullable(noteRef)) })
expectAssignable<ValueType<unknown>>(folder)
expectType<{
  readonly name: string
  readonly pinned?: ObjectReferenceVariant<Note, string> | null
}>(null as unknown as InferSdk<typeof folder>)

// Negative: a cardinality must be a literal; the registry is a thunk, not a table.
expectNotAssignable<Parameters<typeof t.reference>[2]>('some')
declare const table: ReferenceRegistry
expectNotAssignable<Parameters<typeof t.reference>[0]>(table)

// Files.
expectType<ValueType<FileValue>>(t.file())
expectType<ValueType<FileSource>>(t.fileSource())

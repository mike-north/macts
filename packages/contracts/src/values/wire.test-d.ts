/**
 * Type tests for numeric and dynamic wire forms.
 *
 * Control records are single-key objects whose key is the discriminator;
 * narrowing on the key must yield the payload type the wire contract assigns.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  DynamicRecordWire,
  DynamicWireValue,
  ReferenceWire,
  SpecialDoubleState,
  WireDate,
  WireDouble,
  WireFile,
  WireFileSource,
  WireInteger,
  WireNumber,
  WireRecord,
  WireReference,
  WireValue,
} from '../index.js'

declare const wireNumber: WireNumber

// Narrowing on the discriminating key yields the matching payload.
if ('integer' in wireNumber) {
  expectType<WireInteger>(wireNumber)
  expectType<string>(wireNumber.integer)
} else {
  expectType<WireDouble>(wireNumber)
  expectType<number | SpecialDoubleState>(wireNumber.double)
}

// Integers travel as decimal text, never as JSON numbers.
expectAssignable<WireInteger>({ integer: '42' })
expectNotAssignable<WireInteger>({ integer: 42 })

// A double whose value is integral is still a double.
expectAssignable<WireDouble>({ double: 3 })

// Special states are exactly the non-finite values and negative zero.
expectAssignable<WireDouble>({ double: 'NaN' })
expectAssignable<WireDouble>({ double: 'Infinity' })
expectAssignable<WireDouble>({ double: '-Infinity' })
expectAssignable<WireDouble>({ double: '-0' })
expectNotAssignable<WireDouble>({ double: 'nan' })
expectNotAssignable<WireDouble>({ double: '1.5' })

// Dynamic content: user records travel only inside a `record` envelope, and
// bare numbers are not dynamic values.
expectAssignable<DynamicWireValue>({ record: { integer: '42' } })
expectAssignable<DynamicWireValue>([{ integer: '1' }, 'text', null, true])
expectNotAssignable<DynamicWireValue>(42)
expectNotAssignable<DynamicWireValue>({ name: 'not enveloped' })

// Dynamic content: once strings, booleans, null, and arrays are set aside,
// every remaining value is a control record, and its single key narrows it to
// exactly one kind.
type DynamicControlRecord = Exclude<
  DynamicWireValue,
  string | boolean | null | readonly DynamicWireValue[]
>
declare const control: DynamicControlRecord

if ('integer' in control) {
  expectType<WireInteger>(control)
} else if ('double' in control) {
  expectType<WireDouble>(control)
} else if ('date' in control) {
  expectType<WireDate>(control)
  expectType<string>(control.date)
} else if ('reference' in control) {
  expectType<WireReference>(control)
  expectType<ReferenceWire>(control.reference)
} else if ('file' in control) {
  expectType<WireFile>(control)
  expectType<string>(control.file.grant)
} else {
  expectType<DynamicRecordWire>(control)
  expectType<Readonly<Record<string, DynamicWireValue>>>(control.record)
}

// Negative: a reference payload is not a file payload, under either key.
const eventReference = {
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'E1',
} as const
expectAssignable<WireReference>({ reference: eventReference })
expectNotAssignable<WireFile>({ file: eventReference })

// Edge: an enveloped user record may itself hold control records and nested
// envelopes, and its own keys may collide with control-record keys.
expectAssignable<DynamicWireValue>({
  record: {
    integer: { integer: '7' },
    nested: { record: { when: { date: '2026-10-31T17:04:05.120Z' } } },
  },
})

// Operation input is a record of wire values; a bare wire value is not.
expectAssignable<WireRecord>({ calendar: 'Home', limit: { integer: '10' } })
expectAssignable<WireRecord>({})
expectNotAssignable<WireRecord>('Home')
expectNotAssignable<WireRecord>([{ integer: '1' }])
expectAssignable<WireValue>({ calendar: 'Home' })

// Every control record is a JSON value, so encoded values can be handled
// generically as `WireValue` without conversion.
declare const wireInteger: WireInteger
declare const wireDouble: WireDouble
declare const wireDate: WireDate
declare const wireReference: WireReference
declare const wireFile: WireFile
declare const wireFileSource: WireFileSource
declare const dynamicRecord: DynamicRecordWire
declare const dynamicValue: DynamicWireValue
expectAssignable<WireValue>(wireInteger)
expectAssignable<WireValue>(wireDouble)
expectAssignable<WireValue>(wireDate)
expectAssignable<WireValue>(wireReference)
expectAssignable<WireValue>(wireFile)
expectAssignable<WireValue>(wireFileSource)
expectAssignable<WireValue>(dynamicRecord)
expectAssignable<WireValue>(dynamicValue)

/**
 * Type tests for the native codec contract.
 *
 * The executor classifies what the automation process reports by switching on
 * `ok` and then on the failure `source`, so each discriminant must narrow to
 * exactly the fields that classification reads.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { PASSTHROUGH_PLAN, type IssuePath, type WireRecord, type WireValue } from '@macts/contracts'
import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { NativeFailure, NativeOutcome, NativeScript } from './native-codec.js'

declare const outcome: NativeOutcome

// `ok` separates a wire value from a failure.
if (outcome.ok) {
  expectType<WireValue>(outcome.value)
} else {
  expectType<NativeFailure>(outcome.failure)
}

// `source` separates app failures, codec failures, and changed collections.
declare const failure: NativeFailure
if (failure.source === 'app') {
  expectType<string>(failure.message)
  expectType<number | undefined>(failure.errorNumber)
} else if (failure.source === 'codec') {
  expectType<'decode' | 'encode'>(failure.direction)
  expectType<IssuePath>(failure.path)
} else {
  expectType<'collection'>(failure.source)
  expectType<string>(failure.message)
}

// Negative: a success carries no failure, a codec failure has a direction,
// and an app failure has none.
expectNotAssignable<NativeOutcome>({ ok: true, failure: { source: 'app', message: 'x' } })
expectNotAssignable<NativeFailure>({ source: 'codec', path: [], message: 'x' })
expectNotAssignable<NativeFailure>({ source: 'app', message: 'x', direction: 'encode' })
expectNotAssignable<NativeFailure>({ source: 'collection' })

// Edge: a successful outcome may carry `null`, the wire form of "no value".
expectAssignable<NativeOutcome>({ ok: true, value: null })

// A script's input is record-shaped, and a script can run under the
// passthrough plan before derived plans exist.
expectType<WireRecord>(null as unknown as NativeScript['input'])
expectAssignable<NativeScript>({
  bundleId: 'com.apple.iCal',
  body: 'return app.name()',
  input: {},
  inputPlan: PASSTHROUGH_PLAN,
  outputPlan: PASSTHROUGH_PLAN,
})
// A paged list's script also carries its page window.
expectAssignable<NativeScript>({
  bundleId: 'com.apple.reminders',
  body: 'return null',
  input: {},
  inputPlan: PASSTHROUGH_PLAN,
  outputPlan: PASSTHROUGH_PLAN,
  page: { offset: 25, size: 25, anchor: 'x' },
})

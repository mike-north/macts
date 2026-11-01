/**
 * Native boundary tests for the value codec: the prelude runs inside the real
 * macOS automation process (`/usr/bin/osascript -l JavaScript`), composed the
 * way the native executor composes scripts.
 *
 * These prove what Node cannot: that the automation process's own numbers and
 * dates are classified and serialized losslessly before `JSON.stringify`, and
 * that codec failures surface as codec failures with their paths. Bodies run
 * with `app = null` and never address an application, so no automation
 * permission is needed. Each case batches several values into one process
 * where the outcome allows it.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — A2
 *   (numbers), A3 (dates), A4 (presence), D3 (wire encoding), D4 (native codec
 *   interface and executor composition), D10 (classification, signed zero,
 *   integer domain, stale enum members)
 */

import type { FieldPlan, ValuePlan } from '@macts/contracts'
import { describe, expect, it } from 'vitest'
import { NATIVE_CODEC, type NativeOutcome } from './native-codec.js'
import { runNativeScript } from './test-support/native-harness.js'

const INTEGER: ValuePlan = { kind: 'integer' }
const DOUBLE: ValuePlan = { kind: 'double' }
const DATE: ValuePlan = { kind: 'date' }
const STRING: ValuePlan = { kind: 'string' }
const recordOf = (fields: Record<string, FieldPlan>): ValuePlan => ({ kind: 'record', fields })
const required = (value: ValuePlan): FieldPlan => ({ value, presence: 'required' })
const optional = (value: ValuePlan): FieldPlan => ({ value, presence: 'optional' })
const EMPTY_RECORD = recordOf({})

/**
 * Asserts that an outcome is a codec failure in `direction` at `path`, whose
 * message contains `fragment`.
 */
function expectCodecFailure(
  outcome: NativeOutcome,
  direction: 'decode' | 'encode',
  path: readonly (string | number)[],
  fragment: string
): void {
  if (outcome.ok || outcome.failure.source !== 'codec') {
    expect.fail(`Expected a codec failure, received ${JSON.stringify(outcome)}`)
  }
  const { failure } = outcome
  expect({ direction: failure.direction, path: failure.path }).toEqual({ direction, path })
  expect(failure.message).toContain(fragment)
}

/** Generous: the first automation-process launch on a cold machine can be slow. */
const TIMEOUT_MS = 30000

describe.skipIf(process.platform !== 'darwin')('native codec in the automation process', () => {
  it(
    'classifies native numbers and dates losslessly',
    async () => {
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: `
          return {
            nan: 0 / 0,
            infinity: 1 / 0,
            negativeInfinity: -1 / 0,
            negativeZero: -0,
            answer: 42,
            three: 3,
            created: new Date(Date.UTC(2026, 9, 31, 14, 34, 5, 120)),
            offsetEcho: args.offset.getTime(),
            offsetIsDate: Object.prototype.toString.call(args.offset) === '[object Date]'
          };`,
        input: { offset: { date: '2026-10-31T17:04:05.120+02:30' } },
        inputPlan: recordOf({ offset: required(DATE) }),
        outputPlan: recordOf({
          nan: required(DOUBLE),
          infinity: required(DOUBLE),
          negativeInfinity: required(DOUBLE),
          negativeZero: required(DOUBLE),
          answer: required(INTEGER),
          three: required(DOUBLE),
          created: required(DATE),
          offsetEcho: required(INTEGER),
          offsetIsDate: required({ kind: 'boolean' }),
        }),
      })
      expect(outcome).toEqual({
        ok: true,
        value: {
          nan: { double: 'NaN' },
          infinity: { double: 'Infinity' },
          negativeInfinity: { double: '-Infinity' },
          negativeZero: { double: '-0' },
          answer: { integer: '42' },
          // A2: an integral double stays a double.
          three: { double: 3 },
          // A3/D3: UTC, exactly three fractional digits, exact milliseconds.
          created: { date: '2026-10-31T14:34:05.120Z' },
          // 17:04:05.120 at +02:30 is 14:34:05.120 UTC.
          offsetEcho: { integer: String(Date.UTC(2026, 9, 31, 14, 34, 5, 120)) },
          offsetIsDate: true,
        },
      })
    },
    TIMEOUT_MS
  )

  it(
    'round-trips a nested record through decode, the body, and encode',
    async () => {
      const event = recordOf({
        title: required(STRING),
        count: required(INTEGER),
        weight: required(DOUBLE),
        at: required(DATE),
        note: required({ kind: 'nullable', value: STRING }),
        location: optional(STRING),
        tags: optional({ kind: 'array', items: STRING }),
      })
      const plan = recordOf({ events: required({ kind: 'array', items: event }) })
      const input = {
        events: [
          {
            title: 'Standup',
            count: { integer: '-9007199254740991' },
            weight: { double: '-0' },
            at: { date: '2026-10-31T09:00:00.007Z' },
            note: null,
            location: 'Room 4',
          },
          {
            title: 'Review',
            count: { integer: '0' },
            weight: { double: 2.5 },
            at: { date: '2026-11-01T23:59:59.999-08:00' },
            note: 'bring notes',
            tags: ['a', 'b'],
          },
        ],
      }
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: 'return args;',
        input,
        inputPlan: plan,
        outputPlan: plan,
      })
      expect(outcome).toEqual({
        ok: true,
        value: {
          events: [
            input.events[0],
            {
              ...input.events[1],
              // Encoders always emit Z: 23:59:59.999 at -08:00 is 07:59:59.999 the next day.
              at: { date: '2026-11-02T07:59:59.999Z' },
            },
          ],
        },
      })
    },
    TIMEOUT_MS
  )

  it(
    'fails encode, rather than reclassifying, for an integer outside the safe domain',
    async () => {
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: 'return { total: 9007199254740993 };',
        input: {},
        inputPlan: EMPTY_RECORD,
        outputPlan: recordOf({ total: required(INTEGER) }),
      })
      // The literal 9007199254740993 is already 2^53 as a double inside the process.
      expectCodecFailure(outcome, 'encode', ['total'], '9007199254740992')
    },
    TIMEOUT_MS
  )

  it(
    'fails encode with the field path for a value outside an enum',
    async () => {
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: "return { events: [{ status: 'confirmed' }, { status: 'postponed' }] };",
        input: {},
        inputPlan: EMPTY_RECORD,
        outputPlan: recordOf({
          events: required({
            kind: 'array',
            items: recordOf({
              status: required({ kind: 'enum', members: ['confirmed', 'tentative'] }),
            }),
          }),
        }),
      })
      expectCodecFailure(outcome, 'encode', ['events', 1, 'status'], '"postponed"')
    },
    TIMEOUT_MS
  )

  it(
    'fails decode for input that violates its plan, before the body runs',
    async () => {
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: "throw new Error('the body must not run');",
        input: { count: { integer: '042' } },
        inputPlan: recordOf({ count: required(INTEGER) }),
        outputPlan: { kind: 'none' },
      })
      expectCodecFailure(outcome, 'decode', ['count'], '"042"')
    },
    TIMEOUT_MS
  )

  it(
    'leaves errors raised by the body classified as app failures',
    async () => {
      const outcome = await runNativeScript(NATIVE_CODEC, {
        body: "var error = new Error('Calendar is busy'); error.errorNumber = -1728; throw error;",
        input: {},
        inputPlan: EMPTY_RECORD,
        outputPlan: { kind: 'none' },
      })
      expect(outcome).toEqual({
        ok: false,
        failure: { source: 'app', message: 'Calendar is busy', errorNumber: -1728 },
      })
    },
    TIMEOUT_MS
  )
})

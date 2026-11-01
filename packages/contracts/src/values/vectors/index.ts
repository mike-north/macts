/**
 * Hand-written codec vectors for the value contracts.
 *
 * Each vector pairs a value type with an SDK value and its wire form, or with
 * an input that must be rejected and the issue codes the rejection carries.
 * Every expectation is derived by hand from the cited section of
 * `phases/13-sdk-value-and-execution-contracts.md`, never from program
 * output, so a codec that agrees with itself but not with the contract fails
 * them.
 *
 * The vectors are data, independent of any one codec implementation, so any
 * implementation of the same contract (for example the native codec inside
 * the automation process) can be checked against the same expectations.
 * Compare results with {@link sameValueMismatches}, which is exact about
 * signed zero, `NaN`, and own-property presence.
 *
 * @packageDocumentation
 */

import { Integer } from '../integer.js'
import { Rgb } from '../color.js'
import type { IssuePath } from '../../issues.js'
import type { ValueType } from '../value-type.js'
import { ValueTypes as t } from '../value-types.js'
import type { ValueIssueCode } from '../value-issues.js'
import type { WireValue } from '../wire.js'

export { sameValueMismatches } from './compare.js'

/**
 * A valid SDK value and its wire form.
 *
 * @remarks
 * Without `direction`, the vector holds in both directions: encoding `sdk`
 * yields `wire`, and decoding `wire` yields `sdk`. With `direction: 'encode'`
 * or `'decode'`, it holds only that way, for forms that are accepted but not
 * produced (a JSON `-0` double, a date with a non-`Z` offset) or values that
 * are normalized (an integer `-0`, an own `undefined` at an optional field).
 */
export interface ValueVector {
  /** Short, unique description of the case. */
  readonly name: string
  /** The contract section the expectation comes from, as `phases/13 §…`. */
  readonly see: string
  /** The value type under test. */
  readonly type: ValueType<unknown>
  /** The SDK value. */
  readonly sdk: unknown
  /** The wire value. */
  readonly wire: WireValue
  /** Restricts the vector to one direction. */
  readonly direction?: 'encode' | 'decode'
  /**
   * For date vectors: the instant as milliseconds since the epoch, computed
   * by hand and written as a literal, so the expectation does not rest only
   * on `Date`'s own calendar arithmetic. Decoded dates and `sdk` must both
   * hold exactly this time value.
   */
  readonly epochMilliseconds?: number
}

/** An input that must be rejected, with the issue codes the rejection carries. */
export interface RejectionVector {
  /** Short, unique description of the case. */
  readonly name: string
  /** The contract section the expectation comes from, as `phases/13 §…`. */
  readonly see: string
  /** The value type under test. */
  readonly type: ValueType<unknown>
  /** The rejected input: an SDK value for `encode`, a wire value for `decode`. */
  readonly input: unknown
  /** Which codec direction rejects the input. */
  readonly direction: 'encode' | 'decode'
  /** Every issue code reported, in any order, with repeats for repeated issues. */
  readonly expectedIssueCodes: readonly ValueIssueCode[]
  /**
   * Where each issue sits, in any order, when the location is part of the
   * expectation. A path always names the value's location in the user's data,
   * in both directions: record keys and array indexes only, never the
   * `record` envelope that wraps a user record in dynamic wire content.
   */
  readonly expectedIssuePaths?: readonly IssuePath[]
}

const at = (iso: string): Date => new Date(iso)

const statuses = t.enumeration(['confirmed', 'tentative', 'cancelled'])

/** A nested record exercising arrays of records, numbers, and every presence × nullability pairing. */
const agenda = t.record({
  title: t.string(),
  sessions: t.array(
    t.record({
      start: t.date(),
      scores: t.array(t.double()),
      attendees: t.integer(),
      room: t.nullable(t.string()),
      note: t.optional(t.nullable(t.string())),
      track: t.optional(t.string()),
    })
  ),
  tags: t.optional(t.array(t.string())),
})

const update = t.record({ id: t.string(), note: t.optional(t.string()) })

const event = t.record({ id: t.string(), count: t.integer() })

/** Valid values, in both directions unless restricted. */
export const VALUE_VECTORS: readonly ValueVector[] = Object.freeze([
  // Integers.
  {
    name: 'integer 42 travels as decimal text',
    see: 'phases/13 §D3',
    type: t.integer(),
    sdk: 42,
    wire: { integer: '42' },
  },
  {
    name: 'integer zero',
    see: 'phases/13 §D3',
    type: t.integer(),
    sdk: 0,
    wire: { integer: '0' },
  },
  {
    name: 'largest safe integer is exact text',
    see: 'phases/13 §D10',
    type: t.integer(),
    sdk: Number.MAX_SAFE_INTEGER,
    wire: { integer: '9007199254740991' },
  },
  {
    name: 'smallest safe integer is exact text',
    see: 'phases/13 §D10',
    type: t.integer(),
    sdk: Number.MIN_SAFE_INTEGER,
    wire: { integer: '-9007199254740991' },
  },
  {
    name: 'integer -0 normalizes to "0"',
    see: 'phases/13 §D10',
    type: t.integer(),
    sdk: -0,
    wire: { integer: '0' },
    direction: 'encode',
  },

  // Doubles.
  {
    name: 'double 3 stays a double',
    see: 'phases/13 §A2',
    type: t.double(),
    sdk: 3,
    wire: { double: 3 },
  },
  {
    name: 'double 0.1',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: 0.1,
    wire: { double: 0.1 },
  },
  {
    name: 'largest finite double',
    see: 'phases/13 §A9',
    type: t.double(),
    sdk: Number.MAX_VALUE,
    wire: { double: 1.7976931348623157e308 },
  },
  {
    name: 'most negative finite double',
    see: 'phases/13 §A9',
    type: t.double(),
    sdk: -Number.MAX_VALUE,
    wire: { double: -1.7976931348623157e308 },
  },
  {
    name: 'smallest positive double',
    see: 'phases/13 §A9',
    type: t.double(),
    sdk: Number.MIN_VALUE,
    wire: { double: 5e-324 },
  },
  {
    name: 'positive zero double',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: 0,
    wire: { double: 0 },
  },
  {
    name: 'NaN is an explicit state',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: Number.NaN,
    wire: { double: 'NaN' },
  },
  {
    name: 'Infinity is an explicit state',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: Number.POSITIVE_INFINITY,
    wire: { double: 'Infinity' },
  },
  {
    name: '-Infinity is an explicit state',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: Number.NEGATIVE_INFINITY,
    wire: { double: '-Infinity' },
  },
  {
    name: 'double -0 is preserved as an explicit state',
    see: 'phases/13 §D10',
    type: t.double(),
    sdk: -0,
    wire: { double: '-0' },
  },
  {
    name: 'a JSON -0 double number decodes to -0',
    see: 'phases/13 §D3',
    type: t.double(),
    sdk: -0,
    wire: { double: -0 },
    direction: 'decode',
  },

  // Dates.
  // Shared arithmetic for the date vectors below. Days from 1970-01-01 to
  // 2026-01-01: 56 years × 365 + 14 leap days (1972, 1976, …, 2024) = 20454.
  // Days from 2026-01-01 to 2026-10-31: Jan–Sep (31+28+31+30+31+30+31+31+30 =
  // 273) + 30 = 303. So 2026-10-31T00:00:00.000Z is (20454 + 303) × 86_400_000
  // = 20757 × 86_400_000 = 1_793_404_800_000 ms, and 2026-11-01T00:00:00.000Z is
  // one day (86_400_000 ms) later, 1_793_491_200_000 ms.
  {
    name: 'UTC date with three fractional digits',
    see: 'phases/13 §D3',
    type: t.date(),
    sdk: at('2026-10-31T17:04:05.120Z'),
    wire: { date: '2026-10-31T17:04:05.120Z' },
    // 1_793_404_800_000 + 17 h (61_200_000) + 4 min (240_000) + 5.120 s (5_120)
    epochMilliseconds: 1_793_466_245_120,
  },
  {
    name: 'date with a +02:30 offset decodes to the same instant',
    see: 'phases/13 §A3',
    type: t.date(),
    // 17:04:05.120 at +02:30 is 14:34:05.120 UTC.
    sdk: new Date(Date.UTC(2026, 9, 31, 14, 34, 5, 120)),
    wire: { date: '2026-10-31T17:04:05.120+02:30' },
    direction: 'decode',
    // 1_793_404_800_000 + 14 h (50_400_000) + 34 min (2_040_000) + 5.120 s (5_120)
    epochMilliseconds: 1_793_457_245_120,
  },
  {
    name: 'the same instant encodes with Z',
    see: 'phases/13 §D3',
    type: t.date(),
    sdk: new Date(Date.UTC(2026, 9, 31, 14, 34, 5, 120)),
    wire: { date: '2026-10-31T14:34:05.120Z' },
    direction: 'encode',
    epochMilliseconds: 1_793_457_245_120,
  },
  {
    name: 'date with a -05:00 offset decodes to the same instant',
    see: 'phases/13 §A3',
    type: t.date(),
    // 12:00:00.000 at -05:00 is 17:00:00.000 UTC.
    sdk: new Date(Date.UTC(2026, 9, 31, 17, 0, 0, 0)),
    wire: { date: '2026-10-31T12:00:00.000-05:00' },
    direction: 'decode',
    // 1_793_404_800_000 + 17 h (61_200_000)
    epochMilliseconds: 1_793_466_000_000,
  },
  {
    name: 'a negative offset can carry the instant into the next UTC day',
    see: 'phases/13 §A3',
    type: t.date(),
    // 22:30 on October 31 at -05:00 is 03:30 on November 1 UTC.
    sdk: new Date(Date.UTC(2026, 10, 1, 3, 30, 0, 0)),
    wire: { date: '2026-10-31T22:30:00.000-05:00' },
    direction: 'decode',
    // 1_793_491_200_000 (November 1) + 3 h 30 min (12_600_000)
    epochMilliseconds: 1_793_503_800_000,
  },
  {
    name: 'that instant encodes on the next UTC day',
    see: 'phases/13 §D3',
    type: t.date(),
    sdk: new Date(Date.UTC(2026, 10, 1, 3, 30, 0, 0)),
    wire: { date: '2026-11-01T03:30:00.000Z' },
    direction: 'encode',
    epochMilliseconds: 1_793_503_800_000,
  },
  {
    name: 'a positive offset can carry the instant back to the previous UTC day',
    see: 'phases/13 §A3',
    type: t.date(),
    // 01:15 on November 1 at +09:00 is 16:15 on October 31 UTC.
    sdk: new Date(Date.UTC(2026, 9, 31, 16, 15, 0, 0)),
    wire: { date: '2026-11-01T01:15:00.000+09:00' },
    direction: 'decode',
    // 1_793_404_800_000 (October 31) + 16 h (57_600_000) + 15 min (900_000)
    epochMilliseconds: 1_793_463_300_000,
  },
  {
    name: 'year 0001 is not read as 1901',
    see: 'phases/13 §A3',
    type: t.date(),
    sdk: at('0001-01-01T00:00:00.000Z'),
    wire: { date: '0001-01-01T00:00:00.000Z' },
    // 719_162 days from 0001-01-01 to 1970-01-01 (1969 × 365 + 477 leap days:
    // 1969/4 = 492 minus 19 centuries plus 4 multiples of 400), × 86_400_000.
    epochMilliseconds: -62_135_596_800_000,
  },

  // Geometry and color.
  {
    name: 'point members are wrapped doubles',
    see: 'phases/13 §D3',
    type: t.point(),
    sdk: { x: 1, y: 2 },
    wire: { x: { double: 1 }, y: { double: 2 } },
  },
  {
    name: 'rectangle members are wrapped doubles with no invented constraints',
    see: 'phases/13 §A3',
    type: t.rectangle(),
    sdk: { x: 0, y: -10.5, width: 300, height: 0 },
    wire: { x: { double: 0 }, y: { double: -10.5 }, width: { double: 300 }, height: { double: 0 } },
  },
  {
    name: 'rgb channels are wrapped integers with full 16-bit precision',
    see: 'phases/13 §D3',
    type: t.rgb(),
    sdk: Rgb.create(65535, 32896, 0),
    wire: { r: { integer: '65535' }, g: { integer: '32896' }, b: { integer: '0' } },
  },

  // Enums.
  {
    name: 'enum member',
    see: 'phases/13 §A5',
    type: statuses,
    sdk: 'confirmed',
    wire: 'confirmed',
  },

  // Records, presence, and nullability.
  {
    name: 'nested record with arrays of records, numbers, nullable and optional fields',
    see: 'phases/13 §A4',
    type: agenda,
    sdk: {
      title: 'Offsite',
      sessions: [
        {
          start: at('2026-10-31T09:00:00.000Z'),
          scores: [3, 0.5, Number.NaN],
          attendees: 12,
          room: null,
          note: null,
        },
        {
          start: at('2026-10-31T13:30:00.000Z'),
          scores: [],
          attendees: 0,
          room: 'B',
          track: 'design',
        },
      ],
    },
    wire: {
      title: 'Offsite',
      sessions: [
        {
          start: { date: '2026-10-31T09:00:00.000Z' },
          scores: [{ double: 3 }, { double: 0.5 }, { double: 'NaN' }],
          attendees: { integer: '12' },
          room: null,
          note: null,
        },
        {
          start: { date: '2026-10-31T13:30:00.000Z' },
          scores: [],
          attendees: { integer: '0' },
          room: 'B',
          track: 'design',
        },
      ],
    },
  },
  {
    name: 'an optional field holding undefined is omitted',
    see: 'phases/13 §A4',
    type: update,
    sdk: { id: 'E1', note: undefined },
    wire: { id: 'E1' },
    direction: 'encode',
  },
  {
    name: 'a declared field named "integer" holding text is a field, not a number',
    see: 'phases/13 §D3',
    type: t.record({ integer: t.string() }),
    sdk: { integer: '42' },
    wire: { integer: '42' },
  },
  {
    name: 'a declared field named "integer" holding an integer wraps its value',
    see: 'phases/13 §D3',
    type: t.record({ integer: t.integer() }),
    sdk: { integer: 42 },
    wire: { integer: { integer: '42' } },
  },
  {
    name: 'a nullable integer holding null',
    see: 'phases/13 §A4',
    type: t.nullable(t.integer()),
    sdk: null,
    wire: null,
  },

  // Dynamic content.
  {
    name: 'a dynamic user record shaped like a control record is enveloped',
    see: 'phases/13 §D3',
    type: t.unknown(),
    sdk: { integer: '42' },
    wire: { record: { integer: '42' } },
  },
  {
    name: 'dynamic numbers are doubles, even when integral',
    see: 'phases/13 §D10',
    type: t.unknown(),
    sdk: [1, 'a', true, null],
    wire: [{ double: 1 }, 'a', true, null],
  },
  {
    name: 'dynamic content preserves dates, signed zero, and non-finite values when nested',
    see: 'phases/13 §D3',
    type: t.unknown(),
    sdk: {
      when: at('2026-10-31T17:04:05.120Z'),
      n: -0,
      nested: { list: [Number.POSITIVE_INFINITY] },
    },
    wire: {
      record: {
        when: { date: '2026-10-31T17:04:05.120Z' },
        n: { double: '-0' },
        nested: { record: { list: [{ double: 'Infinity' }] } },
      },
    },
  },
  {
    name: 'a dynamic integer control record decodes to a number',
    see: 'phases/13 §D3',
    type: t.unknown(),
    sdk: 7,
    wire: { integer: '7' },
    direction: 'decode',
  },
  {
    name: 'a dynamic record value holding undefined is absent, so it is omitted',
    see: 'phases/13 §A4',
    type: t.unknown(),
    sdk: { a: undefined, b: ['x'] },
    wire: { record: { b: ['x'] } },
    direction: 'encode',
  },

  // No value.
  {
    name: 'no value travels as null',
    see: 'phases/13 §D2',
    type: t.none(),
    sdk: undefined,
    wire: null,
  },
])

/** Inputs that must be rejected. */
export const REJECTION_VECTORS: readonly RejectionVector[] = Object.freeze([
  // Integers.
  {
    name: 'a fractional number that bypassed the Integer type',
    see: 'phases/13 §A2',
    type: t.integer(),
    input: 1.5,
    direction: 'encode',
    expectedIssueCodes: ['not-integer'],
  },
  {
    name: 'an integral number above the safe range that bypassed the Integer type',
    see: 'phases/13 §D10',
    type: t.integer(),
    input: 2 ** 53,
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'NaN is not an integer',
    see: 'phases/13 §A2',
    type: t.integer(),
    input: Number.NaN,
    direction: 'encode',
    expectedIssueCodes: ['not-integer'],
  },
  {
    name: 'numeric text is not an SDK integer',
    see: 'phases/13 §A2',
    type: t.integer(),
    input: '42',
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
  },
  {
    name: 'integer text above the safe range',
    see: 'phases/13 §D10',
    type: t.integer(),
    input: { integer: '9007199254740992' },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'integer text below the safe range',
    see: 'phases/13 §D10',
    type: t.integer(),
    input: { integer: '-9007199254740992' },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'integer text "-0"',
    see: 'phases/13 §D10',
    type: t.integer(),
    input: { integer: '-0' },
    direction: 'decode',
    expectedIssueCodes: ['not-integer'],
  },
  {
    name: 'integer text with leading zeros',
    see: 'phases/13 §D3',
    type: t.integer(),
    input: { integer: '007' },
    direction: 'decode',
    expectedIssueCodes: ['not-integer'],
  },
  {
    name: 'an integer payload that is a JSON number',
    see: 'phases/13 §D3',
    type: t.integer(),
    input: { integer: 42 },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
  },
  {
    name: 'a double record at an integer position',
    see: 'phases/13 §D3',
    type: t.integer(),
    input: { double: 42 },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
  },

  // Doubles.
  {
    name: 'an overflowing double literal that parsed to Infinity',
    see: 'phases/13 §D3',
    type: t.double(),
    input: { double: Number.POSITIVE_INFINITY },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'a bare JSON number at a double position',
    see: 'phases/13 §A2',
    type: t.double(),
    input: 3,
    direction: 'decode',
    expectedIssueCodes: ['invalid-type'],
  },
  {
    name: 'an unknown double state',
    see: 'phases/13 §D3',
    type: t.double(),
    input: { double: 'nan' },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
  },

  // Dates.
  {
    name: 'a day that does not exist',
    see: 'phases/13 §D3',
    type: t.date(),
    input: { date: '2026-02-30T00:00:00.000Z' },
    direction: 'decode',
    expectedIssueCodes: ['invalid-date'],
  },
  {
    name: 'date text without fractional digits',
    see: 'phases/13 §D3',
    type: t.date(),
    input: { date: '2026-10-31T17:04:05Z' },
    direction: 'decode',
    expectedIssueCodes: ['invalid-date'],
  },
  {
    name: 'an invalid Date',
    see: 'phases/13 §A3',
    type: t.date(),
    input: new Date(Number.NaN),
    direction: 'encode',
    expectedIssueCodes: ['invalid-date'],
  },
  {
    name: 'a Date after year 9999 has no wire form',
    see: 'phases/13 §D3',
    type: t.date(),
    input: at('+010000-01-01T00:00:00.000Z'),
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
  },

  // Geometry and color.
  {
    name: 'point members that are bare numbers on the wire',
    see: 'phases/13 §D3',
    type: t.point(),
    input: { x: 1, y: 2 },
    direction: 'decode',
    expectedIssueCodes: ['invalid-type', 'invalid-type'],
  },
  {
    name: 'a point with a third dimension',
    see: 'phases/13 §A3',
    type: t.point(),
    input: { x: 1, y: 2, z: 3 },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
  },
  {
    name: 'an rgb channel above 65535',
    see: 'phases/13 §A3',
    type: t.rgb(),
    input: { r: 65536, g: 0, b: 0 },
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'an rgb channel text above 65535',
    see: 'phases/13 §A3',
    type: t.rgb(),
    input: { r: { integer: '65536' }, g: { integer: '0' }, b: { integer: '0' } },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
  },
  {
    name: 'an rgb color with alpha',
    see: 'phases/13 §A3',
    type: t.rgb(),
    input: {
      r: Integer.validate(1),
      g: Integer.validate(1),
      b: Integer.validate(1),
      a: Integer.validate(1),
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
  },

  // Enums.
  {
    name: 'a non-member enum input',
    see: 'phases/13 §D10',
    type: statuses,
    input: 'postponed',
    direction: 'encode',
    expectedIssueCodes: ['unknown-enum-member'],
  },
  {
    name: 'a member from a newer app version',
    see: 'phases/13 §D10',
    type: statuses,
    input: 'postponed',
    direction: 'decode',
    expectedIssueCodes: ['unknown-enum-member'],
  },

  // Records.
  {
    name: 'a missing required field',
    see: 'phases/13 §A4',
    type: event,
    input: { count: Integer.validate(1) },
    direction: 'encode',
    expectedIssueCodes: ['missing-field'],
  },
  {
    name: 'a required field holding undefined',
    see: 'phases/13 §A4',
    type: event,
    input: { id: undefined, count: Integer.validate(1) },
    direction: 'encode',
    expectedIssueCodes: ['missing-field'],
  },
  {
    name: 'null at a non-nullable field',
    see: 'phases/13 §A4',
    type: event,
    input: { id: null, count: Integer.validate(1) },
    direction: 'encode',
    expectedIssueCodes: ['not-nullable'],
  },
  {
    name: 'every problem in a record is reported',
    see: 'phases/13 §A2',
    type: event,
    input: { id: 1, count: 1.5, extra: true },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type', 'not-integer', 'unknown-field'],
    expectedIssuePaths: [['id'], ['count'], ['extra']],
  },
  {
    name: 'a missing required field on the wire',
    see: 'phases/13 §A4',
    type: event,
    input: { id: 'E1' },
    direction: 'decode',
    expectedIssueCodes: ['missing-field'],
  },
  {
    name: 'an undeclared field on the wire',
    see: 'phases/13 §D3',
    type: event,
    input: { id: 'E1', count: { integer: '1' }, extra: 'x' },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
  },

  // Dynamic content.
  {
    name: 'a bare user object in dynamic content',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { name: 'not enveloped' },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
  },
  {
    name: 'a bare number in dynamic content',
    see: 'phases/13 §A2',
    type: t.unknown(),
    input: 42,
    direction: 'decode',
    expectedIssueCodes: ['invalid-type'],
  },
  {
    name: 'a reference cannot be represented in dynamic content',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { reference: { resource: 'events', form: 'identity', cardinality: 'one', id: 'E1' } },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a problem nested in dynamic envelopes is located in the user data on decode',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { record: { outer: { record: { inner: [{ double: 1 }, { integer: '007' }] } } } },
    direction: 'decode',
    expectedIssueCodes: ['not-integer'],
    expectedIssuePaths: [['outer', 'inner', 1]],
  },
  {
    name: 'a problem nested in dynamic content is located in the user data on encode',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { outer: { inner: [1, () => 1] } },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['outer', 'inner', 1]],
  },
  {
    name: 'a nested bare object in dynamic content is located in the user data',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { record: { list: [{ record: {} }, { name: 'x' }] } },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
    expectedIssuePaths: [['list', 1]],
  },
  {
    name: 'an unknown enum member deep in a record is located at its field',
    see: 'phases/13 §D10',
    type: t.record({ sessions: t.array(t.record({ status: statuses })) }),
    input: { sessions: [{ status: 'confirmed' }, { status: 'postponed' }] },
    direction: 'decode',
    expectedIssueCodes: ['unknown-enum-member'],
    expectedIssuePaths: [['sessions', 1, 'status']],
  },
  {
    name: 'undefined at the root of dynamic content is absence, which has no wire form',
    see: 'phases/13 §A4',
    type: t.unknown(),
    input: undefined,
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'an undefined array element in dynamic content is absence, which has no wire form',
    see: 'phases/13 §A4',
    type: t.unknown(),
    input: ['a', undefined],
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[1]],
  },
  {
    name: 'a function cannot be dynamic content',
    see: 'phases/13 §A2',
    type: t.unknown(),
    input: () => 1,
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
  },
  {
    name: 'a bigint cannot be dynamic content',
    see: 'phases/13 §A2',
    type: t.unknown(),
    input: 10n,
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
  },

  // No value.
  {
    name: 'null is not "no value" on the SDK side',
    see: 'phases/13 §D2',
    type: t.none(),
    input: null,
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
  },
])

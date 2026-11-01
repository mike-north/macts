/**
 * Unit tests for the in-process native value codec.
 *
 * Every vector runs twice: against the codec functions called directly, and
 * against the same functions as defined by `NATIVE_CODEC.prelude` evaluated in
 * an isolated `node:vm` context. The second run proves the embedded source is
 * self-contained, because that context has only the language built-ins.
 *
 * Expected values are derived by hand from the value contracts, not from codec
 * output.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — A2 (numbers),
 *   A3 (dates, geometry, colors), A4 (presence and nullability), D3 (numeric wire
 *   encoding and unambiguous decoding), D4 (native codec interface), D9
 *   (passthrough), D10 (precision, signed zero, classification, dates)
 */

import { runInNewContext } from 'node:vm'
import {
  INTEGER_LIMITS,
  PASSTHROUGH_PLAN,
  RGB_CHANNEL_MAX,
  SPECIAL_DOUBLE_STATES,
  WIRE_KEYS,
  type FieldPlan,
  type ValuePlan,
} from '@macts/contracts'
import { describe, expect, it } from 'vitest'
import { createNativeCodecFunctions } from './native-codec-functions.js'
import {
  NATIVE_CODEC,
  NATIVE_CODEC_ERROR_NAME,
  NATIVE_DECODE_FUNCTION,
  NATIVE_ENCODE_FUNCTION,
} from './native-codec.js'
import { evaluatePrelude, type CodecFunction } from './test-support/native-harness.js'

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

const STRING: ValuePlan = { kind: 'string' }
const BOOLEAN: ValuePlan = { kind: 'boolean' }
const INTEGER: ValuePlan = { kind: 'integer' }
const DOUBLE: ValuePlan = { kind: 'double' }
const DATE: ValuePlan = { kind: 'date' }
const POINT: ValuePlan = { kind: 'point' }
const RECTANGLE: ValuePlan = { kind: 'rectangle' }
const RGB: ValuePlan = { kind: 'rgb' }
const UNKNOWN: ValuePlan = { kind: 'unknown' }
const NONE: ValuePlan = { kind: 'none' }
const STATUS: ValuePlan = { kind: 'enum', members: ['confirmed', 'tentative', 'cancelled'] }

const arrayOf = (items: ValuePlan): ValuePlan => ({ kind: 'array', items })
const nullable = (value: ValuePlan): ValuePlan => ({ kind: 'nullable', value })
const recordOf = (fields: Record<string, FieldPlan>): ValuePlan => ({ kind: 'record', fields })
const required = (value: ValuePlan): FieldPlan => ({ value, presence: 'required' })
const optional = (value: ValuePlan): FieldPlan => ({ value, presence: 'optional' })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Terms that must never reach a user-facing message (ENG_TEAM_INSTRUCTIONS §3). */
const FORBIDDEN_TERMS = /applescript|jxa|osascript|specifier|apple event/i

/** Returns whatever `fn` throws; fails the test if it returns normally. */
function thrownBy(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to throw a codec error, but it returned')
}

interface ExpectedCodecError {
  readonly direction: 'decode' | 'encode'
  readonly path: readonly (string | number)[]
  /** Exact message, or substrings that must all appear. */
  readonly message?: string
  readonly includes?: readonly string[]
}

/**
 * Asserts that `fn` throws a codec error object with exactly the contracted
 * shape (D4): `name`, `direction`, `path`, `message`, and nothing else.
 */
function expectCodecError(fn: () => unknown, expected: ExpectedCodecError): void {
  const error = thrownBy(fn)
  expect(Object.keys(error as object).sort()).toEqual(['direction', 'message', 'name', 'path'])
  const { name, direction, path, message } = error as Record<string, unknown>
  expect({ name, direction, path }).toEqual({
    name: NATIVE_CODEC_ERROR_NAME,
    direction: expected.direction,
    path: expected.path,
  })
  expect(typeof message).toBe('string')
  const text = typeof message === 'string' ? message : ''
  expect(text.length).toBeGreaterThan(0)
  expect(text).not.toMatch(FORBIDDEN_TERMS)
  if (expected.message !== undefined) {
    expect(text).toBe(expected.message)
  }
  for (const fragment of expected.includes ?? []) {
    expect(text).toContain(fragment)
  }
}

/** Realm-independent `Date` check, since vm-produced dates have another prototype. */
function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]'
}

/** Epoch milliseconds of a decoded date, asserting it is a date first. */
function timeOf(value: unknown): number {
  expect(isDate(value)).toBe(true)
  return (value as Date).getTime()
}

/** The value a property holds, asserting it is an own property. */
function ownValue(object: unknown, key: string): unknown {
  expect(Object.hasOwn(object as object, key)).toBe(true)
  return (object as Record<string, unknown>)[key]
}

interface CodecUnderTest {
  readonly decode: CodecFunction
  readonly encode: CodecFunction
}

const direct = createNativeCodecFunctions()
const embedded = evaluatePrelude(NATIVE_CODEC.prelude)

const IMPLEMENTATIONS: readonly (readonly [string, CodecUnderTest])[] = [
  ['codec functions called directly', direct],
  ['codec prelude evaluated in an isolated context', embedded],
]

// A fixed instant: 2026-10-31T14:34:05.120Z.
const INSTANT_MS = Date.UTC(2026, 9, 31, 14, 34, 5, 120)

describe.each(IMPLEMENTATIONS)('%s', (_label, { decode, encode }) => {
  // -------------------------------------------------------------------------
  // passthrough and none
  // -------------------------------------------------------------------------

  describe('passthrough (D9)', () => {
    it('returns the same reference in both directions', () => {
      const value = { name: 'Inbox', nested: [1, { deep: true }] }
      expect(encode(value, PASSTHROUGH_PLAN)).toBe(value)
      expect(decode(value, PASSTHROUGH_PLAN)).toBe(value)
    })

    it('returns primitives and special numbers unchanged', () => {
      expect(Object.is(encode(-0, PASSTHROUGH_PLAN), -0)).toBe(true)
      expect(encode(Number.NaN, PASSTHROUGH_PLAN)).toBeNaN()
      expect(decode('text', PASSTHROUGH_PLAN)).toBe('text')
      expect(encode(undefined, PASSTHROUGH_PLAN)).toBeUndefined()
    })
  })

  describe('none', () => {
    it('encodes any native result as null', () => {
      expect(encode(undefined, NONE)).toBeNull()
      expect(encode({ ignored: true }, NONE)).toBeNull()
    })

    it('decodes any wire value as undefined', () => {
      expect(decode(null, NONE)).toBeUndefined()
      expect(decode('ignored', NONE)).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // string and boolean
  // -------------------------------------------------------------------------

  describe('string and boolean', () => {
    it('passes strings and booleans through in both directions', () => {
      expect(encode('hello', STRING)).toBe('hello')
      expect(decode('', STRING)).toBe('')
      expect(encode(true, BOOLEAN)).toBe(true)
      expect(decode(false, BOOLEAN)).toBe(false)
    })

    it('rejects a non-string at a string position', () => {
      expectCodecError(() => encode(1, STRING), {
        direction: 'encode',
        path: [],
        includes: ['string', '1'],
      })
      expectCodecError(() => decode(null, STRING), {
        direction: 'decode',
        path: [],
        includes: ['string', 'null'],
      })
    })

    it('rejects a non-boolean at a boolean position', () => {
      expectCodecError(() => encode('true', BOOLEAN), {
        direction: 'encode',
        path: [],
        includes: ['"true"'],
      })
      expectCodecError(() => decode(0, BOOLEAN), { direction: 'decode', path: [] })
    })
  })

  // -------------------------------------------------------------------------
  // integer (A2, D3, D10)
  // -------------------------------------------------------------------------

  describe('integer encode', () => {
    it('encodes integers as canonical decimal text', () => {
      expect(encode(42, INTEGER)).toEqual({ integer: '42' })
      expect(encode(-7, INTEGER)).toEqual({ integer: '-7' })
      expect(encode(0, INTEGER)).toEqual({ integer: '0' })
    })

    it('normalizes negative zero to "0" (D10: integers have no signed zero)', () => {
      expect(encode(-0, INTEGER)).toEqual({ integer: '0' })
    })

    it('accepts both ends of the safe-integer domain', () => {
      expect(encode(9007199254740991, INTEGER)).toEqual({ integer: '9007199254740991' })
      expect(encode(-9007199254740991, INTEGER)).toEqual({ integer: '-9007199254740991' })
    })

    it('rejects integers outside the safe domain instead of reclassifying them as doubles (D10)', () => {
      expectCodecError(() => encode(9007199254740992, INTEGER), {
        direction: 'encode',
        path: [],
        includes: ['9007199254740992'],
      })
      expectCodecError(() => encode(-9007199254740992, INTEGER), { direction: 'encode', path: [] })
      expectCodecError(() => encode(1e21, INTEGER), { direction: 'encode', path: [] })
    })

    it('rejects a fraction with a user-facing message', () => {
      expectCodecError(() => encode(1.5, INTEGER), {
        direction: 'encode',
        path: [],
        message: 'Expected an integer, received 1.5',
      })
    })

    it('rejects non-finite numbers and non-numbers', () => {
      expectCodecError(() => encode(Number.NaN, INTEGER), {
        direction: 'encode',
        path: [],
        includes: ['NaN'],
      })
      expectCodecError(() => encode(Infinity, INTEGER), {
        direction: 'encode',
        path: [],
        includes: ['Infinity'],
      })
      expectCodecError(() => encode(-Infinity, INTEGER), { direction: 'encode', path: [] })
      expectCodecError(() => encode('42', INTEGER), {
        direction: 'encode',
        path: [],
        includes: ['"42"'],
      })
      expectCodecError(() => encode(null, INTEGER), { direction: 'encode', path: [] })
    })
  })

  describe('integer decode', () => {
    it('decodes canonical decimal text to a number', () => {
      expect(decode({ integer: '42' }, INTEGER)).toBe(42)
      expect(decode({ integer: '0' }, INTEGER)).toBe(0)
      expect(decode({ integer: '-9007199254740991' }, INTEGER)).toBe(-9007199254740991)
      expect(decode({ integer: '9007199254740991' }, INTEGER)).toBe(9007199254740991)
    })

    it.each(['-0', '042', '+1', '1e3', '1.0', '', ' 1', '0x10', '00'])(
      'rejects non-canonical integer text %j',
      (text) => {
        expectCodecError(() => decode({ integer: text }, INTEGER), {
          direction: 'decode',
          path: [],
        })
      }
    )

    it('rejects text outside the safe domain rather than rounding', () => {
      expectCodecError(() => decode({ integer: '9007199254740992' }, INTEGER), {
        direction: 'decode',
        path: [],
        includes: ['9007199254740992'],
      })
      expectCodecError(() => decode({ integer: '-9007199254740993' }, INTEGER), {
        direction: 'decode',
        path: [],
      })
    })

    it('rejects a numeric payload, a bare number, extra keys, and null', () => {
      expectCodecError(() => decode({ integer: 42 }, INTEGER), { direction: 'decode', path: [] })
      expectCodecError(() => decode(42, INTEGER), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ integer: '1', extra: 1 }, INTEGER), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ double: 1 }, INTEGER), { direction: 'decode', path: [] })
      expectCodecError(() => decode(null, INTEGER), { direction: 'decode', path: [] })
    })
  })

  // -------------------------------------------------------------------------
  // double (A2, D3, D10)
  // -------------------------------------------------------------------------

  describe('double encode', () => {
    it('keeps an integral double classified as a double (A2)', () => {
      expect(encode(3, DOUBLE)).toEqual({ double: 3 })
      expect(encode(0, DOUBLE)).toEqual({ double: 0 })
      expect(encode(1.25, DOUBLE)).toEqual({ double: 1.25 })
    })

    it('encodes the special states explicitly', () => {
      expect(encode(Number.NaN, DOUBLE)).toEqual({ double: 'NaN' })
      expect(encode(Infinity, DOUBLE)).toEqual({ double: 'Infinity' })
      expect(encode(-Infinity, DOUBLE)).toEqual({ double: '-Infinity' })
      expect(encode(-0, DOUBLE)).toEqual({ double: '-0' })
    })

    it('produces output that survives JSON serialization losslessly', () => {
      expect(JSON.stringify(encode(-0, DOUBLE))).toBe('{"double":"-0"}')
      expect(JSON.stringify(encode(Number.NaN, DOUBLE))).toBe('{"double":"NaN"}')
    })

    it('rejects non-numbers', () => {
      expectCodecError(() => encode('3', DOUBLE), {
        direction: 'encode',
        path: [],
        includes: ['"3"'],
      })
      expectCodecError(() => encode(undefined, DOUBLE), { direction: 'encode', path: [] })
    })
  })

  describe('double decode', () => {
    it('decodes finite JSON numbers', () => {
      expect(decode({ double: 3 }, DOUBLE)).toBe(3)
      expect(decode({ double: -2.5 }, DOUBLE)).toBe(-2.5)
    })

    it('decodes the special states', () => {
      expect(decode({ double: 'NaN' }, DOUBLE)).toBeNaN()
      expect(decode({ double: 'Infinity' }, DOUBLE)).toBe(Infinity)
      expect(decode({ double: '-Infinity' }, DOUBLE)).toBe(-Infinity)
      expect(Object.is(decode({ double: '-0' }, DOUBLE), -0)).toBe(true)
    })

    it('accepts a JSON -0 number and yields -0 (D3)', () => {
      expect(Object.is(decode({ double: -0 }, DOUBLE), -0)).toBe(true)
    })

    it('rejects raw non-finite numbers, unknown states, and malformed records', () => {
      expectCodecError(() => decode({ double: Infinity }, DOUBLE), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ double: Number.NaN }, DOUBLE), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ double: 'nan' }, DOUBLE), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ double: '3' }, DOUBLE), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ double: null }, DOUBLE), { direction: 'decode', path: [] })
      expectCodecError(() => decode(3, DOUBLE), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ double: 1, integer: '1' }, DOUBLE), {
        direction: 'decode',
        path: [],
      })
    })
  })

  // -------------------------------------------------------------------------
  // date (A3, D3, D10)
  // -------------------------------------------------------------------------

  describe('date encode', () => {
    it('emits UTC text with exactly three fractional digits', () => {
      expect(encode(new Date(INSTANT_MS), DATE)).toEqual({ date: '2026-10-31T14:34:05.120Z' })
      expect(encode(new Date(Date.UTC(2026, 0, 1)), DATE)).toEqual({
        date: '2026-01-01T00:00:00.000Z',
      })
    })

    it('accepts a date created in another realm', () => {
      const foreign: unknown = runInNewContext('new Date(0)')
      expect(encode(foreign, DATE)).toEqual({ date: '1970-01-01T00:00:00.000Z' })
    })

    it('accepts the first and last years of the four-digit range', () => {
      const yearZero = new Date(0)
      yearZero.setUTCFullYear(0, 0, 1)
      expect(encode(yearZero, DATE)).toEqual({ date: '0000-01-01T00:00:00.000Z' })
      expect(encode(new Date(Date.UTC(9999, 11, 31, 23, 59, 59, 999)), DATE)).toEqual({
        date: '9999-12-31T23:59:59.999Z',
      })
    })

    it('rejects years outside 0000..9999', () => {
      expectCodecError(() => encode(new Date(Date.UTC(10000, 0, 1)), DATE), {
        direction: 'encode',
        path: [],
      })
      const beforeYearZero = new Date(0)
      beforeYearZero.setUTCFullYear(-1, 0, 1)
      expectCodecError(() => encode(beforeYearZero, DATE), { direction: 'encode', path: [] })
    })

    it('rejects invalid dates, date strings, and epoch numbers', () => {
      expectCodecError(() => encode(new Date(Number.NaN), DATE), { direction: 'encode', path: [] })
      expectCodecError(() => encode('2026-10-31T14:34:05.120Z', DATE), {
        direction: 'encode',
        path: [],
      })
      expectCodecError(() => encode(INSTANT_MS, DATE), { direction: 'encode', path: [] })
    })
  })

  describe('date decode', () => {
    it('decodes an explicit offset to the right instant', () => {
      expect(timeOf(decode({ date: '2026-10-31T17:04:05.120+02:30' }, DATE))).toBe(INSTANT_MS)
      expect(timeOf(decode({ date: '2026-10-31T09:34:05.120-05:00' }, DATE))).toBe(INSTANT_MS)
    })

    it('decodes UTC text', () => {
      expect(timeOf(decode({ date: '2026-10-31T14:34:05.120Z' }, DATE))).toBe(INSTANT_MS)
    })

    it('decodes a leap day and the four-digit year bounds', () => {
      expect(timeOf(decode({ date: '2024-02-29T00:00:00.000Z' }, DATE))).toBe(Date.UTC(2024, 1, 29))
      expect(timeOf(decode({ date: '9999-12-31T23:59:59.999Z' }, DATE))).toBe(
        Date.UTC(9999, 11, 31, 23, 59, 59, 999)
      )
      const yearZero = new Date(0)
      yearZero.setUTCFullYear(0, 0, 1)
      expect(timeOf(decode({ date: '0000-01-01T00:00:00.000Z' }, DATE))).toBe(yearZero.getTime())
    })

    it.each([
      '2026-10-31T14:34:05Z',
      '2026-10-31T14:34:05.12Z',
      '2026-10-31T14:34:05.1200Z',
      '2026-10-31T14:34:05.120',
      '2026-10-31 14:34:05.120Z',
      '2026-10-31T14:34:05.120+0230',
      '2026-10-31T14:34:05.120z',
      '2026-02-30T00:00:00.000Z',
      '2025-02-29T00:00:00.000Z',
      '2026-13-01T00:00:00.000Z',
      '2026-00-01T00:00:00.000Z',
      '2026-10-31T24:00:00.000Z',
      '2026-10-31T23:60:00.000Z',
      '2026-10-31T23:59:60.000Z',
      '2026-10-31T00:00:00.000+24:00',
      '+002026-10-31T00:00:00.000Z',
    ])('rejects date text %j', (text) => {
      expectCodecError(() => decode({ date: text }, DATE), { direction: 'decode', path: [] })
    })

    it('rejects a bare string and a numeric payload', () => {
      expectCodecError(() => decode('2026-10-31T14:34:05.120Z', DATE), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ date: INSTANT_MS }, DATE), { direction: 'decode', path: [] })
    })
  })

  // -------------------------------------------------------------------------
  // point and rectangle (A3)
  // -------------------------------------------------------------------------

  describe('point', () => {
    const wire = { x: { double: 1 }, y: { double: 2.5 } }

    it('encodes an {x, y} object and a two-element list to wrapped doubles', () => {
      expect(encode({ x: 1, y: 2.5 }, POINT)).toEqual(wire)
      expect(encode([1, 2.5], POINT)).toEqual(wire)
    })

    it('keeps special double states in members and drops native extras', () => {
      expect(encode({ x: -0, y: Number.NaN, z: 9 }, POINT)).toEqual({
        x: { double: '-0' },
        y: { double: 'NaN' },
      })
    })

    it('rejects missing or non-numeric members with their path', () => {
      expectCodecError(() => encode({ x: 1 }, POINT), { direction: 'encode', path: ['y'] })
      expectCodecError(() => encode({ x: '1', y: 2 }, POINT), { direction: 'encode', path: ['x'] })
      expectCodecError(() => encode([1, '2'], POINT), { direction: 'encode', path: [1] })
    })

    it('rejects lists of the wrong length and non-objects', () => {
      expectCodecError(() => encode([1, 2, 3], POINT), { direction: 'encode', path: [] })
      expectCodecError(() => encode(null, POINT), { direction: 'encode', path: [] })
      expectCodecError(() => encode(5, POINT), { direction: 'encode', path: [] })
    })

    it('decodes to a plain {x, y} of numbers', () => {
      expect(decode(wire, POINT)).toEqual({ x: 1, y: 2.5 })
      const special = decode({ x: { double: '-0' }, y: { double: 'Infinity' } }, POINT)
      expect(Object.is(ownValue(special, 'x'), -0)).toBe(true)
      expect(ownValue(special, 'y')).toBe(Infinity)
    })

    it('rejects extra or missing members and unwrapped numbers on decode', () => {
      expectCodecError(() => decode({ ...wire, z: { double: 3 } }, POINT), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ x: { double: 1 } }, POINT), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ x: 1, y: 2 }, POINT), { direction: 'decode', path: ['x'] })
      expectCodecError(() => decode([{ double: 1 }, { double: 2 }], POINT), {
        direction: 'decode',
        path: [],
      })
    })
  })

  describe('rectangle', () => {
    const wire = {
      x: { double: 0 },
      y: { double: 10 },
      width: { double: 100 },
      height: { double: 50.5 },
    }

    it('encodes an {x, y, width, height} object to wrapped doubles', () => {
      expect(encode({ x: 0, y: 10, width: 100, height: 50.5 }, RECTANGLE)).toEqual(wire)
    })

    it('rejects a four-element list as ambiguous', () => {
      expectCodecError(() => encode([0, 10, 100, 50.5], RECTANGLE), {
        direction: 'encode',
        path: [],
        includes: ['x, y, width, and height', 'ambiguous'],
      })
    })

    it('rejects a missing member with its path', () => {
      expectCodecError(() => encode({ x: 0, y: 10, width: 100 }, RECTANGLE), {
        direction: 'encode',
        path: ['height'],
      })
    })

    it('decodes to a plain rectangle and rejects extra members', () => {
      expect(decode(wire, RECTANGLE)).toEqual({ x: 0, y: 10, width: 100, height: 50.5 })
      expectCodecError(() => decode({ ...wire, depth: { double: 1 } }, RECTANGLE), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({ ...wire, height: { integer: '5' } }, RECTANGLE), {
        direction: 'decode',
        path: ['height'],
      })
    })
  })

  // -------------------------------------------------------------------------
  // rgb (A3)
  // -------------------------------------------------------------------------

  describe('rgb', () => {
    const wire = { r: { integer: '65535' }, g: { integer: '0' }, b: { integer: '257' } }

    it('encodes a three-channel list and both object spellings', () => {
      expect(encode([65535, 0, 257], RGB)).toEqual(wire)
      expect(encode({ r: 65535, g: 0, b: 257 }, RGB)).toEqual(wire)
      expect(encode({ red: 65535, green: 0, blue: 257 }, RGB)).toEqual(wire)
    })

    it('rejects channels outside 0..65535 or fractional, with the channel path', () => {
      expectCodecError(() => encode([65536, 0, 0], RGB), {
        direction: 'encode',
        path: [0],
        includes: ['65536'],
      })
      expectCodecError(() => encode([0, 1.5, 0], RGB), {
        direction: 'encode',
        path: [1],
        includes: ['1.5'],
      })
      expectCodecError(() => encode([0, 0, -1], RGB), { direction: 'encode', path: [2] })
      expectCodecError(() => encode({ r: 1, g: 2, b: 70000 }, RGB), {
        direction: 'encode',
        path: ['b'],
      })
    })

    it('rejects lists of the wrong length and incomplete objects', () => {
      expectCodecError(() => encode([0, 0], RGB), { direction: 'encode', path: [] })
      expectCodecError(() => encode([0, 0, 0, 0], RGB), { direction: 'encode', path: [] })
      expectCodecError(() => encode({ r: 1, g: 2 }, RGB), { direction: 'encode', path: ['b'] })
      expectCodecError(() => encode('#ffffff', RGB), { direction: 'encode', path: [] })
    })

    it('decodes to the 16-bit channel list', () => {
      expect(decode(wire, RGB)).toEqual([65535, 0, 257])
    })

    it('rejects out-of-range channels, double channels, and extra members on decode', () => {
      expectCodecError(() => decode({ ...wire, r: { integer: '65536' } }, RGB), {
        direction: 'decode',
        path: ['r'],
      })
      expectCodecError(() => decode({ ...wire, g: { double: 1 } }, RGB), {
        direction: 'decode',
        path: ['g'],
      })
      expectCodecError(() => decode({ ...wire, a: { integer: '1' } }, RGB), {
        direction: 'decode',
        path: [],
      })
    })
  })

  // -------------------------------------------------------------------------
  // enum (A5, D10)
  // -------------------------------------------------------------------------

  describe('enum', () => {
    it('passes members through in both directions', () => {
      expect(encode('tentative', STATUS)).toBe('tentative')
      expect(decode('cancelled', STATUS)).toBe('cancelled')
    })

    it('rejects an unknown member, naming it, the known members, and the upgrade path', () => {
      expectCodecError(() => encode('postponed', STATUS), {
        direction: 'encode',
        path: [],
        includes: ['"postponed"', '"confirmed"', '"tentative"', '"cancelled"', 'newer', 'upgrad'],
      })
    })

    it('rejects non-strings and unknown members on decode', () => {
      expectCodecError(() => encode(1, STATUS), { direction: 'encode', path: [] })
      expectCodecError(() => decode('postponed', STATUS), {
        direction: 'decode',
        path: [],
        includes: ['"postponed"'],
      })
    })
  })

  // -------------------------------------------------------------------------
  // array
  // -------------------------------------------------------------------------

  describe('array', () => {
    it('encodes and decodes elements by the item plan', () => {
      expect(encode([1, 2], arrayOf(INTEGER))).toEqual([{ integer: '1' }, { integer: '2' }])
      expect(decode([{ integer: '1' }, { integer: '2' }], arrayOf(INTEGER))).toEqual([1, 2])
      expect(encode([], arrayOf(INTEGER))).toEqual([])
    })

    it('reports the failing element index', () => {
      expectCodecError(() => encode([1, 2.5], arrayOf(INTEGER)), { direction: 'encode', path: [1] })
      expectCodecError(() => decode([{ integer: '1' }, 2], arrayOf(INTEGER)), {
        direction: 'decode',
        path: [1],
      })
    })

    it('rejects non-lists', () => {
      expectCodecError(() => encode({ 0: 1, length: 1 }, arrayOf(INTEGER)), {
        direction: 'encode',
        path: [],
      })
      expectCodecError(() => decode('[]', arrayOf(INTEGER)), { direction: 'decode', path: [] })
    })
  })

  // -------------------------------------------------------------------------
  // record presence and nullability (A4, D10 "missing value")
  // -------------------------------------------------------------------------

  describe('record encode presence matrix', () => {
    type Expectation = 'error' | 'omit' | 'null'
    interface Row {
      readonly presence: 'required' | 'optional'
      readonly isNullable: boolean
      readonly whenNull: Expectation
      readonly whenUndefined: Expectation
    }
    const MATRIX: readonly Row[] = [
      { presence: 'required', isNullable: false, whenNull: 'error', whenUndefined: 'error' },
      { presence: 'required', isNullable: true, whenNull: 'null', whenUndefined: 'null' },
      { presence: 'optional', isNullable: false, whenNull: 'omit', whenUndefined: 'omit' },
      { presence: 'optional', isNullable: true, whenNull: 'null', whenUndefined: 'omit' },
    ]

    const planFor = (row: Row): ValuePlan =>
      recordOf({
        count: { presence: row.presence, value: row.isNullable ? nullable(INTEGER) : INTEGER },
      })

    const check = (row: Row, native: object, expectation: Expectation): void => {
      const plan = planFor(row)
      if (expectation === 'error') {
        expectCodecError(() => encode(native, plan), { direction: 'encode', path: ['count'] })
        return
      }
      const result = encode(native, plan)
      if (expectation === 'omit') {
        expect(Object.hasOwn(result as object, 'count')).toBe(false)
        expect(result).toEqual({})
      } else {
        expect(ownValue(result, 'count')).toBeNull()
      }
    }

    describe.each(MATRIX)('$presence field, nullable: $isNullable', (row) => {
      it('encodes a present value', () => {
        expect(ownValue(encode({ count: 5 }, planFor(row)), 'count')).toEqual({ integer: '5' })
      })

      it(`native null → ${row.whenNull}`, () => {
        check(row, { count: null }, row.whenNull)
      })

      it(`native undefined → ${row.whenUndefined}`, () => {
        check(row, { count: undefined }, row.whenUndefined)
      })

      it(`absent key → ${row.whenUndefined}`, () => {
        check(row, {}, row.whenUndefined)
      })
    })

    it('names the missing required field', () => {
      expectCodecError(() => encode({}, recordOf({ title: required(STRING) })), {
        direction: 'encode',
        path: ['title'],
        includes: ['"title"'],
      })
    })

    it('never emits an own property holding undefined', () => {
      const result = encode(
        { a: undefined, b: 'x' },
        recordOf({ a: optional(STRING), b: optional(STRING), c: optional(nullable(STRING)) })
      )
      expect(Object.keys(result as object)).toEqual(['b'])
    })
  })

  describe('record', () => {
    const EVENT = recordOf({
      title: required(STRING),
      count: required(INTEGER),
      note: optional(nullable(STRING)),
    })

    it('encodes only planned fields and drops native extras', () => {
      expect(encode({ title: 'Standup', count: 3, internal: { secret: true } }, EVENT)).toEqual({
        title: 'Standup',
        count: { integer: '3' },
      })
    })

    it('rejects non-objects', () => {
      for (const native of [null, [1], 'x', new Date(INSTANT_MS)]) {
        expectCodecError(() => encode(native, EVENT), { direction: 'encode', path: [] })
      }
      expectCodecError(() => decode([], EVENT), { direction: 'decode', path: [] })
      expectCodecError(() => decode(null, EVENT), { direction: 'decode', path: [] })
    })

    it('does not read inherited properties as fields', () => {
      expectCodecError(() => encode({}, recordOf({ toString: required(STRING) })), {
        direction: 'encode',
        path: ['toString'],
      })
    })

    it('writes a field named __proto__ as an own property, never as the prototype', () => {
      // `Object.fromEntries` creates an own `__proto__` key; a literal would set the prototype.
      const plan = recordOf(
        Object.fromEntries([['__proto__', required(recordOf({ polluted: required(BOOLEAN) }))]])
      )
      const native: unknown = JSON.parse('{"__proto__": {"polluted": true}}')
      const encoded = encode(native, plan)
      expect(ownValue(encoded, '__proto__')).toEqual({ polluted: true })
      expect((encoded as { polluted?: unknown }).polluted).toBeUndefined()
      const decoded = decode(encoded, plan)
      expect(ownValue(decoded, '__proto__')).toEqual({ polluted: true })
      expect((decoded as { polluted?: unknown }).polluted).toBeUndefined()
    })

    it('decodes present fields and leaves absent optional fields with no own property', () => {
      const decoded = decode({ title: 'Standup', count: { integer: '3' } }, EVENT)
      expect(decoded).toEqual({ title: 'Standup', count: 3 })
      expect(Object.hasOwn(decoded as object, 'note')).toBe(false)
    })

    it('keeps a present null as data on decode (A4)', () => {
      const decoded = decode({ title: 'Standup', count: { integer: '3' }, note: null }, EVENT)
      expect(ownValue(decoded, 'note')).toBeNull()
    })

    it('rejects a missing required field, an unexpected field, and null at a non-nullable field', () => {
      expectCodecError(() => decode({ title: 'Standup' }, EVENT), {
        direction: 'decode',
        path: ['count'],
      })
      expectCodecError(() => decode({ title: 'a', count: { integer: '1' }, extra: 1 }, EVENT), {
        direction: 'decode',
        path: ['extra'],
        includes: ['"extra"'],
      })
      expectCodecError(() => decode({ title: null, count: { integer: '1' } }, EVENT), {
        direction: 'decode',
        path: ['title'],
      })
    })
  })

  describe('nullable', () => {
    it('maps null and undefined to null on encode, and null to null on decode', () => {
      expect(encode(null, nullable(INTEGER))).toBeNull()
      expect(encode(undefined, nullable(INTEGER))).toBeNull()
      expect(decode(null, nullable(INTEGER))).toBeNull()
    })

    it('encodes and decodes other values by the inner plan', () => {
      expect(encode(4, nullable(INTEGER))).toEqual({ integer: '4' })
      expect(decode({ integer: '4' }, nullable(INTEGER))).toBe(4)
      expectCodecError(() => encode(4.5, nullable(INTEGER)), { direction: 'encode', path: [] })
    })
  })

  // -------------------------------------------------------------------------
  // nesting and error paths
  // -------------------------------------------------------------------------

  describe('nested arrays of records of doubles', () => {
    const PLAN = recordOf({
      events: required(
        arrayOf(
          recordOf({
            title: required(STRING),
            count: required(INTEGER),
            weights: required(arrayOf(DOUBLE)),
            at: optional(DATE),
          })
        )
      ),
    })
    const WIRE = {
      events: [
        {
          title: 'a',
          count: { integer: '2' },
          weights: [{ double: 3 }, { double: '-0' }, { double: 'NaN' }],
          at: { date: '2026-10-31T14:34:05.120Z' },
        },
        { title: 'b', count: { integer: '0' }, weights: [] },
      ],
    }

    it('encodes the whole tree', () => {
      const native = {
        events: [
          { title: 'a', count: 2, weights: [3, -0, Number.NaN], at: new Date(INSTANT_MS) },
          { title: 'b', count: -0, weights: [], at: undefined },
        ],
      }
      expect(encode(native, PLAN)).toEqual(WIRE)
    })

    it('decodes the whole tree', () => {
      const decoded = decode(WIRE, PLAN) as { events: Record<string, unknown>[] }
      const [first, second] = decoded.events
      expect(first?.['title']).toBe('a')
      expect(first?.['count']).toBe(2)
      const weights = first?.['weights'] as number[]
      expect(weights[0]).toBe(3)
      expect(Object.is(weights[1], -0)).toBe(true)
      expect(weights[2]).toBeNaN()
      expect(timeOf(first?.['at'])).toBe(INSTANT_MS)
      expect(second).toEqual({ title: 'b', count: 0, weights: [] })
      expect(Object.hasOwn(second as object, 'at')).toBe(false)
    })

    it('reports outermost-first paths through arrays and records', () => {
      const native = { events: [{ title: 'a', count: 1.5, weights: [] }] }
      expectCodecError(() => encode(native, PLAN), {
        direction: 'encode',
        path: ['events', 0, 'count'],
        message: 'Expected an integer, received 1.5',
      })
      expectCodecError(
        () =>
          decode(
            { events: [WIRE.events[1], { ...WIRE.events[1], weights: [{ double: 'x' }] }] },
            PLAN
          ),
        { direction: 'decode', path: ['events', 1, 'weights', 0] }
      )
    })
  })

  // -------------------------------------------------------------------------
  // dynamic content (D3, D10)
  // -------------------------------------------------------------------------

  describe('dynamic encode', () => {
    it('keeps strings, booleans, and null as themselves', () => {
      expect(encode('a', UNKNOWN)).toBe('a')
      expect(encode(false, UNKNOWN)).toBe(false)
      expect(encode(null, UNKNOWN)).toBeNull()
    })

    it('encodes every number as a double, never inferring integers from integrality (D10)', () => {
      expect(encode(3, UNKNOWN)).toEqual({ double: 3 })
      expect(encode(3.5, UNKNOWN)).toEqual({ double: 3.5 })
      expect(encode(Number.NaN, UNKNOWN)).toEqual({ double: 'NaN' })
      expect(encode(-0, UNKNOWN)).toEqual({ double: '-0' })
    })

    it('encodes dates and arrays', () => {
      expect(encode(new Date(INSTANT_MS), UNKNOWN)).toEqual({ date: '2026-10-31T14:34:05.120Z' })
      expect(encode([1, 'a', [true]], UNKNOWN)).toEqual([{ double: 1 }, 'a', [true]])
    })

    it('envelopes user records so they cannot impersonate a control record (D3)', () => {
      expect(encode({ integer: '42' }, UNKNOWN)).toEqual({ record: { integer: '42' } })
      expect(encode({ a: 1, b: { c: null } }, UNKNOWN)).toEqual({
        record: { a: { double: 1 }, b: { record: { c: null } } },
      })
    })

    it('omits undefined record values and maps undefined elsewhere to null', () => {
      const encoded = encode({ a: undefined, b: 'x' }, UNKNOWN)
      expect(encoded).toEqual({ record: { b: 'x' } })
      expect(Object.hasOwn((encoded as { record: object }).record, 'a')).toBe(false)
      expect(encode(undefined, UNKNOWN)).toBeNull()
      expect(encode([undefined, 1], UNKNOWN)).toEqual([null, { double: 1 }])
    })

    it('rejects functions and other non-plain objects with their path', () => {
      expectCodecError(() => encode(() => 1, UNKNOWN), {
        direction: 'encode',
        path: [],
        includes: ['nsupported value in dynamic content'],
      })
      expectCodecError(() => encode({ a: [1, new Map()] }, UNKNOWN), {
        direction: 'encode',
        path: ['a', 1],
      })
      expectCodecError(() => encode(new Date(Number.NaN), UNKNOWN), {
        direction: 'encode',
        path: [],
      })
    })
  })

  describe('dynamic decode', () => {
    it('decodes self-describing content', () => {
      expect(decode('a', UNKNOWN)).toBe('a')
      expect(decode(true, UNKNOWN)).toBe(true)
      expect(decode(null, UNKNOWN)).toBeNull()
      expect(decode({ integer: '42' }, UNKNOWN)).toBe(42)
      expect(decode({ double: 'Infinity' }, UNKNOWN)).toBe(Infinity)
      expect(timeOf(decode({ date: '2026-10-31T17:04:05.120+02:30' }, UNKNOWN))).toBe(INSTANT_MS)
      expect(decode([{ double: 1 }, ['x']], UNKNOWN)).toEqual([1, ['x']])
    })

    it('unwraps record envelopes, round-tripping a record shaped like a control record', () => {
      expect(decode({ record: { integer: '42' } }, UNKNOWN)).toEqual({ integer: '42' })
      expect(decode({ record: { a: { integer: '1' }, b: [{ record: {} }] } }, UNKNOWN)).toEqual({
        a: 1,
        b: [{}],
      })
    })

    it('rejects bare objects, non-value control records, and multi-key control records', () => {
      expectCodecError(() => decode({ name: 'Inbox' }, UNKNOWN), {
        direction: 'decode',
        path: [],
        includes: ['nrecognized value in dynamic content'],
      })
      expectCodecError(() => decode({ reference: {} }, UNKNOWN), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ file: {} }, UNKNOWN), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ integer: '1', double: 1 }, UNKNOWN), {
        direction: 'decode',
        path: [],
      })
      expectCodecError(() => decode({}, UNKNOWN), { direction: 'decode', path: [] })
    })

    it('rejects bare numbers, malformed envelopes, and reports nested paths', () => {
      expectCodecError(() => decode(3, UNKNOWN), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ record: [1] }, UNKNOWN), { direction: 'decode', path: [] })
      expectCodecError(() => decode({ record: { a: [{ b: 1 }] } }, UNKNOWN), {
        direction: 'decode',
        path: ['a', 0],
      })
    })
  })

  describe('impersonation at a typed record position (D3)', () => {
    it('reads {integer: "42"} as a record with a string field, not a number', () => {
      const plan = recordOf({ integer: required(STRING) })
      expect(decode({ integer: '42' }, plan)).toEqual({ integer: '42' })
      expect(encode({ integer: '42' }, plan)).toEqual({ integer: '42' })
    })
  })

  // -------------------------------------------------------------------------
  // kinds that land later
  // -------------------------------------------------------------------------

  describe('reference, file, and file-source', () => {
    const LATER: readonly ValuePlan[] = [
      { kind: 'reference', resource: 'calendar', cardinality: 'one' },
      { kind: 'file' },
      { kind: 'file-source' },
    ]

    it.each(LATER)('rejects $kind in both directions as not supported yet', (plan) => {
      expectCodecError(() => encode({}, plan), {
        direction: 'encode',
        path: [],
        includes: ['not supported yet'],
      })
      expectCodecError(() => decode({}, plan), {
        direction: 'decode',
        path: [],
        includes: ['not supported yet'],
      })
    })

    it('reports the path of an unsupported kind nested in a record', () => {
      const plan = recordOf({ attachment: required({ kind: 'file' }) })
      expectCodecError(() => encode({ attachment: {} }, plan), {
        direction: 'encode',
        path: ['attachment'],
      })
    })
  })

  it('rejects an unrecognized plan kind', () => {
    // Plans arrive as embedded JSON; a malformed one must fail loudly.
    const bogus = { kind: 'bogus' } as unknown as ValuePlan
    expectCodecError(() => encode(1, bogus), { direction: 'encode', path: [] })
    expectCodecError(() => decode(1, bogus), { direction: 'decode', path: [] })
  })
})

describe('NATIVE_CODEC.prelude', () => {
  it('defines exactly the decode and encode globals and nothing else', () => {
    expect(embedded.addedGlobals).toEqual([NATIVE_DECODE_FUNCTION, NATIVE_ENCODE_FUNCTION].sort())
  })

  it('is printable ASCII only, so it survives any source-text encoding of the automation process', () => {
    expect(NATIVE_CODEC.prelude).toMatch(/^[\t\n\x20-\x7e]*$/)
  })

  it('is a frozen value', () => {
    expect(Object.isFrozen(NATIVE_CODEC)).toBe(true)
    expect(typeof NATIVE_CODEC.prelude).toBe('string')
  })
})

describe('codec literals', () => {
  // The embedded source cannot import constants, so it spells them literally.
  // These assertions keep those spellings from drifting from the contracts; the
  // vectors above prove the embedded copy behaves by the same spellings.
  it('match the exported contract constants', () => {
    const { literals } = direct
    expect(literals.errorName).toBe(NATIVE_CODEC_ERROR_NAME)
    expect(literals.integerLimits).toEqual({ min: INTEGER_LIMITS.min, max: INTEGER_LIMITS.max })
    expect(literals.rgbChannelMax).toBe(RGB_CHANNEL_MAX)
    expect(literals.specialDoubleStates).toEqual([...SPECIAL_DOUBLE_STATES])
    expect(literals.wireKeys).toEqual({
      integer: WIRE_KEYS.integer,
      double: WIRE_KEYS.double,
      date: WIRE_KEYS.date,
      record: WIRE_KEYS.record,
    })
  })
})

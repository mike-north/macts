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
 *   encoding and unambiguous decoding), D4 (native codec interface), D7
 *   (reference wire forms, native emission), D9 (passthrough), D10 (precision,
 *   signed zero, classification, dates, identifier targeting)
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
  NATIVE_CONTAINED_REFERENCE_KEY,
  NATIVE_DECODE_FUNCTION,
  NATIVE_ENCODE_FUNCTION,
  type NativeCodecEnvironment,
  type NativeReferenceTable,
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
// References
// ---------------------------------------------------------------------------

const PERSON_REF: ValuePlan = { kind: 'reference', resource: 'Person', cardinality: 'one' }
const PEOPLE_REF: ValuePlan = { kind: 'reference', resource: 'Person', cardinality: 'many' }
const WINDOW_REF: ValuePlan = { kind: 'reference', resource: 'Window', cardinality: 'one' }
const TRACK_REF: ValuePlan = { kind: 'reference', resource: 'Track', cardinality: 'one' }
const EMAIL_REF: ValuePlan = { kind: 'reference', resource: 'Email', cardinality: 'one' }
const NOTE_REF: ValuePlan = { kind: 'reference', resource: 'Note', cardinality: 'one' }
const ALBUM_REF: ValuePlan = { kind: 'reference', resource: 'Album', cardinality: 'one' }

/**
 * The reference table of the stand-in app, one resource per case the codec
 * tells apart:
 *
 * - `Person`: text identifier, found by id at the application;
 * - `Window`: integer identifier, found by id;
 * - `Track`: text identifier, found by matching its `persistentID` property;
 * - `Email`: has an identifier, but is found only within its person, so it has
 *   no addressing;
 * - `Note`: no identifier and no addressing;
 * - `Album` is not listed at all.
 */
const REFERENCES: NativeReferenceTable = {
  Person: { id: STRING, addressing: { collection: 'people', lookup: 'byId', property: 'id' } },
  Window: { id: INTEGER, addressing: { collection: 'windows', lookup: 'byId', property: 'id' } },
  Track: {
    id: STRING,
    addressing: { collection: 'tracks', lookup: 'byProperty', property: 'persistentID' },
  },
  Email: { id: STRING },
  Note: {},
}

/** A single identity reference in wire form. */
function identity(resource: string, id: unknown): Record<string, Record<string, unknown>> {
  return { reference: { resource, form: 'identity', cardinality: 'one', id } }
}

/** A single selector reference in wire form. */
function selector(resource: string, select: unknown): Record<string, Record<string, unknown>> {
  return { reference: { resource, form: 'selector', cardinality: 'one', selector: select } }
}

/** One object of the stand-in app: its identifier read, and its existence. */
type StandInObject = Readonly<Record<string, () => unknown>>

/** One collection of the stand-in app and the objects it holds. */
interface StandInCollection {
  readonly objects: readonly StandInObject[]
  byId(id: unknown): StandInObject
  whose(match: Readonly<Record<string, unknown>>): readonly StandInObject[]
}

/** A stand-in application and the requests the codec made of it, in order. */
interface StandInApp {
  readonly calls: string[]
  readonly people: StandInCollection
  readonly windows: StandInCollection
  readonly tracks: StandInCollection
}

/**
 * A stand-in for the automation bridge's application object, behaving as the
 * live bridge does for what the codec uses: `byId(id)` and `whose(match)[0]`
 * give an object whether or not one matches, and only `exists()` tells. An
 * object's property is read by calling it. Every request is recorded.
 */
function standInApp(): StandInApp {
  const calls: string[] = []
  const object = (resource: string, property: string, value: unknown): StandInObject => ({
    exists: () => {
      calls.push(`${resource} ${String(value)}.exists()`)
      return true
    },
    [property]: () => {
      calls.push(`${resource} ${String(value)}.${property}()`)
      return value
    },
  })
  const missing = (resource: string): StandInObject => ({
    exists: () => {
      calls.push(`${resource} missing.exists()`)
      return false
    },
  })
  const collection = (
    name: string,
    resource: string,
    property: string,
    ids: readonly unknown[]
  ): StandInCollection => {
    const objects = ids.map((id) => object(resource, property, id))
    const find = (id: unknown): StandInObject => {
      const index = ids.indexOf(id)
      return index === -1 ? missing(resource) : (objects[index] ?? missing(resource))
    }
    return {
      objects,
      byId: (id) => {
        calls.push(`${name}.byId(${JSON.stringify(id)})`)
        return find(id)
      },
      whose: (match) => {
        calls.push(`${name}.whose(${JSON.stringify(match)})`)
        return [find(match[property])]
      },
    }
  }
  return {
    calls,
    people: collection('people', 'Person', 'id', ['p-1', 'p-2']),
    windows: collection('windows', 'Window', 'id', [7, 8]),
    tracks: collection('tracks', 'Track', 'persistentID', ['A1', 'B2']),
  }
}

/** The codec environment for a stand-in app and {@link REFERENCES}. */
function environment(app: StandInApp): NativeCodecEnvironment {
  return { app, references: REFERENCES }
}

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
  /**
   * The plan kind the codec reports it cannot convert. When omitted, the error
   * must not carry the marker: the value itself violated its plan.
   */
  readonly unsupportedKind?: string
  /**
   * The resource of a referenced object the app does not have. When omitted,
   * the error must not carry it.
   */
  readonly missingResource?: string
}

/**
 * Asserts that `fn` throws a codec error object with exactly the contracted
 * shape (D4): `name`, `direction`, `path`, `message`, plus `unsupportedKind`
 * only when the plan's kind has no conversion, `missingResource` only when a
 * referenced object is missing, and nothing else.
 */
function expectCodecError(fn: () => unknown, expected: ExpectedCodecError): void {
  const error = thrownBy(fn)
  const keys = ['direction', 'message', 'name', 'path']
  if (expected.unsupportedKind !== undefined) keys.push('unsupportedKind')
  if (expected.missingResource !== undefined) keys.push('missingResource')
  expect(Object.keys(error as object).sort()).toEqual(keys.sort())
  const { name, direction, path, message, unsupportedKind, missingResource } = error as Record<
    string,
    unknown
  >
  expect({ name, direction, path, unsupportedKind, missingResource }).toEqual({
    name: NATIVE_CODEC_ERROR_NAME,
    direction: expected.direction,
    path: expected.path,
    unsupportedKind: expected.unsupportedKind,
    missingResource: expected.missingResource,
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
      // Absence is never materialized as null (A4): only optional fields express it.
      { presence: 'required', isNullable: true, whenNull: 'null', whenUndefined: 'error' },
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
    it('maps null to null in both directions', () => {
      expect(encode(null, nullable(INTEGER))).toBeNull()
      expect(decode(null, nullable(INTEGER))).toBeNull()
    })

    // A4: absence is never materialized as null, and outside a record field
    // there is no way to express it.
    it('rejects undefined on encode instead of turning absence into null', () => {
      expectCodecError(() => encode(undefined, nullable(INTEGER)), {
        direction: 'encode',
        path: [],
        includes: ['Absent values cannot be represented outside a record field'],
      })
      expectCodecError(() => encode([1, undefined], { kind: 'array', items: nullable(INTEGER) }), {
        direction: 'encode',
        path: [1],
      })
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

    it('omits undefined record values', () => {
      const encoded = encode({ a: undefined, b: 'x' }, UNKNOWN)
      expect(encoded).toEqual({ record: { b: 'x' } })
      expect(Object.hasOwn((encoded as { record: object }).record, 'a')).toBe(false)
    })

    // A4: absence is never materialized as null; outside a record field it
    // cannot be expressed, so it fails at its location.
    it('rejects undefined at the root, as a list element, and as a sparse-list hole', () => {
      const absent = 'Absent values cannot be represented outside a record field'
      expectCodecError(() => encode(undefined, UNKNOWN), {
        direction: 'encode',
        path: [],
        includes: [absent],
      })
      expectCodecError(() => encode({ a: [1, undefined] }, UNKNOWN), {
        direction: 'encode',
        path: ['a', 1],
        includes: [absent],
      })
      // eslint-disable-next-line no-sparse-arrays -- the hole is the case under test
      expectCodecError(() => encode([1, , 3], UNKNOWN), { direction: 'encode', path: [1] })
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

    // Host objects such as path objects are tagged like ordinary objects but
    // inherit from their own prototype; they must fail, not encode as `{}`.
    it('rejects objects tagged Object whose prototype is not a root prototype', () => {
      class HostLike {
        readonly kind = 'host'
      }
      const derived: unknown = Object.create({ inherited: true })
      expectCodecError(() => encode({ where: new HostLike() }, UNKNOWN), {
        direction: 'encode',
        path: ['where'],
        includes: ['nsupported value in dynamic content'],
      })
      expectCodecError(() => encode(derived, UNKNOWN), { direction: 'encode', path: [] })
      expectCodecError(() => encode(new HostLike(), recordOf({ name: optional(STRING) })), {
        direction: 'encode',
        path: [],
        includes: ['Expected an object'],
      })
    })

    it('accepts prototype-less records as ordinary records', () => {
      const bare = Object.create(null) as Record<string, unknown>
      bare['a'] = 1
      expect(encode(bare, UNKNOWN)).toEqual({ record: { a: { double: 1 } } })
      expect(encode(bare, recordOf({ a: required(DOUBLE) }))).toEqual({ a: { double: 1 } })
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
  // references (D4, D7)
  // -------------------------------------------------------------------------

  describe('reference decode', () => {
    it('addresses the object a string identifier names, by id', () => {
      const app = standInApp()
      const decoded = decode(identity('Person', 'p-2'), PERSON_REF, environment(app))
      // The decoded value is the app's own object, not a copy or a description.
      expect(decoded).toBe(app.people.objects[1])
      expect(app.calls).toEqual(['people.byId("p-2")', 'Person p-2.exists()'])
    })

    it('decodes an integer identifier to a number before addressing by it', () => {
      const app = standInApp()
      const decoded = decode(identity('Window', { integer: '7' }), WINDOW_REF, environment(app))
      expect(decoded).toBe(app.windows.objects[0])
      // The app receives the number 7, never the wire text "7".
      expect(app.calls).toEqual(['windows.byId(7)', 'Window 7.exists()'])
    })

    it('matches the identifier property when the resource is targeted by property', () => {
      const app = standInApp()
      const decoded = decode(identity('Track', 'B2'), TRACK_REF, environment(app))
      expect(decoded).toBe(app.tracks.objects[1])
      expect(app.calls).toEqual(['tracks.whose({"persistentID":"B2"})', 'Track B2.exists()'])
    })

    it('addresses a reference nested in a record, at its field', () => {
      const app = standInApp()
      const plan = recordOf({ for: required(PERSON_REF), with: required(STRING) })
      const decoded = decode(
        { for: identity('Person', 'p-1'), with: 'phone' },
        plan,
        environment(app)
      )
      expect(ownValue(decoded, 'for')).toBe(app.people.objects[0])
      expect(ownValue(decoded, 'with')).toBe('phone')
    })

    it('reports an object the app does not have as missing, naming its resource', () => {
      const app = standInApp()
      expectCodecError(() => decode(identity('Person', 'p-9'), PERSON_REF, environment(app)), {
        direction: 'decode',
        path: [],
        includes: ['"Person"'],
        missingResource: 'Person',
      })
      expectCodecError(() => decode(identity('Track', 'Z9'), TRACK_REF, environment(app)), {
        direction: 'decode',
        path: [],
        missingResource: 'Track',
      })
      expectCodecError(
        () =>
          decode({ for: identity('Person', 'p-9') }, recordOf({ for: required(PERSON_REF) }), {
            app,
            references: REFERENCES,
          }),
        { direction: 'decode', path: ['for'], missingResource: 'Person' }
      )
    })

    it.each([
      [
        'a name selector',
        selector('Person', { by: 'name', name: 'Ada' }),
        PERSON_REF,
        'Selector references',
      ],
      [
        'an index selector',
        selector('Person', { by: 'index', index: { integer: '0' } }),
        PERSON_REF,
        'Selector references',
      ],
      [
        'an identity collection',
        { reference: { resource: 'Person', form: 'identity', cardinality: 'many', entries: [] } },
        PEOPLE_REF,
        'Collection references',
      ],
      [
        'an every selector',
        {
          reference: {
            resource: 'Person',
            form: 'selector',
            cardinality: 'many',
            selector: { by: 'every' },
          },
        },
        PEOPLE_REF,
        'Collection references',
      ],
      [
        'a range selector',
        {
          reference: {
            resource: 'Person',
            form: 'selector',
            cardinality: 'many',
            selector: { by: 'range', start: { integer: '0' }, end: { integer: '2' } },
          },
        },
        PEOPLE_REF,
        'Collection references',
      ],
      [
        'a reference located through a container',
        {
          reference: {
            resource: 'Person',
            form: 'identity',
            cardinality: 'one',
            id: 'p-1',
            container: identity('Group', 'g-1')['reference'],
          },
        },
        PERSON_REF,
        'located through a container',
      ],
      [
        'a resource found only within its container',
        identity('Email', 'e-1'),
        EMAIL_REF,
        'does not find its objects by their identifier',
      ],
      [
        'a resource with no identifier',
        identity('Note', 'n-1'),
        NOTE_REF,
        'does not find its objects by their identifier',
      ],
      [
        'a resource the table does not list',
        identity('Album', 'a-1'),
        ALBUM_REF,
        'does not find its objects by their identifier',
      ],
    ] as const)(
      'marks %s as a reference it cannot convert, and addresses nothing',
      (_name, wire, plan, fragment) => {
        const app = standInApp()
        expectCodecError(() => decode(wire, plan, environment(app)), {
          direction: 'decode',
          path: [],
          includes: [fragment],
          unsupportedKind: 'reference',
        })
        expect(app.calls).toEqual([])
      }
    )

    it('marks a reference it is given no environment for, whatever the value is', () => {
      expectCodecError(() => decode(identity('Person', 'p-1'), PERSON_REF), {
        direction: 'decode',
        path: [],
        unsupportedKind: 'reference',
      })
    })

    it('marks a reference when there is no application to address', () => {
      expectCodecError(
        () => decode(identity('Person', 'p-1'), PERSON_REF, { app: null, references: REFERENCES }),
        { direction: 'decode', path: [], unsupportedKind: 'reference' }
      )
    })

    it.each([
      ['a value that is not a reference', 'p-1', []],
      ['a reference to another resource', identity('Window', { integer: '7' }), ['resource']],
      [
        'a reference of the other cardinality',
        { reference: { resource: 'Person', form: 'identity', cardinality: 'many', entries: [] } },
        ['cardinality'],
      ],
      [
        'an unknown form',
        { reference: { resource: 'Person', form: 'guess', cardinality: 'one', id: 'p-1' } },
        ['form'],
      ],
      [
        'an undeclared field',
        {
          reference: {
            resource: 'Person',
            form: 'identity',
            cardinality: 'one',
            id: 'p-1',
            label: 'x',
          },
        },
        ['label'],
      ],
      [
        'an identity reference without an id',
        { reference: { resource: 'Person', form: 'identity', cardinality: 'one' } },
        [],
      ],
      ['an identifier that violates its plan', identity('Window', { integer: '1.5' }), ['id']],
    ] as const)('rejects %s as invalid input, unmarked', (_name, wire, path) => {
      const app = standInApp()
      const plan = path[0] === 'id' ? WINDOW_REF : PERSON_REF
      expectCodecError(() => decode(wire, plan, environment(app)), {
        direction: 'decode',
        path,
      })
      expect(app.calls).toEqual([])
    })
  })

  // D4, two-phase decode: the whole input converts before the app is used.
  // Every marker and validation failure happens with no access to the app,
  // so an unconvertible value fails before anything reaches it, wherever it
  // sits in the input. The app below fails the test on any access at all.
  describe('reference decode: nothing reaches the app before the whole input converted', () => {
    const FILE: ValuePlan = { kind: 'file' }
    const FILE_SOURCE: ValuePlan = { kind: 'file-source' }

    /**
     * An application that fails the test on any read, call, or inspection of
     * its members: decoding may hold it, but must not use it.
     */
    function untouchableApp(): object {
      const touched = (): never => {
        throw new Error('the application was used before the input converted')
      }
      return new Proxy(
        {},
        {
          get: touched,
          has: touched,
          set: touched,
          ownKeys: touched,
          getOwnPropertyDescriptor: touched,
          defineProperty: touched,
          deleteProperty: touched,
          getPrototypeOf: touched,
        }
      )
    }

    const untouchable = (): NativeCodecEnvironment => ({
      app: untouchableApp(),
      references: REFERENCES,
    })

    it.each([
      ['a file', FILE, 'file'],
      ['a file source', FILE_SOURCE, 'file-source'],
    ])(
      'fails %s value after a reference with the unsupported marker, before using the app',
      (_label, laterPlan, kind) => {
        const plan = recordOf({ for: required(PERSON_REF), file: required(laterPlan) })
        expectCodecError(
          () => decode({ for: identity('Person', 'p-1'), file: '/tmp/a' }, plan, untouchable()),
          { direction: 'decode', path: ['file'], unsupportedKind: kind }
        )
      }
    )

    it.each([
      ['a file', FILE, 'file'],
      ['a file source', FILE_SOURCE, 'file-source'],
    ])(
      'fails %s value before a reference with the unsupported marker, before using the app',
      (_label, earlierPlan, kind) => {
        const plan = recordOf({ file: required(earlierPlan), for: required(PERSON_REF) })
        expectCodecError(
          () => decode({ file: '/tmp/a', for: identity('Person', 'p-1') }, plan, untouchable()),
          { direction: 'decode', path: ['file'], unsupportedKind: kind }
        )
      }
    )

    it('fails an invalid value after a reference as invalid, before using the app', () => {
      const plan = recordOf({ for: required(PERSON_REF), count: required(INTEGER) })
      expectCodecError(
        () => decode({ for: identity('Person', 'p-1'), count: 'seven' }, plan, untouchable()),
        { direction: 'decode', path: ['count'] }
      )
    })

    it('fails an unsupported reference after convertible ones, before using the app', () => {
      expectCodecError(
        () =>
          decode(
            [
              identity('Person', 'p-1'),
              identity('Person', 'p-2'),
              selector('Person', { by: 'index', index: { integer: '0' } }),
            ],
            arrayOf(PERSON_REF),
            untouchable()
          ),
        { direction: 'decode', path: [2], unsupportedKind: 'reference' }
      )
    })

    it('fails a selector reference with the unsupported marker, before using the app', () => {
      expectCodecError(
        () => decode(selector('Person', { by: 'name', name: 'Ada' }), PERSON_REF, untouchable()),
        { direction: 'decode', path: [], unsupportedKind: 'reference' }
      )
    })

    it('puts each addressed object at its own position, in input order', () => {
      // Phase two replaces each pending address where phase one left it.
      const app = standInApp()
      const plan = recordOf({
        first: required(PERSON_REF),
        count: required(INTEGER),
        second: required(PERSON_REF),
      })
      const decoded = decode(
        {
          first: identity('Person', 'p-1'),
          count: { integer: '3' },
          second: identity('Person', 'p-2'),
        },
        plan,
        environment(app)
      )
      expect(ownValue(decoded, 'first')).toBe(app.people.objects[0])
      expect(ownValue(decoded, 'count')).toBe(3)
      expect(ownValue(decoded, 'second')).toBe(app.people.objects[1])
      expect(app.calls).toEqual([
        'people.byId("p-1")',
        'Person p-1.exists()',
        'people.byId("p-2")',
        'Person p-2.exists()',
      ])
    })

    // A resource with neither a get nor a list has no entry in the contract's
    // resource table, so the executor's reference table has none either. A
    // reference to it is one the codec cannot convert: the marker, never a
    // failed lookup, and in decoding without any use of the app. Resource
    // names that are also inherited object members must not be found as
    // entries.
    describe('a reference to a resource the table has no entry for', () => {
      const ABSENT = ['Account', 'constructor', 'toString', '__proto__'] as const
      const absentRef = (resource: string): ValuePlan => ({
        kind: 'reference',
        resource,
        cardinality: 'one',
      })

      it.each(ABSENT)(
        'decodes a reference to %s as unsupported, before using the app',
        (resource) => {
          expectCodecError(
            () => decode(identity(resource, 'x-1'), absentRef(resource), untouchable()),
            {
              direction: 'decode',
              path: [],
              unsupportedKind: 'reference',
            }
          )
        }
      )

      it.each(ABSENT)(
        'decodes a reference to %s after a convertible one as unsupported, before using the app',
        (resource) => {
          const plan = recordOf({ for: required(PERSON_REF), other: required(absentRef(resource)) })
          expectCodecError(
            () =>
              decode(
                { for: identity('Person', 'p-1'), other: identity(resource, 'x-1') },
                plan,
                untouchable()
              ),
            { direction: 'decode', path: ['other'], unsupportedKind: 'reference' }
          )
        }
      )

      it.each(ABSENT)('encodes an object at a reference to %s as unsupported', (resource) => {
        const app = standInApp()
        expectCodecError(
          () => encode(app.people.objects[0], absentRef(resource), environment(app)),
          { direction: 'encode', path: [], unsupportedKind: 'reference' }
        )
        expect(app.calls).toEqual([])
      })
    })
  })

  describe('reference encode', () => {
    it('encodes an object as the identity reference that finds it again', () => {
      const app = standInApp()
      expect(encode(app.people.objects[1], PERSON_REF, environment(app))).toEqual(
        identity('Person', 'p-2')
      )
      expect(app.calls).toEqual(['Person p-2.id()'])
    })

    it('encodes an integer identifier as integer text', () => {
      const app = standInApp()
      expect(encode(app.windows.objects[0], WINDOW_REF, environment(app))).toEqual(
        identity('Window', { integer: '7' })
      )
    })

    it('reads the identifier property of a resource targeted by property', () => {
      const app = standInApp()
      expect(encode(app.tracks.objects[0], TRACK_REF, environment(app))).toEqual(
        identity('Track', 'A1')
      )
      expect(app.calls).toEqual(['Track A1.persistentID()'])
    })

    it('encodes references inside records and lists, and a missing one as null', () => {
      const app = standInApp()
      const plan = recordOf({
        owner: required(nullable(PERSON_REF)),
        windows: required(arrayOf(WINDOW_REF)),
      })
      expect(
        encode(
          { owner: null, windows: [app.windows.objects[0], app.windows.objects[1]] },
          plan,
          environment(app)
        )
      ).toEqual({
        owner: null,
        windows: [identity('Window', { integer: '7' }), identity('Window', { integer: '8' })],
      })
    })

    it.each([
      ['a collection', PEOPLE_REF],
      ['a resource found only within its container', EMAIL_REF],
      ['a resource with no identifier', NOTE_REF],
      ['a resource the table does not list', ALBUM_REF],
    ] as const)('marks %s as a reference it cannot convert', (_name, plan) => {
      const app = standInApp()
      expectCodecError(() => encode(app.people.objects[0], plan, environment(app)), {
        direction: 'encode',
        path: [],
        unsupportedKind: 'reference',
      })
      expect(app.calls).toEqual([])
    })

    it('marks a reference it is given no environment for', () => {
      const app = standInApp()
      expectCodecError(() => encode(app.people.objects[0], PERSON_REF), {
        direction: 'encode',
        path: [],
        unsupportedKind: 'reference',
      })
    })

    it('rejects a value that is not an app object, unmarked', () => {
      const app = standInApp()
      expectCodecError(() => encode('p-1', PERSON_REF, environment(app)), {
        direction: 'encode',
        path: [],
        includes: ['an object of "Person"'],
      })
      // A plain record has no identifier member to call.
      expectCodecError(() => encode({ name: 'Ada' }, PERSON_REF, environment(app)), {
        direction: 'encode',
        path: [],
      })
    })

    it('rejects an identifier that violates its plan, at the id', () => {
      const app = standInApp()
      const fractional = { id: () => 1.5 }
      expectCodecError(() => encode(fractional, WINDOW_REF, environment(app)), {
        direction: 'encode',
        path: ['id'],
      })
    })
  })

  // -------------------------------------------------------------------------
  // kinds that land later
  // -------------------------------------------------------------------------

  describe('file and file-source', () => {
    const LATER: readonly ValuePlan[] = [{ kind: 'file' }, { kind: 'file-source' }]

    it.each(LATER)(
      'rejects $kind in both directions, marked as a kind it cannot convert',
      (plan) => {
        expectCodecError(() => encode({}, plan), {
          direction: 'encode',
          path: [],
          includes: ['have no conversion in this codec'],
          unsupportedKind: plan.kind,
        })
        expectCodecError(() => decode({}, plan), {
          direction: 'decode',
          path: [],
          includes: ['have no conversion in this codec'],
          unsupportedKind: plan.kind,
        })
      }
    )

    it('reports the path of an unsupported kind nested in a record', () => {
      const plan = recordOf({ attachment: required({ kind: 'file' }) })
      expectCodecError(() => encode({ attachment: {} }, plan), {
        direction: 'encode',
        path: ['attachment'],
        unsupportedKind: 'file',
      })
      expectCodecError(() => decode({ attachment: {} }, plan), {
        direction: 'decode',
        path: ['attachment'],
        unsupportedKind: 'file',
      })
    })
  })

  it('does not mark a value that violates a plan the codec can convert', () => {
    // Ordinary failures blame the value, so they carry no unsupported kind.
    expectCodecError(() => decode({ integer: '1.5' }, INTEGER), { direction: 'decode', path: [] })
    expectCodecError(() => encode(1.5, INTEGER), { direction: 'encode', path: [] })
    expectCodecError(() => decode({ at: 'soon' }, recordOf({ at: required(DATE) })), {
      direction: 'decode',
      path: ['at'],
    })
  })

  it('rejects an unrecognized plan kind, marked as a kind it cannot convert', () => {
    // Plans arrive as embedded JSON; a malformed one must fail loudly, and the
    // fault is the plan's, not the value's.
    const bogus = { kind: 'bogus' } as unknown as ValuePlan
    expectCodecError(() => encode(1, bogus), {
      direction: 'encode',
      path: [],
      unsupportedKind: 'bogus',
    })
    expectCodecError(() => decode(1, bogus), {
      direction: 'decode',
      path: [],
      unsupportedKind: 'bogus',
    })
  })
})

// ---------------------------------------------------------------------------
// References within a container (D7, container scoping)
// ---------------------------------------------------------------------------

const TAB_REF: ValuePlan = { kind: 'reference', resource: 'Tab', cardinality: 'one' }
const CELL_REF: ValuePlan = { kind: 'reference', resource: 'Cell', cardinality: 'one' }

/**
 * A reference table with resources found within a container: `Tab` (text
 * id) within a `Window` (integer id, found at the application), and `Cell`
 * within a `Tab`, a nested chain.
 */
const CONTAINED_REFERENCES: NativeReferenceTable = {
  Window: { id: INTEGER, addressing: { collection: 'windows', lookup: 'byId', property: 'id' } },
  Tab: {
    id: STRING,
    addressing: { collection: 'tabs', lookup: 'byId', property: 'id', within: 'Window' },
  },
  Cell: {
    id: STRING,
    addressing: { collection: 'cells', lookup: 'byId', property: 'id', within: 'Tab' },
  },
}

/**
 * A stand-in app with windows 7 and 8, holding tabs `t-1` and `t-2` and tab
 * `t-3` respectively, each tab holding cell `c-1`. Every lookup and read is
 * recorded.
 */
function standInBrowser() {
  const calls: string[] = []
  const absent = (label: string) => ({
    exists: () => {
      calls.push(`${label}.exists()`)
      return false
    },
  })
  const node = <T extends object>(label: string, id: unknown, children: T) =>
    Object.assign(
      {
        exists: () => {
          calls.push(`${label}.exists()`)
          return true
        },
        id: () => {
          calls.push(`${label}.id()`)
          return id
        },
      },
      children
    )
  const lookup = (label: string, items: Readonly<Record<string, object>>) => ({
    byId: (id: unknown) => {
      calls.push(`${label}.byId(${JSON.stringify(id)})`)
      const key = String(id)
      return Object.hasOwn(items, key) ? items[key] : absent(`${label}.byId(${JSON.stringify(id)})`)
    },
  })
  const tab = (windowId: number, id: string) => {
    const label = `window ${String(windowId)} tab ${id}`
    return node(label, id, {
      cells: lookup(`${label} cells`, { 'c-1': node(`${label} cell`, 'c-1', {}) }),
    })
  }
  const window = (id: number, tabIds: readonly string[]) =>
    node(`window ${String(id)}`, id, {
      tabs: lookup(
        `window ${String(id)} tabs`,
        Object.fromEntries(tabIds.map((tabId) => [tabId, tab(id, tabId)]))
      ),
    })
  const windows = { '7': window(7, ['t-1', 't-2']), '8': window(8, ['t-3']) }
  return { calls, app: { windows: lookup('windows', windows) }, windows, tab }
}

/** An application that fails the test when anything of it is used. */
function untouchableBrowser(): object {
  const touched = (): never => {
    throw new Error('the application was used before the input converted')
  }
  return new Proxy({}, { get: touched, has: touched, ownKeys: touched })
}

/** The single identity reference payload to `resource` `id`, within `container`. */
function within(resource: string, id: unknown, container?: Record<string, unknown>) {
  return {
    resource,
    form: 'identity',
    cardinality: 'one',
    id,
    ...(container === undefined ? {} : { container }),
  }
}

/** The value a body hands over with the record it was read through. */
function contained(value: unknown, how: { container: unknown } | { containerId: unknown }) {
  return { [NATIVE_CONTAINED_REFERENCE_KEY]: { value, ...how } }
}

describe.each(IMPLEMENTATIONS)(
  '%s: references within a container',
  (_label, { decode, encode }) => {
    describe('encode', () => {
      it('encodes a value handed over with its record as identity with that record as container', () => {
        const { app, windows, tab, calls } = standInBrowser()
        const env = { app, references: CONTAINED_REFERENCES }

        expect(encode(contained(tab(8, 't-3'), { container: windows['8'] }), TAB_REF, env)).toEqual(
          {
            reference: within('Tab', 't-3', within('Window', { integer: '8' })),
          }
        )
        // The target's id is read from the value, the container's from the record.
        expect(calls).toEqual(['window 8 tab t-3.id()', 'window 8.id()'])
      })

      it('encodes the container from an identifier already read, reading nothing for it', () => {
        const { app, tab, calls } = standInBrowser()
        const env = { app, references: CONTAINED_REFERENCES }

        expect(encode(contained(tab(7, 't-2'), { containerId: 7 }), TAB_REF, env)).toEqual({
          reference: within('Tab', 't-2', within('Window', { integer: '7' })),
        })
        expect(calls).toEqual(['window 7 tab t-2.id()'])
      })

      it('hands a null value through a nullable position, and each item of a list its container', () => {
        const { app, windows, tab } = standInBrowser()
        const env = { app, references: CONTAINED_REFERENCES }

        expect(encode(null, nullable(TAB_REF), env)).toBeNull()
        expect(
          encode(
            [
              contained(tab(7, 't-1'), { containerId: 7 }),
              contained(tab(8, 't-3'), { container: windows['8'] }),
            ],
            arrayOf(TAB_REF),
            env
          )
        ).toEqual([
          { reference: within('Tab', 't-1', within('Window', { integer: '7' })) },
          { reference: within('Tab', 't-3', within('Window', { integer: '8' })) },
        ])
      })

      it('marks a value that comes without its record as a reference it cannot convert', () => {
        const { app, tab, calls } = standInBrowser()
        expectCodecError(
          () => encode(tab(7, 't-1'), TAB_REF, { app, references: CONTAINED_REFERENCES }),
          {
            direction: 'encode',
            path: [],
            includes: ['"Tab"', 'without the record it was read through'],
            unsupportedKind: 'reference',
          }
        )
        expect(calls).toEqual([])
      })

      it('marks a container that is itself found within a container, a nested chain', () => {
        const { app, tab } = standInBrowser()
        expectCodecError(
          () =>
            encode(contained(tab(7, 't-1'), { container: tab(7, 't-1') }), CELL_REF, {
              app,
              references: CONTAINED_REFERENCES,
            }),
          { direction: 'encode', path: ['container'], unsupportedKind: 'reference' }
        )
      })

      it('rejects a container identifier that violates its plan, at the container id', () => {
        const { app, tab } = standInBrowser()
        expectCodecError(
          () =>
            encode(contained(tab(7, 't-1'), { containerId: 'seven' }), TAB_REF, {
              app,
              references: CONTAINED_REFERENCES,
            }),
          { direction: 'encode', path: ['container', 'id'] }
        )
      })
    })

    describe('decode', () => {
      it('finds the container first, then the object within it', () => {
        const { app, windows, calls } = standInBrowser()
        const decoded = decode(
          { reference: within('Tab', 't-3', within('Window', { integer: '8' })) },
          TAB_REF,
          { app, references: CONTAINED_REFERENCES }
        )

        expect(decoded).toBe(windows['8'].tabs.byId('t-3'))
        expect(calls.slice(0, 4)).toEqual([
          'windows.byId(8)',
          'window 8.exists()',
          'window 8 tabs.byId("t-3")',
          'window 8 tab t-3.exists()',
        ])
      })

      it('follows a chain of containers level by level', () => {
        const { app, calls } = standInBrowser()
        decode(
          {
            reference: within(
              'Cell',
              'c-1',
              within('Tab', 't-1', within('Window', { integer: '7' }))
            ),
          },
          CELL_REF,
          { app, references: CONTAINED_REFERENCES }
        )

        expect(calls).toEqual([
          'windows.byId(7)',
          'window 7.exists()',
          'window 7 tabs.byId("t-1")',
          'window 7 tab t-1.exists()',
          'window 7 tab t-1 cells.byId("c-1")',
          'window 7 tab t-1 cell.exists()',
        ])
      })

      it('reports a missing container as missing, naming its resource, before looking up the object', () => {
        const { app, calls } = standInBrowser()
        expectCodecError(
          () =>
            decode(
              { reference: within('Tab', 't-1', within('Window', { integer: '9' })) },
              TAB_REF,
              {
                app,
                references: CONTAINED_REFERENCES,
              }
            ),
          { direction: 'decode', path: ['container'], missingResource: 'Window' }
        )
        expect(calls).toEqual(['windows.byId(9)', 'windows.byId(9).exists()'])
      })

      it('reports an object its container does not hold as missing, naming its resource', () => {
        // t-3 is a tab of window 8; the reference names window 7.
        const { app, calls } = standInBrowser()
        expectCodecError(
          () =>
            decode(
              { reference: within('Tab', 't-3', within('Window', { integer: '7' })) },
              TAB_REF,
              {
                app,
                references: CONTAINED_REFERENCES,
              }
            ),
          { direction: 'decode', path: [], missingResource: 'Tab' }
        )
        expect(calls).toEqual([
          'windows.byId(7)',
          'window 7.exists()',
          'window 7 tabs.byId("t-3")',
          'window 7 tabs.byId("t-3").exists()',
        ])
      })

      it('rejects a reference with no container, or one of another resource, before using the app', () => {
        const env = { app: untouchableBrowser(), references: CONTAINED_REFERENCES }
        expectCodecError(() => decode({ reference: within('Tab', 't-1') }, TAB_REF, env), {
          direction: 'decode',
          path: [],
          includes: ['"container"'],
        })
        expectCodecError(
          () => decode({ reference: within('Tab', 't-1', within('Tab', 't-2')) }, TAB_REF, env),
          { direction: 'decode', path: ['container', 'resource'] }
        )
      })

      it('marks a selector container, and a container on a resource found at the application', () => {
        const env = { app: untouchableBrowser(), references: CONTAINED_REFERENCES }
        expectCodecError(
          () =>
            decode(
              {
                reference: within('Tab', 't-1', {
                  resource: 'Window',
                  form: 'selector',
                  cardinality: 'one',
                  selector: { by: 'name', name: 'Front' },
                }),
              },
              TAB_REF,
              env
            ),
          { direction: 'decode', path: ['container'], unsupportedKind: 'reference' }
        )
        expectCodecError(
          () =>
            decode(
              { reference: within('Window', { integer: '7' }, within('Window', { integer: '8' })) },
              WINDOW_REF,
              env
            ),
          {
            direction: 'decode',
            path: [],
            includes: ['located through a container'],
            unsupportedKind: 'reference',
          }
        )
      })
    })
  }
)

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
      reference: WIRE_KEYS.reference,
    })
    expect(literals.containedReference).toBe(NATIVE_CONTAINED_REFERENCE_KEY)
  })
})

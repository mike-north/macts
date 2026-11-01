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
 * References and file values decode into live objects bound by a
 * `DecodeContext`. Their vectors assume {@link VECTOR_DECODE_CONTEXT}, whose
 * binders return the decoded data plus a shared marker function
 * ({@link VECTOR_RESOLVE} on every reference, container, and entry;
 * {@link VECTOR_FETCH} on every file), so a decoded value equals its vector's
 * `sdk` exactly only when every decoded field and the binding both match.
 *
 * @packageDocumentation
 */

import { Integer } from '../integer.js'
import { Rgb } from '../color.js'
import type { FileData, FileValue } from '../../files/index.js'
import type { IssuePath } from '../../issues.js'
import type {
  CollectionReferenceVariant,
  IdentityReference,
  IdentityReferenceData,
  ObjectReferenceData,
  ObjectReferenceVariant,
  ReferenceData,
  ReferenceRegistry,
  SelectorReference,
  SelectorReferenceData,
} from '../../references/index.js'
import type { DecodeContext, ValueType } from '../value-type.js'
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
   * Whether the matching zod schema (the SDK schema for `encode`, the wire
   * schema for `decode`) accepts the input although the codec rejects it.
   * Defaults to `false`, except for encoding dynamic content, whose SDK
   * schema accepts any value. It is `true` only where the contract separates
   * the two on purpose: a bound file value is a valid SDK value that has no
   * grant to encode, and an upload handle is valid wire input that only the
   * service resolves.
   */
  readonly schemaAccepts?: boolean
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

/**
 * The `resolve` of every reference bound by {@link VECTOR_DECODE_CONTEXT}: a
 * marker that proves the binder ran. Vector references never resolve.
 */
export const VECTOR_RESOLVE = (): Promise<never> =>
  Promise.reject(new Error('vector references do not resolve'))

/**
 * The `fetch` of every file value bound by {@link VECTOR_DECODE_CONTEXT}: a
 * marker that proves the binder ran. Vector files never fetch.
 */
export const VECTOR_FETCH = (): Promise<never> =>
  Promise.reject(new Error('vector files do not fetch'))

function bindIdentity(data: IdentityReferenceData): IdentityReference<unknown> {
  const { resource, form, cardinality, id } = data
  const base = { resource, form, cardinality, id, resolve: VECTOR_RESOLVE }
  return data.container === undefined ? base : { ...base, container: bindObject(data.container) }
}

function bindSelector(data: SelectorReferenceData): SelectorReference<unknown> {
  const { resource, form, cardinality, selector } = data
  const base = { resource, form, cardinality, selector, resolve: VECTOR_RESOLVE }
  return data.container === undefined ? base : { ...base, container: bindObject(data.container) }
}

function bindObject(data: ObjectReferenceData): ObjectReferenceVariant<unknown> {
  return data.form === 'identity' ? bindIdentity(data) : bindSelector(data)
}

function bindReference(
  data: ReferenceData
): ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown> {
  if (data.cardinality === 'one') return bindObject(data)
  const { resource, form, cardinality } = data
  if (form === 'identity') {
    return {
      resource,
      form,
      cardinality,
      entries: data.entries.map(bindIdentity),
      resolve: VECTOR_RESOLVE,
    }
  }
  const base = { resource, form, cardinality, selector: data.selector, resolve: VECTOR_RESOLVE }
  return data.container === undefined ? base : { ...base, container: bindObject(data.container) }
}

/**
 * The decode context the vectors assume.
 *
 * @remarks
 * `bindReference` returns the decoded data with {@link VECTOR_RESOLVE} added
 * to the reference and to every container and entry in it. `bindFile` returns
 * the decoded file data with {@link VECTOR_FETCH} added. Unlike a real binder,
 * it leaves the grant visible on the result, so the vectors can check that
 * the grant was decoded; a real binder keeps the grant in a closure.
 */
export const VECTOR_DECODE_CONTEXT: DecodeContext = Object.freeze({
  bindReference,
  bindFile: (file: FileData): FileValue => ({ ...file, fetch: VECTOR_FETCH }),
})

/**
 * The resource table of the reference vectors: notes with text identifiers,
 * folders with integer identifiers, and accounts with text identifiers. Notes
 * are contained in folders and folders in accounts. Paragraphs (in notes) and
 * words (in paragraphs) have no identifier, so they are referenced only by
 * selectors.
 */
const VECTOR_RESOURCES: ReferenceRegistry = Object.freeze({
  note: { id: t.string() },
  folder: { id: t.integer() },
  account: { id: t.string() },
  paragraph: {},
  word: {},
})
const resources = (): ReferenceRegistry => VECTOR_RESOURCES

const noteRef = t.reference(resources, 'note', 'one')
const noteRefs = t.reference(resources, 'note', 'many')
const folderRef = t.reference(resources, 'folder', 'one')
const paragraphRef = t.reference(resources, 'paragraph', 'one')
const paragraphRefs = t.reference(resources, 'paragraph', 'many')
const wordRef = t.reference(resources, 'word', 'one')

const file = t.file()
const fileSource = t.fileSource()

/** When the file vectors' existence was observed, as wire date text. */
const OBSERVED_AT = '2026-10-31T17:04:05.120Z'

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
    name: 'a dynamic plain object shaped like a file source is a user record',
    see: 'phases/13 §D3',
    type: t.unknown(),
    sdk: { kind: 'caller-owned-file', path: '/x' },
    wire: { record: { kind: 'caller-owned-file', path: '/x' } },
  },
  {
    name: 'a dynamic user record with a key named "fileSource" is enveloped',
    see: 'phases/13 §D3',
    type: t.unknown(),
    sdk: { fileSource: { kind: 'caller-owned-file', path: '/x' } },
    wire: { record: { fileSource: { record: { kind: 'caller-owned-file', path: '/x' } } } },
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

  // References.
  {
    name: 'an identity reference with a text id',
    see: 'phases/13 §D7',
    type: noteRef,
    sdk: {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      resolve: VECTOR_RESOLVE,
    },
    wire: { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } },
  },
  {
    name: "an identity reference's integer id is wire-encoded by its resource's id type",
    see: 'phases/13 §D7',
    type: folderRef,
    sdk: {
      resource: 'folder',
      form: 'identity',
      cardinality: 'one',
      id: Integer.validate(7),
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: { resource: 'folder', form: 'identity', cardinality: 'one', id: { integer: '7' } },
    },
  },
  {
    name: 'a single-object selector by name',
    see: 'phases/13 §D7',
    type: noteRef,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Groceries' },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Groceries' },
      },
    },
  },
  {
    name: 'a single-object selector at zero-based index 0',
    see: 'phases/13 §D7',
    type: noteRef,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: Integer.validate(0) },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '0' } },
      },
    },
  },
  {
    name: 'a collection selector for every object',
    see: 'phases/13 §D7',
    type: noteRefs,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
      },
    },
  },
  {
    name: 'a half-open range of the first ten objects',
    see: 'phases/13 §D7',
    type: noteRefs,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: Integer.validate(0), end: Integer.validate(10) },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '0' }, end: { integer: '10' } },
      },
    },
  },
  {
    name: 'a range whose start equals its end is a valid empty range',
    see: 'phases/13 §D7',
    type: noteRefs,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: Integer.validate(2), end: Integer.validate(2) },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '2' }, end: { integer: '2' } },
      },
    },
  },
  {
    name: 'an identity collection lists its entries in order',
    see: 'phases/13 §D7',
    type: noteRefs,
    sdk: {
      resource: 'note',
      form: 'identity',
      cardinality: 'many',
      entries: [
        {
          resource: 'note',
          form: 'identity',
          cardinality: 'one',
          id: 'N2',
          resolve: VECTOR_RESOLVE,
        },
        {
          resource: 'note',
          form: 'identity',
          cardinality: 'one',
          id: 'N1',
          resolve: VECTOR_RESOLVE,
        },
      ],
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [
          { resource: 'note', form: 'identity', cardinality: 'one', id: 'N2' },
          { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' },
        ],
      },
    },
  },
  {
    name: "containers nest two deep, each id encoded by its own resource's id type",
    see: 'phases/13 §D7',
    type: noteRef,
    sdk: {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      container: {
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: Integer.validate(7),
        container: {
          resource: 'account',
          form: 'identity',
          cardinality: 'one',
          id: 'A1',
          resolve: VECTOR_RESOLVE,
        },
        resolve: VECTOR_RESOLVE,
      },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        container: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '7' },
          container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
        },
      },
    },
  },
  {
    name: 'a collection selector evaluated in a selected container',
    see: 'phases/13 §D7',
    type: noteRefs,
    sdk: {
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      container: {
        resource: 'folder',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Inbox' },
        resolve: VECTOR_RESOLVE,
      },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
        container: {
          resource: 'folder',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'name', name: 'Inbox' },
        },
      },
    },
  },

  // References to resources without an identifier.
  {
    name: 'a resource without an identifier, selected by index',
    see: 'phases/13 §D7',
    type: paragraphRef,
    sdk: {
      resource: 'paragraph',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: Integer.validate(2) },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'paragraph',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '2' } },
      },
    },
  },
  {
    name: 'every object of a resource without an identifier, in an identified container',
    see: 'phases/13 §D7',
    type: paragraphRefs,
    sdk: {
      resource: 'paragraph',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      container: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        resolve: VECTOR_RESOLVE,
      },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'paragraph',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
        container: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' },
      },
    },
  },
  {
    name: 'a resource without an identifier serves as a selected container',
    see: 'phases/13 §D7',
    type: wordRef,
    sdk: {
      resource: 'word',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: Integer.validate(0) },
      container: {
        resource: 'paragraph',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: Integer.validate(2) },
        container: {
          resource: 'note',
          form: 'identity',
          cardinality: 'one',
          id: 'N1',
          resolve: VECTOR_RESOLVE,
        },
        resolve: VECTOR_RESOLVE,
      },
      resolve: VECTOR_RESOLVE,
    },
    wire: {
      reference: {
        resource: 'word',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '0' } },
        container: {
          resource: 'paragraph',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: { integer: '2' } },
          container: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' },
        },
      },
    },
  },

  // Files and file sources.
  {
    name: 'a file value with its original path',
    see: 'phases/13 §D8',
    type: file,
    sdk: {
      path: '/Users/me/report.pdf',
      existence: { exists: true, observedAt: at(OBSERVED_AT) },
      grant: 'grant-1',
      fetch: VECTOR_FETCH,
    },
    wire: {
      file: {
        path: '/Users/me/report.pdf',
        exists: true,
        observedAt: { date: '2026-10-31T17:04:05.120Z' },
        grant: 'grant-1',
      },
    },
  },
  {
    name: 'a file value without a path, observed missing',
    see: 'phases/13 §D8',
    type: file,
    sdk: {
      existence: { exists: false, observedAt: at(OBSERVED_AT) },
      grant: 'grant-2',
      fetch: VECTOR_FETCH,
    },
    wire: {
      file: { exists: false, observedAt: { date: '2026-10-31T17:04:05.120Z' }, grant: 'grant-2' },
    },
  },
  {
    name: 'a caller-owned file source travels as its path',
    see: 'phases/13 §D8',
    type: fileSource,
    sdk: { kind: 'caller-owned-file', path: '/Users/me/upload.pdf' },
    wire: { fileSource: { kind: 'caller-owned-file', path: '/Users/me/upload.pdf' } },
  },
  {
    name: "an uploaded file source travels as its upload id, without the caller's expiry",
    see: 'phases/13 §D8',
    type: fileSource,
    sdk: { kind: 'uploaded-file', uploadId: 'U1', expiresAt: at('2026-10-31T17:09:05.120Z') },
    wire: { fileSource: { kind: 'uploaded-file', uploadId: 'U1' } },
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
    name: 'a file value cannot be represented in dynamic content',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { file: { exists: true, observedAt: { date: '2026-10-31T17:04:05.120Z' }, grant: 'g' } },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a file source cannot be represented in dynamic content',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { fileSource: { kind: 'caller-owned-file', path: '/x' } },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a file source nested in dynamic content is located in the user data',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { record: { attachments: [{ fileSource: { kind: 'uploaded-file', uploadId: 'U1' } }] } },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['attachments', 0]],
  },
  {
    name: 'a bound file value in dynamic content cannot be encoded: its fetch is a function',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: {
      existence: { exists: true, observedAt: at('2026-10-31T17:04:05.120Z') },
      fetch: VECTOR_FETCH,
    },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['fetch']],
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

  // References.
  {
    name: 'a reference to another resource',
    see: 'phases/13 §D7',
    type: noteRef,
    input: { resource: 'folder', form: 'identity', cardinality: 'one', id: 7 },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a wire reference to another resource',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: { resource: 'folder', form: 'identity', cardinality: 'one', id: { integer: '7' } },
    },
    direction: 'decode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a collection at a single-object position',
    see: 'phases/13 §D7',
    type: noteRef,
    input: { resource: 'note', form: 'selector', cardinality: 'many', selector: { by: 'every' } },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a negative index',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: -1 },
    },
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['selector', 'index']],
  },
  {
    name: 'a negative wire index',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '-1' } },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['selector', 'index']],
  },
  {
    name: 'a fractional index',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 1.5 },
    },
    direction: 'encode',
    expectedIssueCodes: ['not-integer'],
    expectedIssuePaths: [['selector', 'index']],
  },
  {
    name: 'a range whose start exceeds its end',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: 5, end: 2 },
    },
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['selector']],
  },
  {
    name: 'a wire range whose start exceeds its end',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '5' }, end: { integer: '2' } },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['selector']],
  },
  {
    name: 'an identity-collection entry of another resource',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'many',
      entries: [
        { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' },
        { resource: 'folder', form: 'identity', cardinality: 'one', id: 7 },
      ],
    },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [['entries', 1]],
  },
  {
    name: 'an identity-collection entry that is a selector',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'many',
      entries: [
        {
          resource: 'note',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'name', name: 'x' },
        },
      ],
    },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [['entries', 0]],
  },
  {
    name: 'a container of a resource the app does not have',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      container: { resource: 'calendar', form: 'identity', cardinality: 'one', id: 'C1' },
    },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['container']],
  },
  {
    name: 'a wire container of a resource the app does not have',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        container: { resource: 'calendar', form: 'identity', cardinality: 'one', id: 'C1' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['container']],
  },
  {
    name: 'a container that is a collection',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Groceries' },
      container: {
        resource: 'folder',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'every' },
      },
    },
    direction: 'encode',
    expectedIssueCodes: ['invalid-type'],
    expectedIssuePaths: [['container']],
  },
  {
    name: 'a non-canonical integer id on the wire',
    see: 'phases/13 §D3',
    type: folderRef,
    input: {
      reference: {
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: { integer: '007' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['not-integer'],
    expectedIssuePaths: [['id']],
  },
  {
    name: 'an undeclared key in a wire reference',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        revision: 'r1',
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['revision']],
  },

  // One strictness rule in both directions: undeclared own data is rejected.
  {
    name: 'an identity reference with a selector',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      selector: { by: 'name', name: 'Inbox' },
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['selector']],
  },
  {
    name: 'a wire identity reference with a selector',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        selector: { by: 'name', name: 'Inbox' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['selector']],
  },
  {
    name: 'a selector reference with an id',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: 0 },
      id: 'N1',
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['id']],
  },
  {
    name: 'a wire selector reference with an id',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: { integer: '0' } },
        id: 'N1',
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['id']],
  },
  {
    name: 'an identity collection with a selector and a container',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'many',
      entries: [],
      selector: { by: 'every' },
      container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field', 'unknown-field'],
    expectedIssuePaths: [['selector'], ['container']],
  },
  {
    name: 'a wire identity collection with a selector',
    see: 'phases/13 §D7',
    type: noteRefs,
    input: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [],
        selector: { by: 'every' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['selector']],
  },
  {
    name: 'a misspelled container on a reference',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      contianer: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['contianer']],
  },
  {
    name: 'a misspelled container on a wire reference',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        contianer: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['contianer']],
  },
  {
    name: 'a name selector with an index',
    see: 'phases/13 §D7',
    type: noteRef,
    input: {
      resource: 'note',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'Inbox', index: 0 },
    },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['selector', 'index']],
  },
  {
    // A reference-shaped object without its envelope is a user record to the
    // dynamic codec, and a bare user record must be enveloped on the wire.
    name: 'an unenveloped reference-shaped object in dynamic content',
    see: 'phases/13 §D3',
    type: t.unknown(),
    input: { resource: 'note', form: 'identity', cardinality: 'one', id: 'x' },
    direction: 'decode',
    expectedIssueCodes: ['invalid-control-record'],
    expectedIssuePaths: [[]],
  },

  // Identity forms of resources without an identifier.
  {
    name: 'an identity reference to a resource without an identifier',
    see: 'phases/13 §D7',
    type: paragraphRef,
    input: { resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a wire identity reference to a resource without an identifier',
    see: 'phases/13 §D7',
    type: paragraphRef,
    input: {
      reference: { resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' },
    },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    // The collection shares its entries' resource, so its own identity form is
    // rejected before any entry is read.
    name: 'an identity collection of a resource without an identifier',
    see: 'phases/13 §D7',
    type: paragraphRefs,
    input: {
      resource: 'paragraph',
      form: 'identity',
      cardinality: 'many',
      entries: [{ resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' }],
    },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'a wire identity collection of a resource without an identifier',
    see: 'phases/13 §D7',
    type: paragraphRefs,
    input: {
      reference: {
        resource: 'paragraph',
        form: 'identity',
        cardinality: 'many',
        entries: [{ resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' }],
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
  },
  {
    name: 'an identity container of a resource without an identifier',
    see: 'phases/13 §D7',
    type: wordRef,
    input: {
      resource: 'word',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'macts' },
      container: { resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' },
    },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['container']],
  },
  {
    name: 'a wire identity container of a resource without an identifier',
    see: 'phases/13 §D7',
    type: wordRef,
    input: {
      reference: {
        resource: 'word',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'macts' },
        container: { resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' },
      },
    },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [['container']],
  },

  // Files and file sources.
  {
    name: 'a bound file value sent as input has no grant to encode',
    see: 'phases/13 §D8',
    type: file,
    input: {
      path: '/Users/me/report.pdf',
      existence: { exists: true, observedAt: at(OBSERVED_AT) },
      fetch: VECTOR_FETCH,
    },
    direction: 'encode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
    // A bound file value is a valid SDK value; only the runtime encodes files.
    schemaAccepts: true,
  },
  {
    name: 'an empty file grant on the wire',
    see: 'phases/13 §D8',
    type: file,
    input: { file: { exists: true, observedAt: { date: OBSERVED_AT }, grant: '' } },
    direction: 'decode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['grant']],
  },
  {
    name: 'a file observation time that is not a real instant',
    see: 'phases/13 §D8',
    type: file,
    input: { file: { exists: true, observedAt: { date: '2026-02-30T00:00:00.000Z' }, grant: 'g' } },
    direction: 'decode',
    expectedIssueCodes: ['invalid-date'],
    expectedIssuePaths: [['existence', 'observedAt']],
  },
  {
    name: 'an upload handle does not decode',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { fileSource: { kind: 'uploaded-file', uploadId: 'U1' } },
    direction: 'decode',
    expectedIssueCodes: ['unsupported'],
    expectedIssuePaths: [[]],
    // Valid wire input: the service's transfer step resolves it from the wire.
    schemaAccepts: true,
  },
  {
    name: 'an uploaded file with a path',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { kind: 'uploaded-file', uploadId: 'U1', expiresAt: at(OBSERVED_AT), path: '/x' },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['path']],
  },
  {
    // Malformed keys are reported beside the fail-closed rejection.
    name: 'a wire upload handle with a path',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { fileSource: { kind: 'uploaded-file', uploadId: 'U1', path: '/x' } },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field', 'unsupported'],
    expectedIssuePaths: [['path'], []],
  },
  {
    name: 'a caller-owned file with an upload id',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { kind: 'caller-owned-file', path: '/x', uploadId: 'U1' },
    direction: 'encode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['uploadId']],
  },
  {
    name: 'a wire caller-owned file with an upload id',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { fileSource: { kind: 'caller-owned-file', path: '/x', uploadId: 'U1' } },
    direction: 'decode',
    expectedIssueCodes: ['unknown-field'],
    expectedIssuePaths: [['uploadId']],
  },
  {
    name: 'a caller-owned file with an empty path',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { kind: 'caller-owned-file', path: '' },
    direction: 'encode',
    expectedIssueCodes: ['out-of-range'],
    expectedIssuePaths: [['path']],
  },
  {
    name: 'an unknown file source kind',
    see: 'phases/13 §D8',
    type: fileSource,
    input: { fileSource: { kind: 'shared-folder', path: '/Volumes/share' } },
    direction: 'decode',
    expectedIssueCodes: ['unknown-enum-member'],
    expectedIssuePaths: [['kind']],
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

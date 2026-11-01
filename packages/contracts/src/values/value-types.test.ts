/**
 * Unit tests for the value-type constructors: plans, codecs in both
 * directions, issue codes and paths, schemas, and descriptions.
 *
 * Cross-cutting round trips live in the codec vectors; these tests pin each
 * constructor's own contract, including boundaries and malformed
 * compositions. Expected values are written by hand from the contract.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A2 (Numbers)
 * @see phases/13-sdk-value-and-execution-contracts.md §A3 (Dates, Geometry, and Colors)
 * @see phases/13-sdk-value-and-execution-contracts.md §A4 (Presence, Nullability, and Updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §A5 (Enums and Errors)
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (ValueType)
 * @see phases/13-sdk-value-and-execution-contracts.md §D3 (Numeric Wire Encoding and Unambiguous Decoding)
 * @see phases/13-sdk-value-and-execution-contracts.md §D9 (Zod as the single schema source)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (Positions on Precision, Signed Zero, Classification, and Dates)
 * @see https://zod.dev/json-schema
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { IssuePath } from '../issues.js'
import { Integer } from './integer.js'
import type { CodecResult, DecodeContext, ValueType } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import type { ValueIssueCode } from './value-issues.js'
import { sameValueMismatches } from './vectors/compare.js'

const context: DecodeContext = {
  bindReference() {
    throw new Error('no reference binding in value-type tests')
  },
  bindFile() {
    throw new Error('no file binding in value-type tests')
  },
}

function valueOf<T>(result: CodecResult<T>): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.issues)}`)
  return result.value
}

function issuesOf(result: CodecResult<unknown>): { path: IssuePath; code: string | undefined }[] {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map(({ path, code }) => ({ path, code }))
}

function expectEncodes(type: ValueType<unknown>, sdk: unknown, wire: unknown): void {
  expect(sameValueMismatches(valueOf(type.encode(sdk)), wire)).toEqual([])
}

function expectDecodes(type: ValueType<unknown>, wire: unknown, sdk: unknown): void {
  expect(sameValueMismatches(valueOf(type.decode(wire, context)), sdk)).toEqual([])
}

function expectEncodeIssues(
  type: ValueType<unknown>,
  sdk: unknown,
  issues: { path: IssuePath; code: ValueIssueCode }[]
): void {
  expect(issuesOf(type.encode(sdk))).toEqual(issues)
}

function expectDecodeIssues(
  type: ValueType<unknown>,
  wire: unknown,
  issues: { path: IssuePath; code: ValueIssueCode }[]
): void {
  expect(issuesOf(type.decode(wire, context))).toEqual(issues)
}

function messagesOf(result: CodecResult<unknown>): string {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map((entry) => entry.message).join('\n')
}

describe('string and boolean', () => {
  it('have their own plans and stand for themselves on the wire', () => {
    expect(t.string().plan).toEqual({ kind: 'string' })
    expect(t.boolean().plan).toEqual({ kind: 'boolean' })
    expectEncodes(t.string(), '', '')
    expectDecodes(t.string(), 'text', 'text')
    expectEncodes(t.boolean(), false, false)
    expectDecodes(t.boolean(), true, true)
  })

  it.each([
    [1, 'invalid-type'],
    [undefined, 'invalid-type'],
    [null, 'not-nullable'],
  ] as const)('a string position rejects %s as %s', (value, code) => {
    expectEncodeIssues(t.string(), value, [{ path: [], code }])
    expectDecodeIssues(t.string(), value, [{ path: [], code }])
  })

  it('a boolean position rejects the string "true"', () => {
    expectEncodeIssues(t.boolean(), 'true', [{ path: [], code: 'invalid-type' }])
  })
})

describe('integer', () => {
  const type = t.integer()

  it('has the integer plan', () => {
    expect(type.plan).toEqual({ kind: 'integer' })
  })

  it('decodes to a branded integer', () => {
    const value = valueOf(type.decode({ integer: '-42' }, context))
    expect(value).toBe(-42)
    expect(Integer.is(value)).toBe(true)
  })

  it.each([
    ['a fraction', 0.5, 'not-integer'],
    ['Infinity', Number.POSITIVE_INFINITY, 'not-integer'],
    ['one past the safe range', 2 ** 53, 'out-of-range'],
    ['one below the safe range', -(2 ** 53), 'out-of-range'],
    ['a bigint', 1n, 'invalid-type'],
  ] as const)('encode rejects %s', (_label, value, code) => {
    expectEncodeIssues(type, value, [{ path: [], code }])
  })

  it('names the explicit conversions when rejecting a fraction', () => {
    expect(messagesOf(type.encode(2.5))).toMatch(/Integer\.round.*Integer\.truncate/)
  })

  it.each([
    ['extra keys', { integer: '1', unit: 'px' }, 'invalid-control-record'],
    ['no keys', {}, 'invalid-control-record'],
    ['an array', ['1'], 'invalid-type'],
    ['null', null, 'not-nullable'],
    ['text with a plus sign', { integer: '+1' }, 'not-integer'],
  ] as const)('decode rejects %s', (_label, wire, code) => {
    expectDecodeIssues(type, wire, [{ path: [], code }])
  })

  it('has an SDK schema that brands integers and rejects fractions', () => {
    expect(type.sdk.parse(3)).toBe(3)
    expect(type.sdk.safeParse(3.5).success).toBe(false)
    expect(type.sdk.safeParse(2 ** 53).success).toBe(false)
  })
})

describe('double', () => {
  const type = t.double()

  it('keeps +0 as a JSON number', () => {
    const wire = valueOf(type.encode(0))
    expect(wire).toEqual({ double: 0 })
    expect(Object.is((wire as { double: unknown }).double, 0)).toBe(true)
  })

  it('rejects a non-number', () => {
    expectEncodeIssues(type, '3', [{ path: [], code: 'invalid-type' }])
  })

  it('has an SDK schema that accepts every number state', () => {
    for (const value of [3, -0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(type.sdk.safeParse(value).success).toBe(true)
    }
    expect(type.sdk.safeParse('3').success).toBe(false)
  })

  it('reports an integer record at a double position as the wrong control record', () => {
    expectDecodeIssues(type, { integer: '3' }, [{ path: [], code: 'invalid-control-record' }])
  })
})

describe('date', () => {
  const type = t.date()

  it('decodes into a new Date each time', () => {
    const first = valueOf(type.decode({ date: '2026-10-31T17:04:05.120Z' }, context))
    const second = valueOf(type.decode({ date: '2026-10-31T17:04:05.120Z' }, context))
    expect(first).toBeInstanceOf(Date)
    expect(first).not.toBe(second)
  })

  it('round-trips the earliest supported instant as year 0, not 1900', () => {
    const date = valueOf(type.decode({ date: '0000-01-01T00:00:00.000Z' }, context))
    expect(date.getUTCFullYear()).toBe(0)
    expectEncodes(type, date, { date: '0000-01-01T00:00:00.000Z' })
    expectEncodeIssues(type, new Date(date.getTime() - 1), [{ path: [], code: 'out-of-range' }])
  })

  it('accepts the latest supported instant and rejects one millisecond later', () => {
    const latest = new Date('9999-12-31T23:59:59.999Z')
    expectEncodes(type, latest, { date: '9999-12-31T23:59:59.999Z' })
    expectEncodeIssues(type, new Date(latest.getTime() + 1), [{ path: [], code: 'out-of-range' }])
  })

  it('rejects a date string at an SDK date position', () => {
    expectEncodeIssues(type, '2026-10-31T17:04:05.120Z', [{ path: [], code: 'invalid-type' }])
  })

  it('has an SDK schema that rejects invalid and unsupported dates', () => {
    expect(type.sdk.safeParse(new Date('2026-10-31T17:04:05.120Z')).success).toBe(true)
    expect(type.sdk.safeParse(new Date(Number.NaN)).success).toBe(false)
    expect(type.sdk.safeParse(new Date('+010000-01-01T00:00:00.000Z')).success).toBe(false)
  })
})

describe('point, rectangle, and rgb', () => {
  it('have their own plans', () => {
    expect(t.point().plan).toEqual({ kind: 'point' })
    expect(t.rectangle().plan).toEqual({ kind: 'rectangle' })
    expect(t.rgb().plan).toEqual({ kind: 'rgb' })
  })

  it('reports each problem in a point at its member', () => {
    expectEncodeIssues(t.point(), { x: '1' }, [
      { path: ['x'], code: 'invalid-type' },
      { path: ['y'], code: 'missing-field' },
    ])
  })

  it('preserves non-finite members and signed zero in geometry', () => {
    expectEncodes(
      t.rectangle(),
      { x: -0, y: Number.NaN, width: Number.POSITIVE_INFINITY, height: 1 },
      {
        x: { double: '-0' },
        y: { double: 'NaN' },
        width: { double: 'Infinity' },
        height: { double: 1 },
      }
    )
  })

  it('rejects a point that is a class instance', () => {
    class Vector {
      constructor(
        readonly x: number,
        readonly y: number
      ) {}
    }
    expectEncodeIssues(t.point(), new Vector(1, 2), [{ path: [], code: 'invalid-type' }])
  })

  it.each([
    ['a fractional channel', { r: 1.5, g: 0, b: 0 }, [{ path: ['r'], code: 'not-integer' }]],
    ['a negative channel', { r: 0, g: -1, b: 0 }, [{ path: ['g'], code: 'out-of-range' }]],
    ['a missing channel', { r: 0, g: 0 }, [{ path: ['b'], code: 'missing-field' }]],
  ] as const)('rgb encode rejects %s', (_label, value, issues) => {
    expectEncodeIssues(t.rgb(), value, [...issues])
  })

  it('rgb decode rejects a double channel', () => {
    expectDecodeIssues(t.rgb(), { r: { double: 1 }, g: { integer: '0' }, b: { integer: '0' } }, [
      { path: ['r'], code: 'invalid-control-record' },
    ])
  })

  it('rgb channel range is visible to the wire schema', () => {
    expect(
      t.rgb().wire.safeParse({ r: { integer: '65535' }, g: { integer: '0' }, b: { integer: '0' } })
        .success
    ).toBe(true)
    expect(
      t.rgb().wire.safeParse({ r: { integer: '65536' }, g: { integer: '0' }, b: { integer: '0' } })
        .success
    ).toBe(false)
  })
})

describe('enumeration', () => {
  const statuses = t.enumeration(['confirmed', 'tentative', 'cancelled'])

  it('carries its members in the plan', () => {
    expect(statuses.plan).toEqual({
      kind: 'enum',
      members: ['confirmed', 'tentative', 'cancelled'],
    })
  })

  it('names the received value and the known members when encoding a non-member', () => {
    const message = messagesOf(statuses.encode('postponed'))
    expect(message).toContain('"postponed"')
    expect(message).toContain('"confirmed", "tentative", "cancelled"')
  })

  it('names the path, value, and members, and suggests upgrading, when decoding an unknown member', () => {
    const event = t.record({ sessions: t.array(t.record({ status: statuses })) })
    const result = event.decode(
      { sessions: [{ status: 'confirmed' }, { status: 'postponed' }] },
      context
    )
    expect(issuesOf(result)).toEqual([
      { path: ['sessions', 1, 'status'], code: 'unknown-enum-member' },
    ])
    const message = messagesOf(result)
    expect(message).toContain('sessions[1].status')
    expect(message).toContain('"postponed"')
    expect(message).toContain('"confirmed", "tentative", "cancelled"')
    expect(message).toMatch(/upgrad/i)
  })

  it('rejects a malformed composition', () => {
    expect(() => t.enumeration([] as unknown as [string])).toThrow(TypeError)
    expect(() => t.enumeration(['a', 'b', 'a'])).toThrow(/"a" appears more than once/)
  })
})

describe('array', () => {
  const integers = t.array(t.integer())

  it('nests the item plan', () => {
    expect(integers.plan).toEqual({ kind: 'array', items: { kind: 'integer' } })
  })

  it('encodes and decodes every element, including none', () => {
    expectEncodes(integers, [], [])
    expectEncodes(integers, [1, -0], [{ integer: '1' }, { integer: '0' }])
    expectDecodes(integers, [{ integer: '1' }], [1])
  })

  it('reports every bad element at its index', () => {
    expectEncodeIssues(
      integers,
      [1, 1.5, '3', null],
      [
        { path: [1], code: 'not-integer' },
        { path: [2], code: 'invalid-type' },
        { path: [3], code: 'not-nullable' },
      ]
    )
    expectDecodeIssues(
      integers,
      [{ integer: '1' }, { double: 1 }],
      [{ path: [1], code: 'invalid-control-record' }]
    )
  })

  it('rejects a non-array', () => {
    expectEncodeIssues(integers, { 0: 1, length: 1 }, [{ path: [], code: 'invalid-type' }])
  })
})

describe('record', () => {
  const event = t.record({
    id: t.string(),
    note: t.optional(t.nullable(t.string())),
    count: t.integer(),
    location: t.nullable(t.string()),
  })

  it('derives field plans with presence and nullability as separate axes', () => {
    expect(event.plan).toEqual({
      kind: 'record',
      fields: {
        id: { presence: 'required', value: { kind: 'string' } },
        note: { presence: 'optional', value: { kind: 'nullable', value: { kind: 'string' } } },
        count: { presence: 'required', value: { kind: 'integer' } },
        location: { presence: 'required', value: { kind: 'nullable', value: { kind: 'string' } } },
      },
    })
  })

  it('omits an absent optional field and keeps a present null', () => {
    const wire = valueOf(event.encode({ id: 'E1', count: 1, location: null }))
    expect(Object.hasOwn(wire as object, 'note')).toBe(false)
    expect(Object.hasOwn(wire as object, 'location')).toBe(true)

    const withNull = valueOf(event.encode({ id: 'E1', count: 1, location: 'Home', note: null }))
    expect(withNull).toEqual({ id: 'E1', count: { integer: '1' }, location: 'Home', note: null })
  })

  it('treats an optional field holding undefined as absent, never as an own undefined', () => {
    const wire = valueOf(event.encode({ id: 'E1', count: 1, location: null, note: undefined }))
    expect(Object.hasOwn(wire as object, 'note')).toBe(false)
  })

  it('decodes an absent optional field to no own property, and a null to an own null', () => {
    const absent = valueOf(
      event.decode({ id: 'E1', count: { integer: '1' }, location: null }, context)
    )
    expect(Object.hasOwn(absent, 'note')).toBe(false)
    expect(Object.hasOwn(absent, 'location')).toBe(true)
    expect(absent.location).toBeNull()

    const present = valueOf(
      event.decode({ id: 'E1', count: { integer: '1' }, location: null, note: null }, context)
    )
    expect(Object.hasOwn(present, 'note')).toBe(true)
    expect(present.note).toBeNull()
  })

  it('reports every problem, each at its field', () => {
    expectEncodeIssues(event, { id: 1, count: 1.5, location: undefined, extra: true }, [
      { path: ['id'], code: 'invalid-type' },
      { path: ['count'], code: 'not-integer' },
      { path: ['location'], code: 'missing-field' },
      { path: ['extra'], code: 'unknown-field' },
    ])
  })

  it.each([
    ['a string', 'E1', 'invalid-type'],
    ['an array', [], 'invalid-type'],
    ['a Map', new Map(), 'invalid-type'],
    ['null', null, 'not-nullable'],
  ] as const)('rejects %s as a record', (_label, value, code) => {
    expectEncodeIssues(event, value, [{ path: [], code }])
  })

  it('reads a declared field named like a control-record key as a field', () => {
    const shaped = t.record({ integer: t.string(), double: t.optional(t.integer()) })
    expectDecodes(shaped, { integer: '42' }, { integer: '42' })
    expectDecodes(shaped, { integer: '42', double: { integer: '1' } }, { integer: '42', double: 1 })
  })

  it('accepts a record with no fields only as an empty object', () => {
    const empty = t.record({})
    expectEncodes(empty, {}, {})
    expectEncodeIssues(empty, { a: 1 }, [{ path: ['a'], code: 'unknown-field' }])
  })

  it('has strict SDK and wire schemas that agree on presence', () => {
    expect(event.sdk.safeParse({ id: 'E1', count: 1, location: null }).success).toBe(true)
    expect(
      event.sdk.safeParse({ id: 'E1', count: 1, location: null, note: undefined }).success
    ).toBe(true)
    expect(event.sdk.safeParse({ id: 'E1', count: 1, location: null, extra: 1 }).success).toBe(
      false
    )
    expect(
      event.wire.safeParse({ id: 'E1', count: { integer: '1' }, location: null }).success
    ).toBe(true)
    expect(event.wire.safeParse({ id: 'E1', count: { integer: '1' } }).success).toBe(false)
  })

  it.each([
    ['a plain value', { id: 'not a value type' }],
    ['a none type', { result: t.none() }],
    ['an optional none type', { result: t.optional(t.none()) }],
  ])('rejects %s as a field', (_label, fields) => {
    expect(() => t.record(fields as never)).toThrow(TypeError)
  })
})

describe('none outside a result', () => {
  it.each([
    ['an array item', () => t.array(t.none())],
    ['a nullable value', () => t.nullable(t.none())],
    ['a record field', () => t.record({ result: t.none() })],
    ['an optional record field', () => t.record({ result: t.optional(t.none()) })],
  ])('cannot be %s', (_label, build) => {
    expect(build).toThrow(TypeError)
    expect(build).toThrow(/absence of a result/)
  })
})

describe('nullable and optional', () => {
  it('nullable wraps the inner plan and admits null in both directions', () => {
    const type = t.nullable(t.date())
    expect(type.plan).toEqual({ kind: 'nullable', value: { kind: 'date' } })
    expectEncodes(type, null, null)
    expectDecodes(type, null, null)
    expectEncodes(type, new Date('2026-10-31T17:04:05.120Z'), { date: '2026-10-31T17:04:05.120Z' })
  })

  it('nullable does not admit undefined outside a record', () => {
    expectEncodeIssues(t.nullable(t.string()), undefined, [{ path: [], code: 'invalid-type' }])
  })

  it('optional is a field marker carrying its value type', () => {
    const inner = t.string()
    const field = t.optional(inner)
    expect(field.presence).toBe('optional')
    expect(field.type).toBe(inner)
  })
})

describe('unknown', () => {
  const type = t.unknown()

  it('omits undefined record values, which are absent', () => {
    expectEncodes(type, { a: undefined, b: 1 }, { record: { b: { double: 1 } } })
  })

  /** `[1, <hole>, 3]`, built without a sparse literal. */
  const holey = (): unknown[] => {
    const items = new Array<unknown>(3)
    items[0] = 1
    items[2] = 3
    return items
  }

  it.each([
    ['at the root', undefined, []],
    ['as an array element', [1, undefined], [1]],
    ['as a hole in a sparse array', holey(), [1]],
    ['nested in a record and an array', { list: ['a', undefined] }, ['list', 1]],
  ] as const)('rejects undefined %s rather than materializing null', (_label, value, path) => {
    const result = type.encode(value)
    expect(issuesOf(result)).toEqual([{ path, code: 'unsupported' }])
    expect(messagesOf(result)).toContain(
      'Absent values cannot be represented outside a record field'
    )
  })

  it('encodes integral numbers, including branded integers, as doubles', () => {
    expectEncodes(type, 3, { double: 3 })
    expectEncodes(type, Integer.validate(3), { double: 3 })
  })

  it('decodes envelopes into plain objects, keeping keys such as __proto__ as data', () => {
    const payload: unknown = JSON.parse('{"__proto__": "x", "a": {"record": {}}}')
    const decoded = valueOf(type.decode({ record: payload }, context))
    expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype)
    expect(Object.hasOwn(decoded as object, '__proto__')).toBe(true)
    expect(sameValueMismatches(decoded, JSON.parse('{"__proto__": "x", "a": {}}'))).toEqual([])
  })

  it.each([
    ['a symbol', Symbol('s'), [{ path: [], code: 'unsupported' }]],
    ['a Map', new Map(), [{ path: [], code: 'unsupported' }]],
    ['an invalid Date', new Date(Number.NaN), [{ path: [], code: 'invalid-date' }]],
    ['a function nested in a record', { a: [() => 1] }, [{ path: ['a', 0], code: 'unsupported' }]],
  ] as const)('encode rejects %s', (_label, value, issues) => {
    expectEncodeIssues(type, value, [...issues])
  })

  it('rejects a circular structure rather than recursing forever', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' }
    cyclic['self'] = cyclic
    expectEncodeIssues(type, cyclic, [{ path: ['self'], code: 'unsupported' }])
  })

  it('accepts the same object twice when it is shared rather than circular', () => {
    const shared = { a: 1 }
    expectEncodes(
      type,
      [shared, shared],
      [{ record: { a: { double: 1 } } }, { record: { a: { double: 1 } } }]
    )
  })

  it.each([
    [
      'a nested bare object, at its location in the user data',
      { record: { a: [{ name: 'x' }] } },
      [{ path: ['a', 0], code: 'invalid-control-record' }],
    ],
    ['a file value', { file: { grant: 'g' } }, [{ path: [], code: 'unsupported' }]],
    [
      'a reference nested in envelopes',
      { record: { owner: { record: { ref: { reference: {} } } } } },
      [{ path: ['owner', 'ref'], code: 'unsupported' }],
    ],
    [
      'an envelope holding an array',
      { record: [] },
      [{ path: [], code: 'invalid-control-record' }],
    ],
    [
      'a two-key object',
      { integer: '1', double: 1 },
      [{ path: [], code: 'invalid-control-record' }],
    ],
    [
      'a file source, which appears only at typed positions',
      { fileSource: { kind: 'caller-owned-file', path: '/x' } },
      [{ path: [], code: 'unsupported' }],
    ],
    ['undefined', undefined, [{ path: [], code: 'invalid-type' }]],
  ] as const)('decode rejects %s', (_label, wire, issues) => {
    expectDecodeIssues(type, wire, [...issues])
  })

  it('names the same location in both directions: the user data, never the envelope', () => {
    const sdk = { outer: { inner: [1, () => 1] } }
    const wire = { record: { outer: { record: { inner: [{ double: 1 }, { integer: '007' }] } } } }
    expect(issuesOf(type.encode(sdk))).toEqual([
      { path: ['outer', 'inner', 1], code: 'unsupported' },
    ])
    expect(issuesOf(type.decode(wire, context))).toEqual([
      { path: ['outer', 'inner', 1], code: 'not-integer' },
    ])
  })

  it('states the rule for references, files, and file sources in dynamic content', () => {
    for (const wire of [{ reference: {} }, { file: {} }, { fileSource: {} }]) {
      expect(messagesOf(type.decode(wire, context))).toBe(
        'References, files, and file sources cannot be represented in dynamic content; declare them at a typed position.'
      )
    }
  })
})

describe('none', () => {
  it('is undefined in the SDK and null on the wire', () => {
    const type = t.none()
    expect(type.plan).toEqual({ kind: 'none' })
    expectEncodes(type, undefined, null)
    expect(type.decode(null, context)).toEqual({ ok: true, value: undefined })
    expectDecodeIssues(type, 'done', [{ path: [], code: 'invalid-type' }])
    expectEncodeIssues(type, 0, [{ path: [], code: 'invalid-type' }])
  })
})

describe('every constructor', () => {
  const all: readonly (readonly [string, ValueType<unknown>])[] = [
    ['string', t.string()],
    ['boolean', t.boolean()],
    ['integer', t.integer()],
    ['double', t.double()],
    ['date', t.date()],
    ['point', t.point()],
    ['rectangle', t.rectangle()],
    ['rgb', t.rgb()],
    ['enumeration', t.enumeration(['a', 'b'])],
    ['array', t.array(t.string())],
    ['record', t.record({ a: t.string(), b: t.optional(t.nullable(t.integer())) })],
    ['nullable', t.nullable(t.double())],
    ['unknown', t.unknown()],
    ['none', t.none()],
    ['reference', t.reference(() => ({ note: { id: t.string() } }), 'note', 'one')],
    ['file', t.file()],
    ['fileSource', t.fileSource()],
  ]

  it.each(all)('%s has a frozen, JSON-serializable plan', (_name, type) => {
    expect(Object.isFrozen(type.plan)).toBe(true)
    expect(JSON.parse(JSON.stringify(type.plan))).toEqual(type.plan)
  })

  it.each(all)('%s has a wire schema that converts to draft-7 JSON Schema', (_name, type) => {
    expect(() => z.toJSONSchema(type.wire, { target: 'draft-7' })).not.toThrow()
  })

  it.each(all)('%s is frozen', (_name, type) => {
    expect(Object.isFrozen(type)).toBe(true)
  })

  it('derives a record JSON Schema that requires only required fields and admits no others', () => {
    const schema = z.toJSONSchema(
      t.record({ a: t.string(), b: t.optional(t.nullable(t.integer())) }).wire,
      {
        target: 'draft-7',
      }
    ) as Record<string, unknown>
    expect(schema['type']).toBe('object')
    expect(schema['required']).toEqual(['a'])
    expect(schema['additionalProperties']).toBe(false)
  })
})

describe('descriptions', () => {
  it('apply to both the SDK and wire schemas and reach the JSON Schema', () => {
    const title = t.string({ description: 'The event title.' })
    expect(title.sdk.description).toBe('The event title.')
    expect(title.wire.description).toBe('The event title.')

    const event = t.record(
      { title, when: t.date({ description: 'When the event starts.' }) },
      { description: 'An event.' }
    )
    const schema = z.toJSONSchema(event.wire, { target: 'draft-7' }) as {
      description?: string
      properties: Record<string, { description?: string }>
    }
    expect(schema.description).toBe('An event.')
    expect(schema.properties['title']?.description).toBe('The event title.')
    expect(schema.properties['when']?.description).toBe('When the event starts.')
  })

  it('do not leak between value types built from the same constructor', () => {
    t.integer({ description: 'A count.' })
    expect(t.integer().wire.description).toBeUndefined()
  })
})

describe('user-facing messages', () => {
  it('never mention the native automation layer', () => {
    const results = [
      t.integer().encode(1.5),
      t.integer().decode({ integer: '-0' }, context),
      t.date().decode({ date: '2026-02-30T00:00:00.000Z' }, context),
      t.record({ a: t.string() }).encode({ b: 1 }),
      t.unknown().encode(() => 1),
      t.unknown().decode({ name: 'x' }, context),
    ]
    for (const result of results)
      expect(messagesOf(result)).not.toMatch(/applescript|jxa|osascript/i)
  })
})

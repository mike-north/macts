/**
 * Tests for the zod schemas of wire control records.
 *
 * Accepted and rejected payloads come from the wire contract: integers are
 * canonical decimal text within the safe integers; doubles are finite JSON
 * numbers or one of four explicit states; dates are ISO 8601 with exactly
 * three fractional digits and an explicit offset, naming a real instant;
 * dynamic content is self-describing, with user records enveloped. HTTP and
 * MCP JSON Schemas are derived from these schemas, so the derivation is tested
 * structurally too.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D3 (Numeric Wire Encoding and Unambiguous Decoding)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (Binary Transfer Handle Shapes: wire forms, file sources)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (Integer and signed zero, Double and signed zero)
 * @see phases/13-sdk-value-and-execution-contracts.md §D9 (Zod as the single schema source)
 * @see https://zod.dev/json-schema
 * @see https://json-schema.org/draft-07/json-schema-release-notes
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DynamicWireValueSchema,
  FileSourceWireSchema,
  FileWireSchema,
  WireDateSchema,
  WireDoubleSchema,
  WireIntegerSchema,
} from './wire-schemas.js'

function accepts(schema: z.ZodType, value: unknown): boolean {
  return schema.safeParse(value).success
}

function messages(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value)
  return result.success ? [] : result.error.issues.map((entry) => entry.message)
}

describe('WireIntegerSchema', () => {
  it.each(['0', '42', '-7', '9007199254740991', '-9007199254740991'])('accepts %j', (text) => {
    expect(accepts(WireIntegerSchema, { integer: text })).toBe(true)
  })

  it.each([
    ['above the safe range', '9007199254740992'],
    ['below the safe range', '-9007199254740992'],
    ['far above the safe range', '123456789012345678901234567890'],
    ['signed zero', '-0'],
    ['leading zeros', '007'],
    ['a plus sign', '+1'],
    ['a fraction', '1.5'],
    ['an exponent', '1e3'],
    ['empty text', ''],
    ['surrounding space', ' 1'],
    ['hexadecimal', '0x10'],
  ])('rejects %s', (_label, text) => {
    expect(accepts(WireIntegerSchema, { integer: text })).toBe(false)
  })

  it.each([
    ['a JSON number payload', { integer: 42 }],
    ['a missing payload', {}],
    ['an extra key', { integer: '1', double: 1 }],
    ['bare text', '42'],
    ['a bare number', 42],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(accepts(WireIntegerSchema, value)).toBe(false)
  })

  it('explains signed zero and range failures', () => {
    expect(messages(WireIntegerSchema, { integer: '-0' }).join(' ')).toContain('signed zero')
    expect(messages(WireIntegerSchema, { integer: '9007199254740992' }).join(' ')).toContain(
      '-9007199254740991..9007199254740991'
    )
  })
})

describe('WireDoubleSchema', () => {
  it.each([
    3,
    0.1,
    -1.5,
    0,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    -Number.MAX_VALUE,
    'NaN',
    'Infinity',
    '-Infinity',
    '-0',
  ])('accepts the payload %s', (payload) => {
    expect(accepts(WireDoubleSchema, { double: payload })).toBe(true)
  })

  it('accepts a JSON -0 number, which decoders tolerate though encoders never emit it', () => {
    expect(accepts(WireDoubleSchema, JSON.parse('{"double":-0}'))).toBe(true)
  })

  it('rejects an overflowing JSON literal that parses to Infinity', () => {
    expect(accepts(WireDoubleSchema, JSON.parse('{"double":1e999}'))).toBe(false)
  })

  it.each([
    ['a non-finite number', Number.POSITIVE_INFINITY],
    ['NaN as a number', Number.NaN],
    ['a lowercase state', 'nan'],
    ['numeric text', '1.5'],
    ['null', null],
    ['a boolean', true],
  ])('rejects %s as the payload', (_label, payload) => {
    expect(accepts(WireDoubleSchema, { double: payload })).toBe(false)
  })

  it.each([
    ['a bare number', 3],
    ['an extra key', { double: 1, integer: '1' }],
    ['an integer record', { integer: '1' }],
  ])('rejects %s', (_label, value) => {
    expect(accepts(WireDoubleSchema, value)).toBe(false)
  })
})

describe('WireDateSchema', () => {
  it.each([
    '2026-10-31T17:04:05.120Z',
    '2026-10-31T17:04:05.120+02:30',
    '2026-10-31T17:04:05.120-23:59',
    '2024-02-29T00:00:00.000Z',
    '2000-02-29T12:00:00.000Z',
    '0000-01-01T00:00:00.000Z',
    '9999-12-31T23:59:59.999Z',
  ])('accepts %j', (text) => {
    expect(accepts(WireDateSchema, { date: text })).toBe(true)
  })

  it.each([
    ['February 30', '2026-02-30T00:00:00.000Z'],
    ['February 29 in a common year', '2026-02-29T00:00:00.000Z'],
    ['February 29 in a century common year', '1900-02-29T00:00:00.000Z'],
    ['April 31', '2026-04-31T00:00:00.000Z'],
    ['month 13', '2026-13-01T00:00:00.000Z'],
    ['month 00', '2026-00-10T00:00:00.000Z'],
    ['day 00', '2026-10-00T00:00:00.000Z'],
    ['hour 24', '2026-10-31T24:00:00.000Z'],
    ['minute 60', '2026-10-31T17:60:00.000Z'],
    ['second 60', '2026-10-31T17:04:60.000Z'],
    ['offset hour 24', '2026-10-31T17:04:05.120+24:00'],
    ['offset minute 60', '2026-10-31T17:04:05.120+05:60'],
    ['no fractional digits', '2026-10-31T17:04:05Z'],
    ['two fractional digits', '2026-10-31T17:04:05.12Z'],
    ['four fractional digits', '2026-10-31T17:04:05.1200Z'],
    ['no offset', '2026-10-31T17:04:05.120'],
    ['a lowercase z', '2026-10-31T17:04:05.120z'],
    ['a space separator', '2026-10-31 17:04:05.120Z'],
    ['a compact offset', '2026-10-31T17:04:05.120+0230'],
    ['a date only', '2026-10-31'],
    ['an expanded year', '+010000-01-01T00:00:00.000Z'],
  ])('rejects %s', (_label, text) => {
    expect(accepts(WireDateSchema, { date: text })).toBe(false)
  })

  it('explains a calendar failure', () => {
    expect(messages(WireDateSchema, { date: '2026-02-30T00:00:00.000Z' }).join(' ')).toContain(
      'February 2026 has no day 30'
    )
  })

  it.each([
    ['a JSON number payload', { date: 0 }],
    ['an extra key', { date: '2026-10-31T17:04:05.120Z', zone: 'UTC' }],
    ['bare text', '2026-10-31T17:04:05.120Z'],
  ])('rejects %s', (_label, value) => {
    expect(accepts(WireDateSchema, value)).toBe(false)
  })
})

describe('DynamicWireValueSchema', () => {
  it.each([
    ['a string', 'text'],
    ['a boolean', false],
    ['null', null],
    ['an empty array', []],
    ['a mixed array', [{ integer: '1' }, 'text', null, true]],
    ['an integer', { integer: '42' }],
    ['a double state', { double: 'NaN' }],
    ['a date', { date: '2026-10-31T17:04:05.120Z' }],
    ['an empty record envelope', { record: {} }],
    [
      'nested envelopes whose keys collide with control-record keys',
      {
        record: {
          integer: { integer: '7' },
          nested: { record: { when: { date: '2026-10-31T17:04:05.120Z' } } },
          list: [{ record: { double: { double: -0.5 } } }],
        },
      },
    ],
  ])('accepts %s', (_label, value) => {
    expect(accepts(DynamicWireValueSchema, value)).toBe(true)
  })

  it.each([
    ['a bare number', 42],
    ['a bare user record', { name: 'not enveloped' }],
    ['a bare number inside an envelope', { record: { count: 3 } }],
    ['a bare user record inside an array', [{ name: 'x' }]],
    ['an integer record with a number payload', { integer: 1 }],
    ['an invalid integer payload deep inside', [{ record: { x: { integer: '007' } } }]],
    ['a record envelope holding an array', { record: [] }],
    ['a two-key object', { integer: '1', double: 2 }],
    // Every object in dynamic content is a single-key control record, so an
    // empty object matches no kind, even though some kinds' payloads are
    // schemas that would admit an absent key.
    ['an empty object', {}],
    ['an empty object inside an envelope', { record: { x: {} } }],
    ['an empty object inside an array', [{}]],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(accepts(DynamicWireValueSchema, value)).toBe(false)
  })

  it.each([
    [
      'reference',
      { reference: { resource: 'events', form: 'identity', cardinality: 'one', id: 'E1' } },
      ['reference'],
    ],
    ['file', { file: { grant: 'g' } }, ['file']],
    [
      'file source',
      { fileSource: { kind: 'caller-owned-file', path: '/Users/me/a.pdf' } },
      ['fileSource'],
    ],
    ['file source', [{ fileSource: { kind: 'upload' } }], [0, 'fileSource']],
    ['reference', { record: { owner: [{ reference: {} }] } }, ['record', 'owner', 0, 'reference']],
  ] as const)(
    'rejects a %s value as not representable in dynamic content, at its path',
    (_kind, value, path) => {
      const result = DynamicWireValueSchema.safeParse(value)
      expect(result.success).toBe(false)
      const issues = result.error?.issues ?? []
      expect(issues).toHaveLength(1)
      expect(issues[0]?.message).toBe(
        'References, files, and file sources cannot be represented in dynamic content; declare them at a typed position.'
      )
      expect(issues[0]?.path).toEqual(path)
    }
  )
})

describe('FileWireSchema', () => {
  const observedAt = { date: '2026-10-31T17:04:05.120Z' }

  it.each([
    ['with a path', { path: '/Users/me/a.pdf', exists: true, observedAt, grant: 'g' }],
    ['without a path', { exists: false, observedAt, grant: 'g' }],
  ])('accepts a file payload %s', (_label, payload) => {
    expect(accepts(FileWireSchema, payload)).toBe(true)
  })

  it.each([
    ['an empty grant', { exists: true, observedAt, grant: '' }],
    ['no grant', { exists: true, observedAt }],
    ['an undeclared key', { exists: true, observedAt, grant: 'g', size: 1 }],
    ['a bare observation time', { exists: true, observedAt: observedAt.date, grant: 'g' }],
    [
      'an impossible observation time',
      { exists: true, observedAt: { date: '2026-02-30T00:00:00.000Z' }, grant: 'g' },
    ],
    ['the SDK existence shape', { existence: { exists: true, observedAt }, grant: 'g' }],
    ['a null path', { path: null, exists: true, observedAt, grant: 'g' }],
  ])('rejects %s', (_label, payload) => {
    expect(accepts(FileWireSchema, payload)).toBe(false)
  })
})

describe('FileSourceWireSchema', () => {
  it.each([
    ['a caller-owned file', { kind: 'caller-owned-file', path: '/Users/me/a.pdf' }],
    ['an uploaded file', { kind: 'uploaded-file', uploadId: 'U1' }],
  ])('accepts %s', (_label, payload) => {
    expect(accepts(FileSourceWireSchema, payload)).toBe(true)
  })

  it.each([
    ['an empty path', { kind: 'caller-owned-file', path: '' }],
    ['an empty upload id', { kind: 'uploaded-file', uploadId: '' }],
    [
      "an uploaded file with the caller's expiry",
      { kind: 'uploaded-file', uploadId: 'U1', expiresAt: { date: '2026-10-31T17:04:05.120Z' } },
    ],
    ['an uploaded file named by path', { kind: 'uploaded-file', path: '/a' }],
    ['an unknown kind', { kind: 'shared-folder', path: '/a' }],
    ['no kind', { path: '/a' }],
    ['a bare path', '/a'],
  ])('rejects %s', (_label, payload) => {
    expect(accepts(FileSourceWireSchema, payload)).toBe(false)
  })
})

describe('JSON Schema derivation', () => {
  const toJsonSchema = (schema: z.ZodType): Record<string, unknown> =>
    z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>

  it.each([
    ['WireIntegerSchema', WireIntegerSchema],
    ['WireDoubleSchema', WireDoubleSchema],
    ['WireDateSchema', WireDateSchema],
    ['DynamicWireValueSchema', DynamicWireValueSchema],
    ['FileWireSchema', FileWireSchema],
    ['FileSourceWireSchema', FileSourceWireSchema],
  ] as const)('converts %s without throwing', (_name, schema) => {
    expect(() => toJsonSchema(schema)).not.toThrow()
  })

  it('describes an integer as a single required decimal-text key', () => {
    const schema = toJsonSchema(WireIntegerSchema)
    expect(schema['type']).toBe('object')
    expect(schema['required']).toEqual(['integer'])
    expect(schema['additionalProperties']).toBe(false)
    expect(schema['properties']).toEqual({
      integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
    })
  })

  it('describes a double as a single required key holding a number or a state', () => {
    const schema = toJsonSchema(WireDoubleSchema)
    expect(schema['type']).toBe('object')
    expect(schema['required']).toEqual(['double'])
    expect(schema['additionalProperties']).toBe(false)
    expect(schema['properties']).toEqual({
      double: {
        anyOf: [
          { type: 'number' },
          { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
        ],
      },
    })
  })

  it('describes a date as a single required key holding patterned text', () => {
    const schema = toJsonSchema(WireDateSchema)
    expect(schema['type']).toBe('object')
    expect(schema['required']).toEqual(['date'])
    expect(schema['additionalProperties']).toBe(false)
    expect(schema['properties']).toEqual({
      date: {
        type: 'string',
        pattern: String.raw`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$`,
      },
    })
  })

  it('describes a file payload with its required keys and no others', () => {
    const schema = toJsonSchema(FileWireSchema)
    expect(schema['type']).toBe('object')
    expect(schema['required']).toEqual(['exists', 'observedAt', 'grant'])
    expect(schema['additionalProperties']).toBe(false)
    expect((schema['properties'] as Record<string, unknown>)['grant']).toEqual({
      type: 'string',
      minLength: 1,
    })
  })

  it('describes a file source as exactly two strict kinds', () => {
    const branches =
      toJsonSchema(FileSourceWireSchema)['oneOf'] ?? toJsonSchema(FileSourceWireSchema)['anyOf']
    expect(Array.isArray(branches)).toBe(true)
    expect(branches).toHaveLength(2)
    for (const branch of branches as Record<string, unknown>[]) {
      expect(branch['additionalProperties']).toBe(false)
    }
  })

  it('admits no reference, file, or file source in dynamic content', () => {
    const branches = toJsonSchema(DynamicWireValueSchema)['anyOf'] as Record<string, unknown>[]
    for (const key of ['reference', 'file', 'fileSource']) {
      const branch = branches.find((candidate) => {
        const properties = candidate['properties']
        return typeof properties === 'object' && properties !== null && key in properties
      })
      // The key appears only to report the rule; its payload schema admits nothing.
      expect(branch).toEqual({
        type: 'object',
        properties: { [key]: { not: {} } },
        required: [key],
        additionalProperties: false,
      })
    }
  })

  it('describes dynamic content as a recursive union that admits no bare numbers', () => {
    const schema = toJsonSchema(DynamicWireValueSchema)
    const branches = schema['anyOf']
    expect(Array.isArray(branches)).toBe(true)
    expect(branches).toEqual(
      expect.arrayContaining([{ type: 'string' }, { type: 'boolean' }, { type: 'null' }])
    )
    expect(branches).not.toEqual(expect.arrayContaining([{ type: 'number' }]))
  })
})

/**
 * Runs every codec vector through the value-type codecs, in each direction
 * the vector holds.
 *
 * Expectations live in the vectors, written by hand from the contract. Results
 * are compared exactly: numbers with `Object.is` (so `-0` and `NaN` are
 * checked, not glossed over) and object keys with `Object.hasOwn` (so absence
 * and an own `undefined` differ). Encoded values must also survive plain JSON
 * serialization unchanged, because that is what the wire form is for. Each
 * vector is also checked against the value type's zod schemas, so the
 * validators and the codecs cannot drift apart.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A9 (Parity Acceptance: Numeric wire, Dates, Presence and updates)
 * @see phases/13-sdk-value-and-execution-contracts.md §D3 (Numeric Wire Encoding and Unambiguous Decoding)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (Reference Hydration Contracts)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (Binary Transfer Handle Shapes)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (Positions on Precision, Signed Zero, Classification, and Dates)
 */

import { describe, expect, it } from 'vitest'
import { VALUE_ISSUE_CODES } from '../value-issues.js'
import {
  REJECTION_VECTORS,
  VALUE_VECTORS,
  VECTOR_DECODE_CONTEXT as context,
  sameValueMismatches,
} from './index.js'

const NATIVE_TERMS = /applescript|jxa|osascript/i

describe('value vectors', () => {
  const encodable = VALUE_VECTORS.filter((vector) => vector.direction !== 'decode')
  const decodable = VALUE_VECTORS.filter((vector) => vector.direction !== 'encode')

  it.each(encodable.map((vector) => [vector.name, vector] as const))(
    'encodes: %s',
    (_name, vector) => {
      const result = vector.type.encode(vector.sdk)
      if (!result.ok) throw new Error(`encode failed: ${JSON.stringify(result.issues)}`)

      expect(sameValueMismatches(result.value, vector.wire)).toEqual([])
      // The wire form is lossless through plain JSON.
      expect(sameValueMismatches(JSON.parse(JSON.stringify(result.value)), vector.wire)).toEqual([])
      // The SDK validator accepts what the encoder accepts.
      expect(vector.type.sdk.safeParse(vector.sdk).success).toBe(true)
    }
  )

  it.each(decodable.map((vector) => [vector.name, vector] as const))(
    'decodes: %s',
    (_name, vector) => {
      const result = vector.type.decode(vector.wire, context)
      if (!result.ok) throw new Error(`decode failed: ${JSON.stringify(result.issues)}`)

      expect(sameValueMismatches(result.value, vector.sdk)).toEqual([])
      if (vector.epochMilliseconds !== undefined) {
        const decoded = result.value
        if (!(decoded instanceof Date)) throw new Error('expected a Date')
        expect(decoded.getTime()).toBe(vector.epochMilliseconds)
      }
      // The wire validator accepts what the decoder accepts.
      expect(vector.type.wire.safeParse(vector.wire).success).toBe(true)
    }
  )

  it.each(
    VALUE_VECTORS.filter((vector) => vector.epochMilliseconds !== undefined).map(
      (vector) => [vector.name, vector] as const
    )
  )('agrees with its hand-computed epoch milliseconds: %s', (_name, vector) => {
    if (!(vector.sdk instanceof Date))
      throw new Error('a vector with epoch milliseconds holds a Date')
    expect(vector.sdk.getTime()).toBe(vector.epochMilliseconds)
  })

  it('cites the contract and names each vector uniquely', () => {
    const names = VALUE_VECTORS.map((vector) => vector.name)
    expect(new Set(names).size).toBe(names.length)
    for (const vector of VALUE_VECTORS) expect(vector.see).toMatch(/^phases\/13 §[A-D]\d+$/)
  })
})

describe('rejection vectors', () => {
  it.each(REJECTION_VECTORS.map((vector) => [vector.name, vector] as const))(
    'rejects: %s',
    (_name, vector) => {
      const result =
        vector.direction === 'encode'
          ? vector.type.encode(vector.input)
          : vector.type.decode(vector.input, context)
      if (result.ok) throw new Error(`expected a rejection, got ${JSON.stringify(result.value)}`)

      const codes = result.issues.map((entry) => entry.code ?? '(none)')
      expect([...codes].sort()).toEqual([...vector.expectedIssueCodes].sort())
      if (vector.expectedIssuePaths !== undefined) {
        // Paths name locations in the user's data, in both directions.
        const render = (path: readonly (string | number)[]): string => JSON.stringify(path)
        expect(result.issues.map((entry) => render(entry.path)).sort()).toEqual(
          vector.expectedIssuePaths.map(render).sort()
        )
      }
      for (const entry of result.issues) {
        expect(VALUE_ISSUE_CODES).toContain(entry.code)
        expect(entry.message.length).toBeGreaterThan(0)
        expect(entry.message).not.toMatch(NATIVE_TERMS)
      }
    }
  )

  it.each(REJECTION_VECTORS.map((vector) => [vector.name, vector] as const))(
    'the matching zod schema also rejects: %s',
    (_name, vector) => {
      const schema = vector.direction === 'encode' ? vector.type.sdk : vector.type.wire
      // Dynamic SDK values are typed `unknown`, so the SDK validator accepts any
      // value; only encoding decides what dynamic content can represent. Other
      // deliberate differences are marked on the vector.
      const expected =
        vector.schemaAccepts ??
        (vector.direction === 'encode' && vector.type.plan.kind === 'unknown')
      expect(schema.safeParse(vector.input).success).toBe(expected)
    }
  )

  it('cites the contract and names each vector uniquely', () => {
    const names = REJECTION_VECTORS.map((vector) => vector.name)
    expect(new Set(names).size).toBe(names.length)
    for (const vector of REJECTION_VECTORS) expect(vector.see).toMatch(/^phases\/13 §[A-D]\d+$/)
  })
})

describe('sameValueMismatches', () => {
  it.each([
    ['-0 versus 0', -0, 0],
    ['an own undefined versus absence', { a: undefined }, {}],
    ['absence versus an own undefined', {}, { a: undefined }],
    ['different date times', new Date(1), new Date(2)],
    ['an array versus a record', [], {}],
    ['different lengths', [1], [1, 2]],
  ])('reports %s', (_label, actual, expected) => {
    expect(sameValueMismatches(actual, expected)).not.toEqual([])
  })

  it.each([
    ['NaN', Number.NaN, Number.NaN],
    ['-0', -0, -0],
    ['equal dates', new Date(5), new Date(5)],
    ['nested equal values', { a: [{ b: null }] }, { a: [{ b: null }] }],
  ])('accepts %s', (_label, actual, expected) => {
    expect(sameValueMismatches(actual, expected)).toEqual([])
  })
})

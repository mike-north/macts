/**
 * Runtime tests for the `Integer` helpers.
 *
 * Expected values come from the integer contract: the domain is exactly the
 * safe integers, nothing is clamped or rounded implicitly, `-0` is a valid
 * integer that normalizes to `0`, and rounding is an explicit strategy (half
 * away from zero) the caller selects.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A2 (Integer helpers, Precision and range)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (Integer domain, Integer and signed zero)
 */

import { describe, expect, it } from 'vitest'
import { INTEGER_LIMITS, Integer } from './integer.js'

const MAX = Number.MAX_SAFE_INTEGER
const MIN = Number.MIN_SAFE_INTEGER

describe('Integer.is', () => {
  it.each([0, -0, 1, -1, 42, MAX, MIN])('accepts %s', (value) => {
    expect(Integer.is(value)).toBe(true)
  })

  it.each([
    ['a fraction', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['2^53', 2 ** 53],
    ['-(2^53)', -(2 ** 53)],
    ['a numeric string', '42'],
    ['a bigint', 42n],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(Integer.is(value)).toBe(false)
  })

  it('uses exactly the documented domain', () => {
    expect(INTEGER_LIMITS).toEqual({ min: -(2 ** 53 - 1), max: 2 ** 53 - 1 })
  })
})

describe('Integer.validate', () => {
  it.each([0, 1, -1, 42, MAX, MIN])('returns %s unchanged', (value) => {
    expect(Integer.validate(value)).toBe(value)
  })

  it('normalizes -0 to 0', () => {
    expect(Object.is(Integer.validate(-0), 0)).toBe(true)
  })

  it('rejects a fraction rather than rounding it, naming the explicit conversions', () => {
    expect(() => Integer.validate(2.5)).toThrow(RangeError)
    const message = errorMessage(() => Integer.validate(2.5))
    expect(message).toContain('2.5')
    expect(message).toMatch(/not integral|fractional/)
    expect(message).toContain('Integer.round')
    expect(message).toContain('Integer.truncate')
  })

  it.each([
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [Number.NEGATIVE_INFINITY, '-Infinity'],
  ])('rejects the non-finite value %s', (value, rendered) => {
    expect(() => Integer.validate(value)).toThrow(RangeError)
    const message = errorMessage(() => Integer.validate(value))
    expect(message).toContain(rendered)
    expect(message).toContain('not finite')
  })

  it.each([2 ** 53, -(2 ** 53), 1e21])(
    'rejects %s as outside the safe range, stating the bounds',
    (value) => {
      expect(() => Integer.validate(value)).toThrow(RangeError)
      const message = errorMessage(() => Integer.validate(value))
      expect(message).toContain('-9007199254740991')
      expect(message).toContain('9007199254740991')
      expect(message).toContain('outside')
    }
  )

  it('rejects a non-number that bypassed the static type', () => {
    expect(() => Integer.validate(bypass('42'))).toThrow(TypeError)
    expect(errorMessage(() => Integer.validate(bypass('42')))).toContain('"42"')
  })
})

describe('Integer.round', () => {
  it.each([
    [2.4, 2],
    [2.5, 3],
    [2.6, 3],
    [-2.4, -2],
    // Half away from zero: -2.5 rounds to -3 (Math.round would give -2).
    [-2.5, -3],
    [-2.6, -3],
    [0.5, 1],
    [-0.5, -1],
    [7, 7],
    [MAX, MAX],
    [MIN, MIN],
  ])('rounds %s to %s', (value, expected) => {
    expect(Integer.round(value)).toBe(expected)
  })

  it('never produces -0', () => {
    expect(Object.is(Integer.round(-0.4), 0)).toBe(true)
    expect(Object.is(Integer.round(-0), 0)).toBe(true)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2 ** 53, -(2 ** 53)])(
    'still rejects %s',
    (value) => {
      expect(() => Integer.round(value)).toThrow(RangeError)
      expect(errorMessage(() => Integer.round(value))).toContain('Integer.round')
    }
  )
})

describe('Integer.truncate', () => {
  it.each([
    [2.9, 2],
    [-2.9, -2],
    [2.5, 2],
    [-2.5, -2],
    [7, 7],
    [MAX, MAX],
    [MIN, MIN],
  ])('truncates %s to %s', (value, expected) => {
    expect(Integer.truncate(value)).toBe(expected)
  })

  it('never produces -0', () => {
    expect(Object.is(Integer.truncate(-0.9), 0)).toBe(true)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53 + 2])('still rejects %s', (value) => {
    expect(() => Integer.truncate(value)).toThrow(RangeError)
    expect(errorMessage(() => Integer.truncate(value))).toContain('Integer.truncate')
  })
})

/** Simulate a value that bypassed static types (for example through a cast). */
function bypass(value: unknown): number {
  return value as number
}

function errorMessage(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('expected the call to throw')
}

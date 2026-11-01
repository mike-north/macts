/**
 * Tests for the shared wire payload rules.
 *
 * Expected outcomes come from the wire format in the design record: integer
 * text is canonical and within the safe integers, a double payload is a
 * finite JSON number or one of the special states, and date text names a real
 * instant. The schema tests at the end check that the zod wire schemas report
 * these same rules rather than restating them.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — D3 (wire forms), D10 (integer domain, signed zero)
 */

import { describe, expect, it } from 'vitest'
import { INTEGER_LIMITS } from './integer.js'
import { checkDateText, checkDoublePayload, checkIntegerText } from './wire-checks.js'
import { WireDoubleSchema } from './wire-schemas.js'

describe('checkDoublePayload', () => {
  it.each([
    ['a finite number', 3, 3],
    ['a fraction', -0.5, -0.5],
    ['the largest finite double', Number.MAX_VALUE, Number.MAX_VALUE],
  ])('accepts %s', (_name, payload, expected) => {
    expect(checkDoublePayload(payload)).toEqual({ ok: true, value: expected })
  })

  it('maps each special state to its number, keeping signed zero', () => {
    const value = (payload: string): number => {
      const result = checkDoublePayload(payload)
      if (!result.ok) throw new Error(result.message)
      return result.value
    }
    expect(Number.isNaN(value('NaN'))).toBe(true)
    expect(value('Infinity')).toBe(Number.POSITIVE_INFINITY)
    expect(value('-Infinity')).toBe(Number.NEGATIVE_INFINITY)
    expect(Object.is(value('-0'), -0)).toBe(true)
  })

  it('rejects a non-finite number as out of range, pointing to the explicit states', () => {
    const result = checkDoublePayload(Number.POSITIVE_INFINITY)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('out-of-range')
    expect(result.message).toContain('"Infinity"')
  })

  it('rejects a NaN number as a malformed control record', () => {
    expect(checkDoublePayload(Number.NaN)).toMatchObject({
      ok: false,
      code: 'invalid-control-record',
    })
  })

  it.each([
    ['a state with the wrong case', 'nan'],
    ['numeric text', '3'],
    ['a boolean', true],
    ['null', null],
    ['an object', { value: 1 }],
  ])('rejects %s as a malformed control record', (_name, payload) => {
    expect(checkDoublePayload(payload)).toMatchObject({
      ok: false,
      code: 'invalid-control-record',
    })
  })
})

describe('checkIntegerText', () => {
  it('accepts canonical text at both ends of the integer domain', () => {
    expect(checkIntegerText('9007199254740991', INTEGER_LIMITS.min, INTEGER_LIMITS.max)).toEqual({
      ok: true,
      value: 9007199254740991,
    })
    expect(checkIntegerText('-9007199254740991', INTEGER_LIMITS.min, INTEGER_LIMITS.max)).toEqual({
      ok: true,
      value: -9007199254740991,
    })
  })

  it.each([
    ['negative zero', '-0'],
    ['leading zeros', '007'],
    ['a plus sign', '+1'],
    ['exponent notation', '1e3'],
    ['a fraction', '1.0'],
    ['empty text', ''],
  ])('rejects %s as not an integer', (_name, text) => {
    expect(checkIntegerText(text, INTEGER_LIMITS.min, INTEGER_LIMITS.max)).toMatchObject({
      ok: false,
      code: 'not-integer',
    })
  })

  it('rejects text one past either end of the domain as out of range', () => {
    for (const text of ['9007199254740992', '-9007199254740992']) {
      expect(checkIntegerText(text, INTEGER_LIMITS.min, INTEGER_LIMITS.max)).toMatchObject({
        ok: false,
        code: 'out-of-range',
      })
    }
  })

  it('applies narrower bounds, such as a 16-bit color channel', () => {
    expect(checkIntegerText('65535', 0, 65535)).toEqual({ ok: true, value: 65535 })
    expect(checkIntegerText('65536', 0, 65535)).toMatchObject({ ok: false, code: 'out-of-range' })
    expect(checkIntegerText('-1', 0, 65535)).toMatchObject({ ok: false, code: 'out-of-range' })
  })
})

describe('checkDateText', () => {
  it('honors the offset: 17:04:05.120+02:30 is 14:34:05.120Z', () => {
    // 2026-10-31T14:34:05.120Z: 20,757 days after the epoch (1970..2025 is
    // 56 years with 14 leap days = 20,454 days; Jan..Sep 2026 = 273 days;
    // plus 30) → 20,757 × 86,400,000 + 14h34m05.120s = 1,793,457,245,120.
    expect(checkDateText('2026-10-31T17:04:05.120+02:30')).toEqual({
      ok: true,
      value: 1_793_457_245_120,
    })
  })

  it.each([
    ['a day that does not exist', '2026-02-30T00:00:00.000Z'],
    ['a leap day in a common year', '2025-02-29T00:00:00.000Z'],
    ['hour 24', '2026-10-31T24:00:00.000Z'],
    ['offset hour 24', '2026-10-31T00:00:00.000+24:00'],
    ['offset minute 60', '2026-10-31T00:00:00.000+01:60'],
    ['two fractional digits', '2026-10-31T00:00:00.12Z'],
    ['no offset', '2026-10-31T00:00:00.000'],
  ])('rejects %s as an invalid date', (_name, text) => {
    expect(checkDateText(text)).toMatchObject({ ok: false, code: 'invalid-date' })
  })
})

describe('WireDoubleSchema applies the shared double rule', () => {
  const firstMessage = (payload: unknown): string | undefined =>
    WireDoubleSchema.safeParse({ double: payload }).error?.issues[0]?.message

  it.each([
    ['an unknown state', 'nan'],
    ['numeric text', '3'],
    ['a boolean', true],
  ])('reports the rule message for %s', (_name, payload) => {
    const rule = checkDoublePayload(payload)
    expect(rule.ok).toBe(false)
    if (rule.ok) return
    expect(firstMessage(payload)).toBe(rule.message)
  })

  it('reports the rule message for a non-finite number', () => {
    const rule = checkDoublePayload(Number.POSITIVE_INFINITY)
    if (rule.ok) throw new Error('expected rejection')
    expect(firstMessage(Number.POSITIVE_INFINITY)).toBe(rule.message)
  })
})

/**
 * Internal rules for wire control-record payloads: what makes integer text
 * canonical and in range, what a double payload may hold, and when date text
 * names a real instant. They are the single statement of those rules; every
 * validator of wire payloads applies them rather than restating them.
 *
 * Each check returns a result rather than throwing, carrying a stable issue
 * code and a user-facing message on failure. This module is not part of the
 * package's public surface.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { formatNumber, quote } from './issue-helpers.js'
import { INTEGER_LIMITS, Integer } from './integer.js'
import type { ValueIssueCode } from './value-issues.js'
import { SPECIAL_DOUBLE_STATES, type SpecialDoubleState } from './wire.js'

/** Outcome of checking one payload. */
export type Check<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ValueIssueCode; readonly message: string }

/** Canonical integer text: no sign on zero, no leading zeros, no `+`. */
export const INTEGER_TEXT_PATTERN = /^(0|-?[1-9][0-9]*)$/

/**
 * Wire date text: `YYYY-MM-DDTHH:mm:ss.sss` with exactly three fractional
 * digits, then `Z` or `±HH:MM`. Matching the pattern is necessary but not
 * sufficient; {@link checkDateText} also requires a real calendar instant.
 */
export const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/

/** Capturing form of {@link DATE_TEXT_PATTERN}, used to read the components. */
const DATE_TEXT_COMPONENTS =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?:Z|([+-])(\d{2}):(\d{2}))$/

/** Example of a valid wire date, used in messages. */
const DATE_TEXT_EXAMPLE = '2026-10-31T17:04:05.120Z'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * Milliseconds since the epoch of a UTC calendar time. Unlike `Date.UTC`,
 * years `0..99` are taken literally rather than as `1900..1999`.
 */
function utcEpoch(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
): number {
  const date = new Date(0)
  date.setUTCFullYear(year, monthIndex, day)
  date.setUTCHours(hour, minute, second, millisecond)
  return date.getTime()
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, monthIndex: number): number {
  if (monthIndex === 1) return isLeapYear(year) ? 29 : 28
  return [3, 5, 8, 10].includes(monthIndex) ? 30 : 31
}

/**
 * Check integer wire text and return its integer. `min` and `max` default to
 * the integer domain; narrower bounds apply to positions such as color
 * channels.
 */
export function checkIntegerText(
  text: string,
  min: number = INTEGER_LIMITS.min,
  max: number = INTEGER_LIMITS.max
): Check<Integer> {
  if (!INTEGER_TEXT_PATTERN.test(text)) {
    const reason =
      text === '-0'
        ? 'integers have no signed zero, so zero is always written "0"'
        : 'integers travel as canonical decimal text with no sign on zero, no leading zeros, ' +
          'and no "+" (for example "42" or "-7")'
    return {
      ok: false,
      code: 'not-integer',
      message: `${quote(text)} is not integer text: ${reason}.`,
    }
  }
  const value = Number(text)
  if (value < min || value > max) {
    return {
      ok: false,
      code: 'out-of-range',
      message: `${text} is outside the allowed range ${formatNumber(min)}..${formatNumber(max)}.`,
    }
  }
  // Canonical text within the safe range is exactly an integer, so this never throws.
  return { ok: true, value: Integer.validate(value) }
}

/** Check a double payload (a finite number or a special state) and return its number. */
export function checkDoublePayload(payload: unknown): Check<number> {
  if (typeof payload === 'number') {
    if (Number.isFinite(payload)) return { ok: true, value: payload }
    return {
      ok: false,
      code: Number.isNaN(payload) ? 'invalid-control-record' : 'out-of-range',
      message:
        `A double payload that is a number must be finite (received ${formatNumber(payload)}, ` +
        'which may come from a numeric literal too large for a double). Non-finite doubles use ' +
        'the explicit states "NaN", "Infinity", and "-Infinity".',
    }
  }
  if (typeof payload === 'string' && isSpecialDoubleState(payload)) {
    return { ok: true, value: SPECIAL_DOUBLE_VALUES[payload] }
  }
  return {
    ok: false,
    code: 'invalid-control-record',
    message:
      'A double payload must be a finite JSON number or one of ' +
      SPECIAL_DOUBLE_STATES.map((state) => JSON.stringify(state)).join(', ') +
      `; received ${typeof payload === 'string' ? quote(payload) : typeof payload}.`,
  }
}

const SPECIAL_DOUBLE_VALUES: Readonly<Record<SpecialDoubleState, number>> = Object.freeze({
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  '-Infinity': Number.NEGATIVE_INFINITY,
  '-0': -0,
})

function isSpecialDoubleState(text: string): text is SpecialDoubleState {
  return (SPECIAL_DOUBLE_STATES as readonly string[]).includes(text)
}

/**
 * Check wire date text and return the instant it names, in milliseconds since
 * the epoch, honoring its offset. Components are range-checked here rather
 * than trusting `Date` parsing, which accepts some impossible dates.
 */
export function checkDateText(text: string): Check<number> {
  const match = DATE_TEXT_COMPONENTS.exec(text)
  if (match === null) {
    return {
      ok: false,
      code: 'invalid-date',
      message:
        `${quote(text)} is not date text: expected YYYY-MM-DDTHH:mm:ss.sss with exactly three ` +
        `fractional digits, followed by Z or ±HH:MM (for example "${DATE_TEXT_EXAMPLE}").`,
    }
  }
  // Every group but the offset is mandatory in the pattern; an absent offset
  // group means `Z`, which is a zero offset.
  const component = (index: number): number => Number(match[index] ?? '0')
  const year = component(1)
  const month = component(2)
  const day = component(3)
  const hour = component(4)
  const minute = component(5)
  const second = component(6)
  const millisecond = component(7)
  const sign = match[8] === '-' ? -1 : 1
  const offsetHour = component(9)
  const offsetMinute = component(10)

  const problem = calendarProblem(year, month, day, hour, minute, second, offsetHour, offsetMinute)
  if (problem !== undefined) {
    return {
      ok: false,
      code: 'invalid-date',
      message: `${quote(text)} is not a real instant: ${problem}.`,
    }
  }
  const local = utcEpoch(year, month - 1, day, hour, minute, second, millisecond)
  return { ok: true, value: local - sign * (offsetHour * 60 + offsetMinute) * 60_000 }
}

function calendarProblem(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  offsetHour: number,
  offsetMinute: number
): string | undefined {
  if (month < 1 || month > 12) return `month ${String(month)} does not exist`
  const monthName = MONTH_NAMES[month - 1] ?? String(month)
  const lastDay = daysInMonth(year, month - 1)
  if (day < 1 || day > lastDay) {
    return `${monthName} ${String(year)} has no day ${String(day)} (it has ${String(lastDay)} days)`
  }
  if (hour > 23) return `hour ${String(hour)} does not exist (hours are 00..23)`
  if (minute > 59) return `minute ${String(minute)} does not exist (minutes are 00..59)`
  if (second > 59) return `second ${String(second)} does not exist (seconds are 00..59)`
  if (offsetHour > 23)
    return `offset hour ${String(offsetHour)} does not exist (offset hours are 00..23)`
  if (offsetMinute > 59) {
    return `offset minute ${String(offsetMinute)} does not exist (offset minutes are 00..59)`
  }
  return undefined
}

/**
 * The zod schema for an integer control record whose value must lie in
 * `min..max`. Structure and the canonical-text pattern are visible to JSON
 * Schema; the range is checked by a refinement.
 */
export function wireIntegerSchema(min: number, max: number) {
  return z.strictObject({
    integer: z
      .string({ error: 'An integer payload must be decimal text, for example "42".' })
      .regex(INTEGER_TEXT_PATTERN, {
        error: (iss) =>
          typeof iss.input === 'string' ? integerTextMessage(iss.input, min, max) : undefined,
      })
      .superRefine((text, ctx) => {
        if (!INTEGER_TEXT_PATTERN.test(text)) return
        const result = checkIntegerText(text, min, max)
        if (!result.ok) ctx.addIssue({ code: 'custom', message: result.message })
      }),
  })
}

function integerTextMessage(text: string, min: number, max: number): string {
  const result = checkIntegerText(text, min, max)
  return result.ok ? 'Invalid integer text.' : result.message
}

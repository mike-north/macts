/**
 * Internal codecs for leaf values: strings, booleans, integers, doubles,
 * dates, and enum members.
 *
 * Leaves are where classification is decided. An integer position accepts
 * only a genuine integer and emits decimal text; a double position accepts any
 * number and preserves the states plain JSON cannot carry; a date position
 * accepts only a valid `Date` and emits `Z` text. Payload rules come from
 * `wire-checks`, the same rules the zod wire schemas apply.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import type { IssuePath } from '../issues.js'
import { INVALID, controlPayload, mismatch, type Codec, type Issues } from './codec.js'
import { INTEGER_LIMITS, type Integer } from './integer.js'
import { describeReceived, formatNumber, formatPath, issue, quote } from './issue-helpers.js'
import {
  checkDateText,
  checkDateValue,
  checkDoublePayload,
  checkIntegerText,
  doublePayload,
} from './wire-checks.js'

/** Codec for strings, which stand for themselves on the wire. */
export const STRING_CODEC: Codec<string> = {
  encode: (value, path, issues) =>
    typeof value === 'string' ? value : mismatch(value, path, issues, 'a string'),
  decode: (wire, path, _context, issues) =>
    typeof wire === 'string' ? wire : mismatch(wire, path, issues, 'a string'),
}

/** Codec for booleans, which stand for themselves on the wire. */
export const BOOLEAN_CODEC: Codec<boolean> = {
  encode: (value, path, issues) =>
    typeof value === 'boolean' ? value : mismatch(value, path, issues, 'a boolean'),
  decode: (wire, path, _context, issues) =>
    typeof wire === 'boolean' ? wire : mismatch(wire, path, issues, 'a boolean'),
}

const INTEGER_EXAMPLE = 'an integer control record such as {"integer": "42"}'

/**
 * Codec for integers within `min..max`. With the default bounds this is the
 * SDK integer domain; narrower bounds serve positions such as color channels.
 */
export function integerCodec(
  min: number = INTEGER_LIMITS.min,
  max: number = INTEGER_LIMITS.max
): Codec<Integer> {
  return {
    encode(value, path, issues) {
      const integer = checkIntegerValue(value, path, issues, min, max)
      return integer === INVALID ? INVALID : { integer: String(integer) }
    },
    decode(wire, path, _context, issues) {
      const payload = controlPayload(wire, 'integer', path, issues, INTEGER_EXAMPLE)
      if (payload === INVALID) return INVALID
      if (typeof payload !== 'string') {
        issues.push(
          issue(
            path,
            'invalid-control-record',
            `An integer payload must be decimal text such as "42"; received ${describeReceived(payload)}.`
          )
        )
        return INVALID
      }
      const result = checkIntegerText(payload, min, max)
      if (result.ok) return result.value
      issues.push(issue(path, result.code, result.message))
      return INVALID
    },
  }
}

/**
 * Validate a runtime value at an integer position. This is where a plain
 * number that reached an `Integer` position through a cast is rejected.
 */
function checkIntegerValue(
  value: unknown,
  path: IssuePath,
  issues: Issues,
  min: number,
  max: number
): number | typeof INVALID {
  if (typeof value !== 'number') return mismatch(value, path, issues, 'an integer')
  if (!Number.isFinite(value)) {
    issues.push(
      issue(
        path,
        'not-integer',
        `Expected an integer; received ${formatNumber(value)}, which is not finite.`
      )
    )
    return INVALID
  }
  if (!Number.isInteger(value)) {
    issues.push(
      issue(
        path,
        'not-integer',
        `Expected an integer; received ${formatNumber(value)}, which has a fractional part. ` +
          'Integers are never rounded implicitly: convert explicitly with Integer.round or Integer.truncate.'
      )
    )
    return INVALID
  }
  if (value < min || value > max) {
    issues.push(
      issue(
        path,
        'out-of-range',
        `Expected an integer in ${formatNumber(min)}..${formatNumber(max)}; received ${formatNumber(value)}. ` +
          'Integers are never clamped.'
      )
    )
    return INVALID
  }
  // `-0` is a valid integer; the integer wire form has no signed zero.
  return value === 0 ? 0 : value
}

const DOUBLE_EXAMPLE = 'a double control record such as {"double": 1.5}'

/** Codec for doubles, preserving `NaN`, the infinities, and `-0`. */
export const DOUBLE_CODEC: Codec<number> = {
  encode: (value, path, issues) =>
    typeof value === 'number'
      ? { double: doublePayload(value) }
      : mismatch(value, path, issues, 'a number'),
  decode(wire, path, _context, issues) {
    const payload = controlPayload(wire, 'double', path, issues, DOUBLE_EXAMPLE)
    if (payload === INVALID) return INVALID
    const result = checkDoublePayload(payload)
    if (result.ok) return result.value
    issues.push(issue(path, result.code, result.message))
    return INVALID
  },
}

const DATE_EXAMPLE = 'a date control record such as {"date": "2026-10-31T17:04:05.120Z"}'

/** Codec for dates: SDK `Date` values and ISO 8601 wire text. */
export const DATE_CODEC: Codec<Date> = {
  encode(value, path, issues) {
    if (!(value instanceof Date)) return mismatch(value, path, issues, 'a Date')
    const result = checkDateValue(value)
    if (result.ok) return { date: result.value }
    issues.push(issue(path, result.code, result.message))
    return INVALID
  },
  decode(wire, path, _context, issues) {
    const payload = controlPayload(wire, 'date', path, issues, DATE_EXAMPLE)
    if (payload === INVALID) return INVALID
    if (typeof payload !== 'string') {
      issues.push(
        issue(
          path,
          'invalid-control-record',
          `A date payload must be ISO 8601 text; received ${describeReceived(payload)}.`
        )
      )
      return INVALID
    }
    const result = checkDateText(payload)
    if (result.ok) return new Date(result.value)
    issues.push(issue(path, result.code, result.message))
    return INVALID
  },
}

/**
 * Codec for a closed enum. Encoding rejects a non-member input. Decoding
 * rejects an unknown member too, because static types stay closed; its message
 * explains that the app may be newer than the SDK.
 */
export function enumCodec<Member extends string>(members: readonly Member[]): Codec<Member> {
  const known = members.map((member) => JSON.stringify(member)).join(', ')
  const isMember = (value: string): value is Member =>
    (members as readonly string[]).includes(value)
  return {
    encode(value, path, issues) {
      if (typeof value !== 'string') return mismatch(value, path, issues, `one of ${known}`)
      if (isMember(value)) return value
      issues.push(
        issue(path, 'unknown-enum-member', `Expected one of ${known}; received ${quote(value)}.`)
      )
      return INVALID
    },
    decode(wire, path, _context, issues) {
      if (typeof wire !== 'string') return mismatch(wire, path, issues, `one of ${known}`)
      if (isMember(wire)) return wire
      issues.push(
        issue(
          path,
          'unknown-enum-member',
          `Received ${quote(wire)} at ${formatPath(path)}, which is not a known member ` +
            `(known members: ${known}). The app may be newer than this SDK; upgrading the app ` +
            'package may add support for it.'
        )
      )
      return INVALID
    },
  }
}

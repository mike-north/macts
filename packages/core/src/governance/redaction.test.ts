/**
 * Runtime tests for the argument-redaction helper.
 *
 * Verifies that sensitive key names are always replaced with the redacted
 * placeholder, that non-sensitive values are preserved/summarised faithfully,
 * and that edge cases (empty object, nested values, case-insensitive matching)
 * are handled correctly.
 *
 * @see Issue #7 — Trust & Governance: audit records must never store raw secrets.
 */

import { describe, it, expect } from 'vitest'
import {
  redactArgs,
  isSensitiveKey,
  DEFAULT_SENSITIVE_KEYS,
  REDACTED_PLACEHOLDER,
  type RedactArgsOptions,
} from './redaction.js'

// ---------------------------------------------------------------------------
// isSensitiveKey
// ---------------------------------------------------------------------------

describe('isSensitiveKey', () => {
  it('matches every key in DEFAULT_SENSITIVE_KEYS exactly', () => {
    for (const key of DEFAULT_SENSITIVE_KEYS) {
      expect(isSensitiveKey(key), `expected ${key} to be sensitive`).toBe(true)
    }
  })

  it('matches case-insensitively (UPPERCASE, MixedCase)', () => {
    expect(isSensitiveKey('PASSWORD')).toBe(true)
    expect(isSensitiveKey('Token')).toBe(true)
    expect(isSensitiveKey('ApiKey')).toBe(true)
    expect(isSensitiveKey('API_KEY')).toBe(true)
    expect(isSensitiveKey('AUTHORIZATION')).toBe(true)
    expect(isSensitiveKey('SECRET')).toBe(true)
  })

  it('does not match safe keys', () => {
    expect(isSensitiveKey('calendar')).toBe(false)
    expect(isSensitiveKey('summary')).toBe(false)
    expect(isSensitiveKey('attendees')).toBe(false)
    expect(isSensitiveKey('app')).toBe(false)
  })

  it('matches extra sensitive keys supplied by the caller', () => {
    expect(isSensitiveKey('mySecret', ['mysecret'])).toBe(true)
    expect(isSensitiveKey('PINCODE', ['pincode'])).toBe(true)
  })

  it('does not match keys only in the extra list when the default list is tested', () => {
    // 'pincode' is NOT in the default list.
    expect(isSensitiveKey('pincode')).toBe(false)
    // But it IS matched when provided as extra.
    expect(isSensitiveKey('pincode', ['pincode'])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// redactArgs — empty / edge cases
// ---------------------------------------------------------------------------

describe('redactArgs — empty object', () => {
  it('returns "(no arguments)" for an empty args map', () => {
    expect(redactArgs({})).toBe('(no arguments)')
  })
})

// ---------------------------------------------------------------------------
// redactArgs — sensitive value replacement
// ---------------------------------------------------------------------------

describe('redactArgs — sensitive keys', () => {
  it('replaces a "password" value with the redacted placeholder', () => {
    const result = redactArgs({ password: 'hunter2' })
    expect(result).toBe(`password: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "token" value', () => {
    expect(redactArgs({ token: 'ghp_abc123' })).toBe(`token: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "secret" value', () => {
    expect(redactArgs({ secret: 'shhh' })).toBe(`secret: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "apiKey" (camelCase) value — matches on lowercased "apikey"', () => {
    expect(redactArgs({ apiKey: 'ak_live_xxx' })).toBe(`apiKey: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "api_key" (snake_case) value', () => {
    expect(redactArgs({ api_key: 'ak_live_xxx' })).toBe(`api_key: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "authorization" value', () => {
    expect(redactArgs({ authorization: 'Bearer tok' })).toBe(
      `authorization: ${REDACTED_PLACEHOLDER}`
    )
  })

  it('replaces "key" value', () => {
    expect(redactArgs({ key: 'k_live_xyz' })).toBe(`key: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces "credential" value', () => {
    expect(redactArgs({ credential: 'c_abc' })).toBe(`credential: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces sensitive keys regardless of case in the key name', () => {
    expect(redactArgs({ PASSWORD: 'hunter2' })).toBe(`PASSWORD: ${REDACTED_PLACEHOLDER}`)
    expect(redactArgs({ Token: 'tok' })).toBe(`Token: ${REDACTED_PLACEHOLDER}`)
  })

  it('replaces extra sensitive keys provided by the caller', () => {
    const opts: RedactArgsOptions = { extraSensitiveKeys: ['pincode'] }
    expect(redactArgs({ pincode: '1234' }, opts)).toBe(`pincode: ${REDACTED_PLACEHOLDER}`)
  })
})

// ---------------------------------------------------------------------------
// redactArgs — non-sensitive value summarisation
// ---------------------------------------------------------------------------

describe('redactArgs — non-sensitive values', () => {
  it('preserves short string values verbatim', () => {
    expect(redactArgs({ calendar: 'Work' })).toBe('calendar: Work')
  })

  it('preserves number values', () => {
    expect(redactArgs({ attendees: 3 })).toBe('attendees: 3')
  })

  it('preserves boolean values', () => {
    expect(redactArgs({ allDay: true })).toBe('allDay: true')
  })

  it('preserves null values', () => {
    expect(redactArgs({ endTime: null })).toBe('endTime: null')
  })

  it('represents arrays with an array-size hint', () => {
    expect(redactArgs({ items: [1, 2, 3] })).toBe('items: [array(3)]')
  })

  it('represents objects with a key-count hint', () => {
    expect(redactArgs({ meta: { a: 1, b: 2 } })).toBe('meta: [object(2 keys)]')
  })

  it('truncates long strings at 80 characters with an ellipsis', () => {
    const long = 'x'.repeat(100)
    const result = redactArgs({ body: long })
    // Key + ': ' + 80 chars + '…'
    expect(result).toBe(`body: ${'x'.repeat(80)}…`)
  })

  it('does not truncate strings of exactly 80 characters', () => {
    const exact = 'y'.repeat(80)
    expect(redactArgs({ body: exact })).toBe(`body: ${exact}`)
  })
})

// ---------------------------------------------------------------------------
// redactArgs — mixed sensitive and non-sensitive keys
// ---------------------------------------------------------------------------

describe('redactArgs — mixed keys', () => {
  it('redacts sensitive and preserves non-sensitive in a mixed object', () => {
    const result = redactArgs({
      calendar: 'Work',
      summary: 'Team Meeting',
      password: 'hunter2',
      attendees: 3,
    })
    expect(result).toBe(
      `calendar: Work; summary: Team Meeting; password: ${REDACTED_PLACEHOLDER}; attendees: 3`
    )
  })

  it('produces a semicolon-separated list in insertion order', () => {
    const result = redactArgs({ z: 'last', a: 'first' })
    expect(result).toBe('z: last; a: first')
  })
})

// ---------------------------------------------------------------------------
// redactArgs — nested sensitive keys (object values with sensitive keys are
// not recursively inspected — the object itself is summarised, not its internals)
// ---------------------------------------------------------------------------

describe('redactArgs — nested sensitive key names', () => {
  it('does NOT recursively redact inside nested objects (object is summarised, not expanded)', () => {
    // The key "config" is not sensitive; its value is an object with a
    // sensitive nested key "password". The redaction helper should NOT dig
    // into the nested object — it summarises the value as an object.
    const result = redactArgs({ config: { password: 'secret', timeout: 30 } })
    expect(result).toBe('config: [object(2 keys)]')
    // If recursion were implemented, we'd see "config: [object(2 keys)]" anyway
    // because object values are always summarised — so the nested password
    // is never exposed even without explicit recursion.
  })
})

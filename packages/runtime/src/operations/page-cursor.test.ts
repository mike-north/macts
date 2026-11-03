/**
 * Tests for the page cursor codec.
 *
 * Expected values are hand-written from the cursor's documented format: a
 * format version, a `.`, then base64url JSON holding the operation id, a
 * digest of the non-paging inputs, an empty filter-digest slot, the next
 * offset and the anchor. Every refusal is a `ValidationError` with one issue
 * at `["cursor"]` that repeats nothing from the cursor.
 *
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-5 (base64url)
 */

import { describe, expect, it } from 'vitest'
import { ValidationError } from '@macts/contracts'
import { decodePageCursor, encodePageCursor, type CursorBinding } from './page-cursor.js'

const BINDING: CursorBinding = { operation: 'library.books.list', inputs: { shelf: 'SF-1' } }

/** The JSON payload of a cursor, decoded by hand. */
function payloadOf(cursor: string): unknown {
  const [, encoded = ''] = cursor.split('.')
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
}

/** Decode `cursor` against `binding`, expecting a refusal, and return it. */
function refusal(cursor: string, binding: CursorBinding = BINDING): ValidationError {
  try {
    decodePageCursor(cursor, binding)
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    if (error instanceof ValidationError) return error
  }
  throw new Error('expected the cursor to be refused')
}

describe('encodePageCursor', () => {
  it('writes version 1 and a payload of exactly the documented fields', () => {
    const cursor = encodePageCursor(BINDING, { offset: 25, anchor: 'isbn-25' })

    expect(cursor.startsWith('1.')).toBe(true)
    expect(cursor.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/)
    const payload = payloadOf(cursor) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['an', 'at', 'fl', 'in', 'op'])
    expect(payload).toMatchObject({ op: 'library.books.list', fl: '', at: 25, an: 'isbn-25' })
    // 16 digest bytes, base64url without padding.
    expect(payload['in']).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('gives equal inputs the same digest whatever their key order', () => {
    const a = encodePageCursor(
      { operation: 'x.y.list', inputs: { a: '1', b: { c: '2', d: '3' } } },
      { offset: 1, anchor: 7 }
    )
    const b = encodePageCursor(
      { operation: 'x.y.list', inputs: { b: { d: '3', c: '2' }, a: '1' } },
      { offset: 1, anchor: 7 }
    )

    expect(a).toBe(b)
  })
})

describe('decodePageCursor', () => {
  it('round-trips the position for the binding it was issued for', () => {
    const cursor = encodePageCursor(BINDING, { offset: 50, anchor: 42 })

    expect(decodePageCursor(cursor, BINDING)).toEqual({ offset: 50, anchor: 42 })
  })

  it('refuses a cursor for other inputs', () => {
    const cursor = encodePageCursor(BINDING, { offset: 3, anchor: 'a' })

    const error = refusal(cursor, { operation: BINDING.operation, inputs: { shelf: 'SF-2' } })

    expect(error.details.issues).toEqual([
      {
        path: ['cursor'],
        message:
          'The cursor was issued for different inputs; send it with the same inputs as the call that returned it.',
      },
    ])
  })

  it('refuses a cursor whose filter slot is not empty', () => {
    const cursor = encodePageCursor(BINDING, { offset: 3, anchor: 'a' })
    const payload = { ...(payloadOf(cursor) as object), fl: 'something' }
    const forged = `1.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`

    expect(refusal(forged).details.issues[0]?.path).toEqual(['cursor'])
  })

  it.each([
    { label: 'an offset of zero', at: 0 },
    { label: 'a negative offset', at: -3 },
    { label: 'a fractional offset', at: 1.5 },
  ])('refuses a payload with $label as malformed', ({ at }) => {
    const payload = { op: BINDING.operation, in: 'x', fl: '', at, an: 'a' }
    const forged = `1.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`

    expect(refusal(forged).details.issues[0]?.message).toBe(
      'The cursor is not one this service issued.'
    )
  })

  it('never repeats the cursor or its anchor in the error', () => {
    const marker = 'anchor-marker-0b7e'
    const cursor = encodePageCursor(
      { operation: 'other.op.list', inputs: {} },
      {
        offset: 3,
        anchor: marker,
      }
    )

    const error = refusal(cursor)

    const text = JSON.stringify({ message: error.message, details: error.details })
    expect(text).not.toContain(marker)
    expect(text).not.toContain(cursor)
  })
})

/**
 * Tests for the passthrough value types of manifest-derived operations.
 *
 * Under `PASSTHROUGH_PLAN` (phases/13 D9) a value is plain JSON with no wire
 * encoding: codecs return the validated value unchanged, and only what JSON can
 * carry is accepted. The input additionally satisfies today's per-command
 * request contract.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8259 (JSON values)
 */

import { describe, expect, it } from 'vitest'
import type { Command } from '@macts/core'
import { PASSTHROUGH_PLAN, type DecodeContext } from '@macts/contracts'
import { PASSTHROUGH_OUTPUT_TYPE, passthroughInputType, toValidationIssues } from './passthrough.js'
import { buildCommandSchema } from './request-schema.js'

/** Passthrough decoding binds nothing, so a context that fails loudly if used is enough. */
const UNUSED_DECODE_CONTEXT: DecodeContext = {
  bindReference: () => {
    throw new Error('passthrough decoding never binds references')
  },
  bindFile: () => {
    throw new Error('passthrough decoding never binds files')
  },
}

const CREATE_EVENT: Command = {
  name: 'create',
  description: 'Create an event',
  scope: 'resource',
  resourceType: 'Event',
  parameters: [
    { name: 'summary', type: 'string', description: 'Title', required: true },
    { name: 'allDay', type: 'boolean', description: 'All day', required: false },
  ],
}

describe('passthroughInputType', () => {
  const input = passthroughInputType(buildCommandSchema(CREATE_EVENT))

  it('uses the passthrough plan', () => {
    expect(input.plan).toBe(PASSTHROUGH_PLAN)
  })

  it('accepts a request record and returns it unchanged, extra JSON keys included', () => {
    const record = { summary: 'Standup', allDay: false, extra: { nested: [1, 'two', null] } }
    expect(input.wire.safeParse(record)).toEqual({ success: true, data: record })
    expect(input.encode(record)).toEqual({ ok: true, value: record })
    expect(input.decode(record, UNUSED_DECODE_CONTEXT)).toEqual({ ok: true, value: record })
  })

  it('reports a missing required parameter at its name', () => {
    const result = input.encode({ allDay: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.path).toEqual(['summary'])
    expect(result.issues[0]?.code).toBe('invalid_type')
  })

  it('rejects values JSON cannot carry, even under extra keys', () => {
    expect(input.wire.safeParse({ summary: 'x', when: new Date(0) }).success).toBe(false)
    expect(input.wire.safeParse({ summary: 'x', count: Number.NaN }).success).toBe(false)
    expect(input.wire.safeParse({ summary: 'x', callback: () => undefined }).success).toBe(false)
  })

  it('rejects a non-record input', () => {
    expect(input.wire.safeParse(['Standup']).success).toBe(false)
    expect(input.wire.safeParse('Standup').success).toBe(false)
    expect(input.wire.safeParse(null).success).toBe(false)
  })
})

describe('PASSTHROUGH_OUTPUT_TYPE', () => {
  it('uses the passthrough plan', () => {
    expect(PASSTHROUGH_OUTPUT_TYPE.plan).toBe(PASSTHROUGH_PLAN)
  })

  it('accepts every JSON value unchanged', () => {
    for (const value of ['text', 42, true, null, [1, [2]], { a: { b: [null] } }]) {
      expect(PASSTHROUGH_OUTPUT_TYPE.decode(value, UNUSED_DECODE_CONTEXT)).toEqual({
        ok: true,
        value,
      })
    }
  })

  it('rejects non-JSON values', () => {
    expect(PASSTHROUGH_OUTPUT_TYPE.encode(new Date(0)).ok).toBe(false)
    expect(PASSTHROUGH_OUTPUT_TYPE.encode(Number.POSITIVE_INFINITY).ok).toBe(false)
    expect(PASSTHROUGH_OUTPUT_TYPE.encode(undefined).ok).toBe(false)
  })
})

describe('toValidationIssues', () => {
  it('keeps keys and indexes, renders symbol keys as text, and carries the code', () => {
    const marker = Symbol('marker')
    expect(
      toValidationIssues([
        { code: 'custom', path: ['items', 2, marker], message: 'Bad item', input: undefined },
      ])
    ).toEqual([{ path: ['items', 2, 'Symbol(marker)'], message: 'Bad item', code: 'custom' }])
  })
})

/**
 * Unit tests for bounded list pages: `t.page`, `t.pageInputs`, the page size
 * bounds, `isPageValueType`, and `referenceResultType`.
 *
 * Expected values are written by hand from the paging contract in
 * `page.ts`: a page is the strict record `{ items, nextCursor? }` whose
 * `nextCursor` is an optional string and never null; the paging inputs are an
 * optional integer `pageSize` from 1 to 100 (default 25) and an optional
 * string `cursor`; a page size outside the bounds is rejected at the field,
 * never clamped. A collection reference resolves to an array of the page's
 * items, never to a page.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (ValueType)
 * @see phases/13-sdk-value-and-execution-contracts.md §D3 (Numeric Wire Encoding)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (Reference Hydration Contracts, step 8)
 * @see phases/13-sdk-value-and-execution-contracts.md §D10 (bounded page size)
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { referenceResultType } from '../references/index.js'
import { PASSTHROUGH_PLAN } from './plan.js'
import { PAGE_SIZE_LIMITS, PAGING_INPUT_NAMES } from './page.js'
import type { DecodeContext, ValueType } from './value-type.js'
import { ValueTypes as t, isPageValueType } from './value-types.js'

const context: DecodeContext = {
  bindReference() {
    throw new Error('no reference binding in page tests')
  },
  bindFile() {
    throw new Error('no file binding in page tests')
  },
}

const ITEM = t.record({ id: t.string(), count: t.integer() })

describe('page bounds', () => {
  it('defaults to 25 items and allows at most 100', () => {
    expect(PAGE_SIZE_LIMITS).toEqual({ default: 25, maximum: 100 })
    expect(Object.isFrozen(PAGE_SIZE_LIMITS)).toBe(true)
  })

  it('reserves exactly pageSize and cursor', () => {
    expect(PAGING_INPUT_NAMES).toEqual(['pageSize', 'cursor'])
  })
})

describe('t.page', () => {
  const page = t.page(ITEM)

  it('has a record plan of required items and an optional string nextCursor', () => {
    expect(page.plan).toEqual({
      kind: 'record',
      fields: {
        items: { value: { kind: 'array', items: ITEM.plan }, presence: 'required' },
        nextCursor: { value: { kind: 'string' }, presence: 'optional' },
      },
    })
  })

  it('exposes its item type', () => {
    expect(page.item).toBe(ITEM)
  })

  it('round-trips a page with and without a cursor', () => {
    const wire = { items: [{ id: 'a', count: { integer: '2' } }], nextCursor: 'c' }
    const decoded = page.decode(wire, context)
    expect(decoded).toEqual({
      ok: true,
      value: { items: [{ id: 'a', count: 2 }], nextCursor: 'c' },
    })
    expect(page.decode({ items: [] }, context)).toEqual({ ok: true, value: { items: [] } })
  })

  it.each([
    { label: 'a null nextCursor', wire: { items: [], nextCursor: null } },
    { label: 'an unknown key', wire: { items: [], total: 3 } },
    { label: 'no items', wire: { nextCursor: 'c' } },
  ])('rejects $label on the wire', ({ wire }) => {
    expect(page.wire.safeParse(wire).success).toBe(false)
    expect(page.decode(wire, context).ok).toBe(false)
  })

  it('refuses a none item', () => {
    expect(() => t.page(t.none())).toThrow()
  })
})

describe('t.pageInputs', () => {
  const input = t.record({ listId: t.string(), ...t.pageInputs() })

  it('adds an optional integer pageSize and an optional string cursor', () => {
    expect(input.plan).toEqual({
      kind: 'record',
      fields: {
        listId: { value: { kind: 'string' }, presence: 'required' },
        pageSize: { value: { kind: 'integer' }, presence: 'optional' },
        cursor: { value: { kind: 'string' }, presence: 'optional' },
      },
    })
    expect(input.wire.safeParse({ listId: 'L' }).success).toBe(true)
  })

  it.each(['1', '25', '100'])('accepts a page size of %s', (size) => {
    expect(input.wire.safeParse({ listId: 'L', pageSize: { integer: size } }).success).toBe(true)
    expect(input.decode({ listId: 'L', pageSize: { integer: size } }, context)).toEqual({
      ok: true,
      value: { listId: 'L', pageSize: Number(size) },
    })
  })

  it.each([
    { label: 'zero', pageSize: { integer: '0' } },
    { label: 'negative', pageSize: { integer: '-5' } },
    { label: 'not an integer', pageSize: { integer: '2.5' } },
    { label: 'above the maximum', pageSize: { integer: '101' } },
    { label: 'a bare number', pageSize: 10 },
  ])('rejects a page size that is $label at ["pageSize"]', ({ pageSize }) => {
    const parsed = input.wire.safeParse({ listId: 'L', pageSize })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.map((issue) => issue.path)).toEqual([['pageSize']])
  })

  it('reports a page size out of range without repeating the value', () => {
    const parsed = input.wire.safeParse({ listId: 'L', pageSize: { integer: '987654' } })
    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([
      'The page size must be an integer from 1 to 100.',
    ])
  })

  describe('wire JSON Schema', () => {
    /** The JSON Schema of the pageSize field's integer text, as MCP and HTTP callers see it. */
    function pageSizeTextSchema(): { readonly type?: unknown; readonly pattern?: string } {
      const schema = z.toJSONSchema(input.wire, { target: 'draft-7' }) as {
        readonly properties: Record<
          string,
          { readonly properties?: Record<string, { type?: unknown; pattern?: string }> }
        >
      }
      const text = schema.properties['pageSize']?.properties?.['integer']
      if (text === undefined) throw new Error('expected the pageSize integer text schema')
      return text
    }

    it('states the page size as decimal text of a positive integer up to 100', () => {
      expect(pageSizeTextSchema()).toEqual({ type: 'string', pattern: '^(100|[1-9][0-9]?)$' })
    })

    it('admits through its pattern exactly the integers from 1 to the maximum', () => {
      const pattern = new RegExp(pageSizeTextSchema().pattern ?? '')
      for (let n = -150; n <= 1500; n += 1) {
        expect(pattern.test(String(n)), String(n)).toBe(n >= 1 && n <= PAGE_SIZE_LIMITS.maximum)
      }
    })

    it.each(['0', '-1', '-0', '007', '01', '+5', '2.5', '', '1000'])(
      'refuses %j through its pattern',
      (text) => {
        expect(new RegExp(pageSizeTextSchema().pattern ?? '').test(text)).toBe(false)
      }
    )
  })

  it('rejects a page size outside the bounds on the SDK side too, never clamping', () => {
    const sdk = t.pageInputs().pageSize.type.sdk
    expect(sdk.safeParse(0).success).toBe(false)
    expect(sdk.safeParse(101).success).toBe(false)
    expect(sdk.safeParse(100).success).toBe(true)
    expect(t.pageInputs().pageSize.type.encode(101).ok).toBe(false)
  })
})

describe('isPageValueType', () => {
  it('recognizes a page', () => {
    expect(isPageValueType(t.page(ITEM))).toBe(true)
  })

  it.each([
    { label: 'an array', type: t.array(ITEM) },
    { label: 'a record shaped like a page', type: t.record({ items: t.array(ITEM) }) },
    {
      label: 'a record with the page fields',
      type: t.record({ items: t.array(ITEM), nextCursor: t.optional(t.string()) }),
    },
    { label: 'a string', type: t.string() },
  ])('rejects $label', ({ type }) => {
    expect(isPageValueType(type)).toBe(false)
  })
})

describe('referenceResultType', () => {
  const passthrough: ValueType<unknown> = { ...t.unknown(), plan: PASSTHROUGH_PLAN }

  it('resolves a single reference to the get output itself', () => {
    expect(referenceResultType('one', ITEM)).toBe(ITEM)
  })

  it('resolves a collection reference to an array of the page items, not the page', () => {
    const result = referenceResultType('many', t.page(ITEM))
    expect(result.plan).toEqual({ kind: 'array', items: ITEM.plan })
    expect(result.wire.safeParse([{ id: 'a', count: { integer: '1' } }]).success).toBe(true)
    expect(result.wire.safeParse({ items: [] }).success).toBe(false)
  })

  it('passes a passthrough output through for either cardinality', () => {
    expect(referenceResultType('many', passthrough)).toBe(passthrough)
    expect(referenceResultType('one', passthrough)).toBe(passthrough)
  })

  it('refuses a collection whose list output is not a page', () => {
    expect(() => referenceResultType('many', t.array(ITEM))).toThrow(
      'A collection reference resolves as a list operation, whose output must be a page (t.page(…)).'
    )
  })
})

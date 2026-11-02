/**
 * Tests for issues that describe a result's contract violations without
 * repeating the result.
 *
 * Expected messages are hand-written from each schema's declared
 * expectations. Every case parses a value carrying a distinctive string, and
 * asserts that the string appears nowhere in the issues, as phases/13 D11
 * requires of an output mismatch: issues give paths, never values.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D11)
 * @see https://zod.dev/error-customization
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ValueTypes as t, type ValidationIssue } from '@macts/contracts'
import { toValueFreeIssues } from './value-free-issues.js'

const SECRET = 'secret-7f3a'

/** The value-free issues of parsing `value` with `schema`, which must fail. */
function issuesOf(schema: z.ZodType, value: unknown): ValidationIssue[] {
  const parsed = schema.safeParse(value)
  if (parsed.success) throw new Error('expected the parse to fail')
  const issues = toValueFreeIssues(parsed.error.issues, value)
  expect(JSON.stringify(issues)).not.toContain(SECRET)
  return issues
}

describe('toValueFreeIssues', () => {
  it.each([
    ['a wrong type', z.string(), 12, 'invalid_type', 'Expected a value of type string.'],
    [
      'an undeclared enum member',
      z.enum(['a', 'b']),
      SECRET,
      'invalid_value',
      'Expected one of "a" | "b".',
    ],
    ['a wrong literal', z.literal('a'), SECRET, 'invalid_value', 'Expected "a".'],
    [
      'text below a minimum length',
      z.string().min(40),
      SECRET,
      'too_small',
      'Expected a string of at least 40 characters.',
    ],
    [
      'a number not above an exclusive minimum',
      z.number().gt(0),
      -1,
      'too_small',
      'Expected a number more than 0.',
    ],
    [
      'text above a maximum length',
      z.string().max(2),
      SECRET,
      'too_big',
      'Expected a string of at most 2 characters.',
    ],
    [
      'an array of the wrong exact length',
      z.array(z.string()).length(3),
      [SECRET],
      'too_small',
      'Expected an array of exactly 3 items.',
    ],
    [
      'an array above a maximum of one item',
      z.array(z.string()).max(1),
      [SECRET, SECRET],
      'too_big',
      'Expected an array of at most 1 item.',
    ],
    [
      'a bigint below a minimum',
      z.bigint().min(0n),
      -1n,
      'too_small',
      'Expected a number at least 0.',
    ],
    [
      'a date before a minimum',
      z.date().min(new Date('2026-01-01T00:00:00.000Z')),
      new Date('2025-01-01T00:00:00.000Z'),
      'too_small',
      'Expected a date at least 2026-01-01T00:00:00.000Z.',
    ],
    ['a named format', z.email(), SECRET, 'invalid_format', 'Expected text in the email format.'],
    [
      'a pattern',
      z.string().regex(/^x/),
      SECRET,
      'invalid_format',
      'Expected text in the form its contract declares.',
    ],
    ['a non-multiple', z.number().multipleOf(5), 7, 'not_multiple_of', 'Expected a multiple of 5.'],
    [
      'a union no branch matches',
      z.union([z.string(), z.number()]),
      { value: SECRET },
      'invalid_union',
      'The value matches none of the shapes its contract allows.',
    ],
  ] as const)('describes %s from the schema alone', (_, schema, value, code, message) => {
    expect(issuesOf(schema, value)).toEqual([{ path: [], message, code }])
  })

  it('counts undeclared keys without naming them', () => {
    const schema = z.strictObject({ a: z.string() })

    expect(issuesOf(schema, { a: 'x', [SECRET]: 1 })).toEqual([
      {
        path: [],
        message: 'The record has 1 key its contract does not declare.',
        code: 'unrecognized_keys',
      },
    ])
    expect(issuesOf(schema, { a: 'x', [`${SECRET}-1`]: 1, [`${SECRET}-2`]: 2 })[0]?.message).toBe(
      'The record has 2 keys its contract does not declare.'
    )
  })

  it('replaces a custom check message that quotes the value', () => {
    const schema = z
      .string()
      .refine(() => false, { error: (issue) => `${String(issue.input)} is bad` })

    expect(issuesOf(schema, SECRET)).toEqual([
      { path: [], message: 'The value fails a check its contract declares.', code: 'custom' },
    ])
  })

  it('replaces a customized type message that quotes the value', () => {
    const schema = z.number({ error: (issue) => `got ${String(issue.input)}` })

    expect(issuesOf(schema, SECRET)).toEqual([
      { path: [], message: 'Expected a value of type number.', code: 'invalid_type' },
    ])
  })

  it('describes an invalid record key at the record, without naming the key', () => {
    const schema = z.object({ tags: z.record(z.string().max(2), z.number()) })

    expect(issuesOf(schema, { tags: { [SECRET]: 1 } })).toEqual([
      {
        path: ['tags'],
        message: 'A key of this record does not match its contract.',
        code: 'invalid_key',
      },
    ])
  })

  it('describes a map element whose key is not a property key, without the element', () => {
    const schema = z.map(z.object({}), z.number())

    expect(issuesOf(schema, new Map([[{}, SECRET]]))).toEqual([
      {
        path: [],
        message: 'An element of this map does not match its contract.',
        code: 'invalid_element',
      },
    ])
  })

  it('reports a dynamic value every branch rejects at the dynamic position', () => {
    // A bare number aborts every branch of the dynamic union, so zod reports
    // the union as a whole.
    const schema = t.record({ extra: t.unknown() }).wire

    expect(issuesOf(schema, { extra: { record: { [SECRET]: 5 } } })).toEqual([
      {
        path: ['extra'],
        message: 'The value matches none of the shapes its contract allows.',
        code: 'invalid_union',
      },
    ])
  })

  it('cuts a path at the dynamic record envelope, never naming a user key (integer text)', () => {
    // Regression: zod reports the one failing branch of the dynamic union with
    // its full path, ["extra", "record", <user key>, "integer"], so the user's
    // key reached the issue.
    const schema = t.record({ extra: t.unknown() }).wire

    expect(issuesOf(schema, { extra: { record: { [SECRET]: { integer: 'abc' } } } })).toEqual([
      {
        path: ['extra', 'record'],
        message: 'A value in this dynamic content does not match its contract.',
        code: 'invalid_format',
      },
    ])
  })

  it('cuts a path at a dynamic record envelope inside an array, never naming a user key (date text)', () => {
    // Regression: the full path was ["extra", 0, "record", <user key>, "date"].
    const schema = t.record({ extra: t.unknown() }).wire

    expect(issuesOf(schema, { extra: [{ record: { [SECRET]: { date: 'notadate' } } }] })).toEqual([
      {
        path: ['extra', 0, 'record'],
        message: 'A value in this dynamic content does not match its contract.',
        code: 'invalid_format',
      },
    ])
  })

  it('cuts at the outermost envelope and reports issues the cut makes identical once', () => {
    // Two failures under different user keys, one in a nested user record,
    // both cut to the same envelope.
    const schema = t.record({ extra: t.unknown() }).wire
    const value = {
      extra: {
        record: {
          [`${SECRET}-outer`]: { record: { [`${SECRET}-inner`]: { integer: 'abc' } } },
          [`${SECRET}-other`]: { integer: 'x' },
        },
      },
    }

    expect(issuesOf(schema, value)).toEqual([
      {
        path: ['extra', 'record'],
        message: 'A value in this dynamic content does not match its contract.',
        code: 'invalid_format',
      },
    ])
  })

  it('keeps a path that ends at a dynamic record envelope', () => {
    // Nothing follows `record`, so no user key is in the path and the issue
    // keeps its own message.
    const issues = toValueFreeIssues(
      [{ code: 'invalid_type', expected: 'object', path: ['extra', 'record'], message: SECRET }],
      { extra: { record: {} } }
    )

    expect(issues).toEqual([
      {
        path: ['extra', 'record'],
        message: 'Expected a value of type object.',
        code: 'invalid_type',
      },
    ])
  })

  it('keeps paths into records and arrays, rendering symbol keys as text', () => {
    const schema = z.object({ items: z.array(z.object({ n: z.number() })) })

    expect(issuesOf(schema, { items: [{ n: 1 }, { n: SECRET }] })).toEqual([
      {
        path: ['items', 1, 'n'],
        message: 'Expected a value of type number.',
        code: 'invalid_type',
      },
    ])
    expect(
      toValueFreeIssues(
        [{ code: 'custom', path: [Symbol('s')], message: SECRET, input: SECRET }],
        SECRET
      )
    ).toEqual([
      {
        path: ['Symbol(s)'],
        message: 'The value fails a check its contract declares.',
        code: 'custom',
      },
    ])
  })
})

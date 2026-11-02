/**
 * Validation issues that describe what a value violated without repeating the
 * value.
 *
 * An operation's result may hold user content (a note's body, a contact's
 * address), and an issue about it travels to remote callers inside
 * `UnexpectedValueError`. zod's own issue messages are not safe to forward:
 * an unrecognized-key message names the received keys, and the value
 * library's custom checks quote the offending text ("… is not integer text").
 * The issues built here therefore never read `message`, `input`, or any other
 * received data. Each message is composed only from the issue's code and the
 * schema's own expectations (an expected type, the allowed enum members, a
 * bound), which the contract declares and which are never user content.
 *
 * Paths are kept: they name where in the result the violation sits, which is
 * what makes the issue actionable. For every value type the value library
 * builds, a path holds only declared field names and array indexes: its one
 * record keyed by data (a user record in dynamic content) sits inside a union,
 * whose failure is reported at the dynamic position as a whole. An invalid
 * key's own path ends at the key, which is received data, so that segment is
 * dropped and the issue points at the record. A hand-written wire schema with
 * a data-keyed record would still put the received keys of its valid entries
 * in the paths of their values' issues.
 *
 * Input validation does not use this module. An input issue describes the
 * caller's own value back to that caller, so zod's messages are kept there.
 *
 * @packageDocumentation
 */

import type { z } from 'zod'
import type { ValidationIssue } from '@macts/contracts'

/**
 * String formats that are a pattern rather than a named format, so naming the
 * format would not help a reader.
 */
const PATTERN_FORMATS: ReadonlySet<string> = new Set([
  'regex',
  'starts_with',
  'ends_with',
  'includes',
])

/** Render a schema-declared literal (an enum member or literal) as text. */
function formatExpectedLiteral(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

/** Render a schema-declared numeric bound as text. */
function formatBound(bound: number | bigint): string {
  return String(bound)
}

/**
 * The message for one issue, built from its code and the schema's
 * expectations only.
 */
function valueFreeMessage(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `Expected a value of type ${issue.expected}.`
    case 'invalid_value':
      return issue.values.length === 1
        ? `Expected ${formatExpectedLiteral(issue.values[0])}.`
        : `Expected one of ${issue.values.map(formatExpectedLiteral).join(' | ')}.`
    case 'too_small': {
      const relation =
        issue.exact === true ? 'exactly' : issue.inclusive === false ? 'more than' : 'at least'
      return `Expected a ${issue.origin} of ${relation} ${formatBound(issue.minimum)}.`
    }
    case 'too_big': {
      const relation =
        issue.exact === true ? 'exactly' : issue.inclusive === false ? 'less than' : 'at most'
      return `Expected a ${issue.origin} of ${relation} ${formatBound(issue.maximum)}.`
    }
    case 'invalid_format':
      return PATTERN_FORMATS.has(issue.format)
        ? 'Expected text in the form its contract declares.'
        : `Expected text in the ${issue.format} format.`
    case 'not_multiple_of':
      return `Expected a multiple of ${String(issue.divisor)}.`
    case 'unrecognized_keys':
      // The key names come from the received value, so only their count is
      // reported.
      return issue.keys.length === 1
        ? 'The record has 1 key its contract does not declare.'
        : `The record has ${String(issue.keys.length)} keys its contract does not declare.`
    case 'invalid_key':
      return `A key of this ${issue.origin} does not match its contract.`
    case 'invalid_element':
      return `An element of this ${issue.origin} does not match its contract.`
    case 'invalid_union':
      return 'The value matches none of the shapes its contract allows.'
    case 'custom':
      // A custom check's message is free text and may quote the value.
      return 'The value fails a check its contract declares.'
  }
}

/**
 * Translate zod issues into canonical issues that carry no received data.
 *
 * @remarks
 * Each issue keeps its path (symbol keys rendered as text, as in
 * `toValidationIssues`, and an invalid key's own segment dropped) and its zod
 * code. Its message is rebuilt from the code
 * and the schema's expectations, never taken from zod.
 *
 * @param issues - The issues from a failed zod parse.
 * @returns One canonical issue per zod issue, in the same order.
 */
export function toValueFreeIssues(issues: readonly z.core.$ZodIssue[]): ValidationIssue[] {
  return issues.map((issue) => {
    // An invalid key's path ends with that key, which is received data.
    const path = issue.code === 'invalid_key' ? issue.path.slice(0, -1) : issue.path
    return {
      path: path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
      message: valueFreeMessage(issue),
      code: issue.code,
    }
  })
}

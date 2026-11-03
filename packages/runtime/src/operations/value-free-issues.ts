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
 * what makes the issue actionable. A path is a sequence of keys of the
 * result, though, and some keys are data. Two kinds are removed:
 *
 * - An invalid key's own path ends at the key, so that segment is dropped and
 *   the issue points at the record.
 * - Dynamic content (an `unknown` position, D3) carries user records in a
 *   `{"record": {…}}` envelope whose keys are the user's. zod does not always
 *   report a failure inside it at the dynamic position: when only one branch
 *   of the dynamic union fails, and only on a check such as integer or date
 *   text, zod reports that branch's issues with their full paths. So every
 *   path is walked through the result, and at the first such envelope it is
 *   cut after `record`; the issue then says only that a value in that
 *   dynamic content does not match, and issues the cut makes identical are
 *   reported once. A declared one-field record whose field is named
 *   `record` and holds a record is cut the same way, losing precision but
 *   nothing else.
 *
 * What is guaranteed, then: for every value type the value library builds,
 * an issue's path holds declared field names, array indexes, and the
 * `record` key of a dynamic envelope, and no other key of the result. A
 * hand-written wire schema with its own data-keyed record or map (`z.record`,
 * `z.map`) would still put the received keys of its valid entries in the
 * paths of their values' issues; no generated contract has one.
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

/** What a size bound counts, for the origins whose bound is a size. */
const SIZE_UNITS: Readonly<Record<string, readonly [singular: string, plural: string]>> = {
  string: ['character', 'characters'],
  array: ['item', 'items'],
  set: ['item', 'items'],
  file: ['byte', 'bytes'],
}

/** Origins whose bound is a numeric value. */
const NUMERIC_ORIGINS: ReadonlySet<string> = new Set(['number', 'int', 'bigint'])

/** `a` or `an` before `word`. */
function article(word: string): string {
  return /^[aeiou]/.test(word) ? 'an' : 'a'
}

/**
 * The message for a schema-declared bound: a size (`Expected a string of at
 * least 3 characters.`), a number (`Expected a number at least 0.`), or a
 * date (`Expected a date at least 2026-01-01T00:00:00.000Z.`).
 */
function boundMessage(origin: string, relation: string, bound: number | bigint): string {
  const units = SIZE_UNITS[origin]
  if (units !== undefined) {
    const unit = bound === 1 || bound === 1n ? units[0] : units[1]
    return `Expected ${article(origin)} ${origin} of ${relation} ${String(bound)} ${unit}.`
  }
  if (NUMERIC_ORIGINS.has(origin)) {
    return `Expected a number ${relation} ${String(bound)}.`
  }
  if (origin === 'date') {
    return `Expected a date ${relation} ${new Date(Number(bound)).toISOString()}.`
  }
  return `Expected a value ${relation} ${String(bound)}.`
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
      return boundMessage(issue.origin, relation, issue.minimum)
    }
    case 'too_big': {
      const relation =
        issue.exact === true ? 'exactly' : issue.inclusive === false ? 'less than' : 'at most'
      return boundMessage(issue.origin, relation, issue.maximum)
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

/** The message of an issue whose path was cut at a dynamic record envelope. */
const DYNAMIC_CONTENT_MESSAGE = 'A value in this dynamic content does not match its contract.'

/** Whether `value` is a plain record (not `null`, not an array). */
function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether `node` is a dynamic user-record envelope, `{"record": {…}}`. */
function isDynamicRecordEnvelope(node: unknown): boolean {
  if (!isPlainRecord(node)) return false
  const keys = Object.keys(node)
  return keys.length === 1 && keys[0] === 'record' && isPlainRecord(node['record'])
}

/**
 * The length of `path` kept when it is cut at the first dynamic record
 * envelope it passes through in `value`: through the envelope's `record` key,
 * when anything follows it. `undefined` when the path passes through no
 * envelope, or ends at one.
 */
function dynamicCut(path: readonly PropertyKey[], value: unknown): number | undefined {
  let node = value
  for (let index = 0; index < path.length; index++) {
    const segment = path[index]
    if (segment === 'record' && isDynamicRecordEnvelope(node)) {
      return index + 1 < path.length ? index + 1 : undefined
    }
    if (Array.isArray(node) && typeof segment === 'number') {
      node = node[segment]
    } else if (isPlainRecord(node) && typeof segment === 'string' && Object.hasOwn(node, segment)) {
      node = node[segment]
    } else {
      return undefined
    }
  }
  return undefined
}

/** Render a path's segments, symbol keys as text, so an issue is serializable. */
function renderPath(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment))
}

/**
 * Translate zod issues about `value` into canonical issues that carry no
 * received data.
 *
 * @remarks
 * Each issue keeps its zod code and its path, with symbol keys rendered as
 * text (as in `toValidationIssues`), an invalid key's own segment dropped, and
 * the path cut after the `record` key of the first dynamic record envelope it
 * passes through in `value`. Its message is rebuilt from the code and the
 * schema's expectations, never taken from zod; a cut issue says only that a
 * value in that dynamic content does not match. Issues the cut makes
 * identical (same path, same code) are reported once.
 *
 * @param issues - The issues from a failed zod parse.
 * @param value - The value that was parsed, which the paths address.
 * @returns The canonical issues, in the order of the zod issues.
 */
export function toValueFreeIssues(
  issues: readonly z.core.$ZodIssue[],
  value: unknown
): ValidationIssue[] {
  const result: ValidationIssue[] = []
  const seen = new Set<string>()
  for (const issue of issues) {
    // An invalid key's path ends with that key, which is received data.
    const keyless = issue.code === 'invalid_key' ? issue.path.slice(0, -1) : issue.path
    const cut = dynamicCut(keyless, value)
    if (cut === undefined) {
      result.push({ path: renderPath(keyless), message: valueFreeMessage(issue), code: issue.code })
      continue
    }
    const path = renderPath(keyless.slice(0, cut))
    const identity = JSON.stringify([path, issue.code])
    if (seen.has(identity)) continue
    seen.add(identity)
    result.push({ path, message: DYNAMIC_CONTENT_MESSAGE, code: issue.code })
  }
  return result
}

/**
 * Stable categories for violations of the value contracts.
 *
 * A {@link ValidationIssue} that reports a value-contract violation carries
 * one of these codes, so callers and agents can branch on the kind of problem
 * without parsing messages. The spellings are part of the public contract: a code is
 * never renamed or reused for a different meaning.
 *
 * @packageDocumentation
 */

import type { ValidationIssue } from '../issues.js'

/**
 * Every value-contract issue code.
 *
 * @remarks
 * - `invalid-type`: the value has the wrong JavaScript or JSON type for its
 *   position (for example a string where a number is expected), including a
 *   reference to a different resource or of a different cardinality than its
 *   position declares.
 * - `not-integer`: a number or decimal text is not an integer, or is not in
 *   canonical integer form.
 * - `out-of-range`: a value is of the right type but outside its domain (the
 *   safe integers, a color channel's range, the supported years of a date, a
 *   negative selector position, a range whose start exceeds its end, or empty
 *   text where text must be non-empty, such as a file path or grant).
 * - `invalid-date`: a date is invalid, or date text is malformed or names a
 *   calendar instant that does not exist.
 * - `unknown-enum-member`: a string is not a member of a closed enum,
 *   including a closed discriminant such as a reference form, a selection
 *   form, or a file source kind.
 * - `missing-field`: a required record field is absent.
 * - `unknown-field`: a record has a field its contract does not declare.
 * - `not-nullable`: `null` appears where the contract does not allow it.
 * - `invalid-control-record`: a wire object is not the control record its
 *   position requires (wrong or extra keys, or a malformed payload).
 * - `unsupported`: the value cannot be represented at its position (for
 *   example a function in dynamic content, `undefined` outside a record
 *   field, or a kind that its position does not admit, such as a reference to
 *   a resource the app does not have, a file value supplied as input, or an
 *   upload handle decoded outside the service).
 */
export const VALUE_ISSUE_CODES = Object.freeze([
  'invalid-type',
  'not-integer',
  'out-of-range',
  'invalid-date',
  'unknown-enum-member',
  'missing-field',
  'unknown-field',
  'not-nullable',
  'invalid-control-record',
  'unsupported',
] as const)

/** One of {@link VALUE_ISSUE_CODES}. */
export type ValueIssueCode = (typeof VALUE_ISSUE_CODES)[number]

/**
 * A {@link ValidationIssue} produced by a value codec, whose `code` is always
 * present and always one of {@link VALUE_ISSUE_CODES}.
 */
export interface ValueIssue extends ValidationIssue {
  /** The category of the problem. */
  readonly code: ValueIssueCode
}

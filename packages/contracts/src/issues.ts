/**
 * Structured descriptions of why a value failed its contract.
 *
 * Issues are produced by value codecs and carried by validation-related errors
 * so that a caller can locate each problem inside a nested value. They are
 * plain data, safe to serialize, and never contain credentials or bytes.
 *
 * @packageDocumentation
 */

/**
 * Location of a value inside a nested structure: record keys as strings and
 * array positions as zero-based numbers, outermost first. An empty path means
 * the value itself.
 */
export type IssuePath = readonly (string | number)[]

/**
 * One reason a value does not satisfy its contract.
 */
export interface ValidationIssue {
  /** Where the offending value sits, relative to the validated value. */
  readonly path: IssuePath
  /** Human-readable explanation suitable for showing to a caller or agent. */
  readonly message: string
  /**
   * Stable machine-readable category of the problem (for example
   * `'not-integer'`), when the producer assigns one.
   */
  readonly code?: string
}

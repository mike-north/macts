/**
 * Internal helpers for wording value-contract messages.
 *
 * Messages are user-facing: they describe what was received and what the
 * contract expects in terms of SDK and wire values only, never in terms of the
 * native automation layer. This module is not part of the package's public
 * surface.
 *
 * @packageDocumentation
 */

/** Longest string excerpt quoted verbatim in a message. */
const MAX_QUOTED_STRING_LENGTH = 60

/** Render a number for a message, keeping the states `String` erases. */
export function formatNumber(value: number): string {
  return Object.is(value, -0) ? '-0' : String(value)
}

/** Quote a string for a message, truncating long values. */
export function quote(value: string): string {
  const excerpt =
    value.length > MAX_QUOTED_STRING_LENGTH ? `${value.slice(0, MAX_QUOTED_STRING_LENGTH)}…` : value
  return JSON.stringify(excerpt)
}

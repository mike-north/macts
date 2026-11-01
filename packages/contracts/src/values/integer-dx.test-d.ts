/**
 * Agent DX acceptance for integers, at the type level.
 *
 * The realistic failure is writing a plain `number` where an `Integer` is
 * required. That must not compile, and the documented recovery
 * (`Integer.validate`, or an explicitly chosen `Integer.round` /
 * `Integer.truncate`) must compile without a cast.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A2 (Agent DX acceptance)
 * @see phases/13-sdk-value-and-execution-contracts.md §A9 (Integer DX)
 */

import { expectNotAssignable } from 'tsd'
import { Integer } from '../index.js'

/** A typical generated write: the parameter requires the brand. */
declare function setCount(count: Integer): void

/** A typical caller value: computed, so statically just `number`. */
declare const n: number

// The mistake: a plain number is not an Integer.
expectNotAssignable<Parameters<typeof setCount>[0]>(n)
expectNotAssignable<Parameters<typeof setCount>[0]>(n * 2)

// The documented fixes type-check (each statement must compile, without a cast).
setCount(Integer.validate(n))
setCount(Integer.round(n / 3))
setCount(Integer.truncate(n / 3))

// A value narrowed by `Integer.is` is also accepted.
declare const raw: unknown
if (Integer.is(raw)) {
  setCount(raw)
}

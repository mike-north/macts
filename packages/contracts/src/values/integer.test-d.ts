/**
 * Type tests for the integer brand.
 *
 * Expectations come from the integer contract: writes require the brand,
 * branded values behave as numbers, and nothing but a validating helper (or an
 * explicit, localized assertion) produces one. Only constructs that are valid
 * TypeScript are used, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import { INTEGER_LIMITS, type Integer } from '../index.js'

declare const integer: Integer

// Positive: a branded integer is usable anywhere a number is.
expectAssignable<number>(integer)
expectType<number>(integer + 1)
expectType<boolean>(integer > 0)

// Negative: plain numbers, literals, and integral-looking values do not carry
// the brand, so they cannot be written where an integer is required.
expectNotAssignable<Integer>(42)
expectNotAssignable<Integer>(0)
expectNotAssignable<Integer>(3.5)
expectNotAssignable<Integer>(Number.MAX_SAFE_INTEGER)
expectNotAssignable<Integer>(integer + 1)

// Negative: a string of digits is not an integer.
expectNotAssignable<Integer>('42')

// Edge: optionality and unions keep the brand requirement.
expectNotAssignable<Integer | undefined>(7)
expectAssignable<Integer | undefined>(integer)

// Edge: arrays of plain numbers are not arrays of integers.
expectNotAssignable<readonly Integer[]>([1, 2, 3])

// The domain bounds are plain numbers.
expectType<number>(INTEGER_LIMITS.min)
expectType<number>(INTEGER_LIMITS.max)

/**
 * Type tests for `Rgb`.
 *
 * Channels are branded integers, so a color cannot be built from plain
 * numbers without going through the integer helpers. Basic RGB has no alpha.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { Integer, Rgb } from '../index.js'

declare const channel: Integer

// Positive: branded channels form a color, and each channel reads as Integer.
expectAssignable<Rgb>({ r: channel, g: channel, b: channel })
declare const color: Rgb
expectType<Integer>(color.r)
expectAssignable<number>(color.g)

// Negative: plain numbers are not channels, even when in range.
expectNotAssignable<Rgb>({ r: 65535, g: 0, b: 0 })
expectNotAssignable<Rgb>({ r: channel, g: channel, b: 0 })

// Negative: `{ red, green, blue }` is not the SDK shape, and there is no alpha.
expectNotAssignable<Rgb>({ red: channel, green: channel, blue: channel })
expectNotAssignable<Rgb>({ r: channel, g: channel, b: channel, a: channel })

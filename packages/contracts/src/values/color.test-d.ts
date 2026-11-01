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
import { Rgb, type Integer, type Rgb8Bit } from '../index.js'

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

// The helpers share the type's name: constructors return `Rgb`, and the lossy
// 8-bit conversion returns plain numbers rather than branded channels.
expectType<Rgb>(Rgb.create(0, 0, 0))
expectType<Rgb>(Rgb.from8Bit(255, 128, 0))
expectType<Rgb>(Rgb.fromHex('#ff8000'))
expectType<Rgb8Bit>(Rgb.to8Bit(color))
expectType<number>(Rgb.to8Bit(color).r)
expectType<string>(Rgb.toHex(color))

// Negative: 8-bit channels are not 16-bit channels.
expectNotAssignable<Rgb>(Rgb.to8Bit(color))

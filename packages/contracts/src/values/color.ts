/**
 * RGB colors with 16-bit channels.
 *
 * Channels keep the full 16-bit precision that native color values carry. Eight
 * bit and hexadecimal forms are convenience inputs only: an 8-bit channel maps
 * to 16 bits by multiplying by exactly {@link RGB_8BIT_SCALE}, and the reverse
 * conversion divides and rounds, which is lossy. Hexadecimal text is a
 * convenience form, never the canonical one. Basic RGB has no alpha.
 *
 * @packageDocumentation
 */

import { Integer } from './integer.js'

/** Largest value of a 16-bit color channel. The smallest is `0`. */
export const RGB_CHANNEL_MAX = 65535

/**
 * Factor between an 8-bit channel and its 16-bit equivalent. Because
 * `255 × 257 = 65535`, the full 8-bit range maps exactly onto the full 16-bit
 * range.
 */
export const RGB_8BIT_SCALE = 257

/**
 * An RGB color whose channels are integers in `0..`{@link RGB_CHANNEL_MAX}.
 *
 * @remarks
 * How a particular app represents color natively (16-bit lists, normalized
 * `0..1` components, or something else) is a bridge concern; this type is the
 * one SDK representation.
 */
export interface Rgb {
  /** Red channel. */
  readonly r: Integer
  /** Green channel. */
  readonly g: Integer
  /** Blue channel. */
  readonly b: Integer
}

/** Largest value of an 8-bit color channel. */
const RGB_8BIT_MAX = 255

/** Six hexadecimal digits with an optional leading `#`. */
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

/** A color with 8-bit channels, as produced by {@link RgbHelpers.to8Bit}. */
export interface Rgb8Bit {
  /** Red channel, `0..255`. */
  readonly r: number
  /** Green channel, `0..255`. */
  readonly g: number
  /** Blue channel, `0..255`. */
  readonly b: number
}

/**
 * Construction and conversion of {@link (Rgb:interface)} colors.
 *
 * @remarks
 * Every helper validates its input and throws `RangeError` on a channel that
 * is not an integer in range; nothing is clamped.
 */
export interface RgbHelpers {
  /**
   * Build a color from 16-bit channels.
   *
   * @throws `RangeError` when a channel is not an integer in
   * `0..`{@link RGB_CHANNEL_MAX}.
   */
  create(r: number, g: number, b: number): Rgb
  /**
   * Build a color from 8-bit channels, multiplying each by exactly
   * {@link RGB_8BIT_SCALE} (so `255` becomes `65535` and `128` becomes `32896`).
   *
   * @throws `RangeError` when a channel is not an integer in `0..255`.
   */
  from8Bit(r: number, g: number, b: number): Rgb
  /**
   * Build a color from six-digit hexadecimal text such as `#FF8000` (the `#`
   * is optional and case does not matter), converting each 8-bit channel as
   * {@link RgbHelpers.from8Bit} does.
   *
   * @throws `RangeError` when the text is not exactly six hexadecimal digits
   * after an optional `#`. Three-digit and alpha forms are not accepted.
   */
  fromHex(hex: string): Rgb
  /**
   * Convert to 8-bit channels: each channel is divided by
   * {@link RGB_8BIT_SCALE} and rounded half away from zero.
   *
   * @remarks
   * Lossy: 16-bit channels that are not multiples of 257 do not survive a
   * round trip through 8 bits.
   *
   * @throws `RangeError` when a channel of `rgb` is not valid.
   */
  to8Bit(rgb: Rgb): Rgb8Bit
  /**
   * Render as lowercase `#rrggbb` text, converting channels as
   * {@link RgbHelpers.to8Bit} does. Lossy for the same reason.
   *
   * @throws `RangeError` when a channel of `rgb` is not valid.
   */
  toHex(rgb: Rgb): string
}

/**
 * Helpers that build and convert {@link (Rgb:interface)} colors. The value shares its
 * name with the type, so they are found exactly where the type is used.
 */
export const Rgb: RgbHelpers = Object.freeze({
  create(r: number, g: number, b: number): Rgb {
    return {
      r: channel('Rgb.create', 'r', r, RGB_CHANNEL_MAX),
      g: channel('Rgb.create', 'g', g, RGB_CHANNEL_MAX),
      b: channel('Rgb.create', 'b', b, RGB_CHANNEL_MAX),
    }
  },
  from8Bit(r: number, g: number, b: number): Rgb {
    return scaleUp('Rgb.from8Bit', r, g, b)
  },
  fromHex(hex: string): Rgb {
    const match = typeof hex === 'string' ? HEX_COLOR_PATTERN.exec(hex) : null
    const [, r, g, b] = match ?? []
    if (r === undefined || g === undefined || b === undefined) {
      throw new RangeError(
        `Rgb.fromHex: ${JSON.stringify(hex)} is not a six-digit hexadecimal color ` +
          '(expected, for example, "#ff8000" or "FF8000").'
      )
    }
    return scaleUp('Rgb.fromHex', parseInt(r, 16), parseInt(g, 16), parseInt(b, 16))
  },
  to8Bit(rgb: Rgb): Rgb8Bit {
    return scaleDown('Rgb.to8Bit', rgb)
  },
  toHex(rgb: Rgb): string {
    const { r, g, b } = scaleDown('Rgb.toHex', rgb)
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
  },
})

/** Validate one channel (an integer in `0..max`), normalizing `-0` to `0`. */
function channel(helper: string, name: string, value: unknown, max: number): Integer {
  if (Integer.is(value) && value >= 0 && value <= max) return Integer.validate(value)
  const rendered = typeof value === 'number' && Object.is(value, -0) ? '-0' : String(value)
  throw new RangeError(
    `${helper}: channel ${name} is ${rendered}, but channels are integers in 0..${String(max)}.`
  )
}

function scaleUp(helper: string, r: number, g: number, b: number): Rgb {
  return {
    r: Integer.validate(channel(helper, 'r', r, RGB_8BIT_MAX) * RGB_8BIT_SCALE),
    g: Integer.validate(channel(helper, 'g', g, RGB_8BIT_MAX) * RGB_8BIT_SCALE),
    b: Integer.validate(channel(helper, 'b', b, RGB_8BIT_MAX) * RGB_8BIT_SCALE),
  }
}

function scaleDown(helper: string, rgb: Rgb): Rgb8Bit {
  return {
    r: Integer.round(channel(helper, 'r', rgb.r, RGB_CHANNEL_MAX) / RGB_8BIT_SCALE),
    g: Integer.round(channel(helper, 'g', rgb.g, RGB_CHANNEL_MAX) / RGB_8BIT_SCALE),
    b: Integer.round(channel(helper, 'b', rgb.b, RGB_CHANNEL_MAX) / RGB_8BIT_SCALE),
  }
}

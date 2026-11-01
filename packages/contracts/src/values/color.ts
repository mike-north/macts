/**
 * RGB colors with 16-bit channels.
 *
 * Channels keep the full 16-bit precision that native color values carry. Eight
 * bit and hexadecimal forms are convenience inputs only: an 8-bit channel maps
 * to 16 bits by multiplying by exactly {@link RGB_8BIT_SCALE}, and the reverse
 * conversion divides and rounds, which is lossy. Basic RGB has no alpha.
 *
 * @packageDocumentation
 */

import type { Integer } from './integer.js'

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

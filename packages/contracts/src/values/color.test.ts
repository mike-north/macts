/**
 * Runtime tests for the `Rgb` helpers.
 *
 * Expected values are computed by hand from the color contract: channels are
 * integers in `0..65535`; an 8-bit channel maps to 16 bits by multiplying by
 * exactly 257; the reverse divides by 257 and rounds half away from zero, which
 * is lossy; hex is six digits with an optional `#`, case-insensitive; there is
 * no alpha.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A3 (RGB)
 */

import { describe, expect, it } from 'vitest'
import { Rgb } from './color.js'

describe('Rgb.create', () => {
  it('builds a color from in-range integer channels', () => {
    expect(Rgb.create(0, 32768, 65535)).toEqual({ r: 0, g: 32768, b: 65535 })
  })

  it('normalizes a -0 channel to 0', () => {
    expect(Object.is(Rgb.create(-0, 0, 0).r, 0)).toBe(true)
  })

  it.each([
    ['r', [65536, 0, 0]],
    ['g', [0, -1, 0]],
    ['b', [0, 0, 1.5]],
    ['r', [Number.NaN, 0, 0]],
    ['b', [0, 0, Number.POSITIVE_INFINITY]],
  ] as const)('rejects an invalid %s channel', (channel, [r, g, b]) => {
    expect(() => Rgb.create(r, g, b)).toThrow(RangeError)
    const message = errorMessage(() => Rgb.create(r, g, b))
    expect(message).toContain(channel)
    expect(message).toContain('0..65535')
  })
})

describe('Rgb.from8Bit', () => {
  it('multiplies each channel by exactly 257', () => {
    expect(Rgb.from8Bit(255, 128, 0)).toEqual({ r: 65535, g: 32896, b: 0 })
    expect(Rgb.from8Bit(1, 2, 3)).toEqual({ r: 257, g: 514, b: 771 })
  })

  it.each([
    [256, 0, 0],
    [0, -1, 0],
    [0, 0, 12.5],
  ])('rejects the out-of-range 8-bit color (%s, %s, %s)', (r, g, b) => {
    expect(() => Rgb.from8Bit(r, g, b)).toThrow(RangeError)
    expect(errorMessage(() => Rgb.from8Bit(r, g, b))).toContain('0..255')
  })
})

describe('Rgb.fromHex', () => {
  it.each(['#FF8000', 'FF8000', '#ff8000', 'fF8000'])('parses %s', (hex) => {
    expect(Rgb.fromHex(hex)).toEqual({ r: 65535, g: 32896, b: 0 })
  })

  it.each(['#FFF', '#FF800000', '#GG8000', 'FF 800', '', '##FF8000', ' #FF8000'])(
    'rejects %j',
    (hex) => {
      expect(() => Rgb.fromHex(hex)).toThrow(RangeError)
    }
  )
})

describe('Rgb.to8Bit', () => {
  it.each([
    [32896, 128],
    // 32767 / 257 = 127.498…, which rounds down.
    [32767, 127],
    // 32768 / 257 = 127.502…, which rounds up.
    [32768, 128],
    [65535, 255],
    [0, 0],
    // 128 / 257 = 0.498…; 129 / 257 = 0.501…
    [128, 0],
    [129, 1],
  ])('maps the 16-bit channel %s to %s', (channel, expected) => {
    const color = Rgb.create(channel, channel, channel)
    expect(Rgb.to8Bit(color)).toEqual({ r: expected, g: expected, b: expected })
  })

  it('rejects a color whose channels bypassed validation', () => {
    expect(() => Rgb.to8Bit(bypass({ r: 70000, g: 0, b: 0 }))).toThrow(RangeError)
  })
})

describe('Rgb.toHex', () => {
  it('renders lowercase #rrggbb', () => {
    expect(Rgb.toHex(Rgb.create(65535, 32896, 0))).toBe('#ff8000')
    expect(Rgb.toHex(Rgb.create(0, 0, 0))).toBe('#000000')
    expect(Rgb.toHex(Rgb.create(257, 2570, 4369))).toBe('#010a11')
  })

  it('is lossy: a channel that is not a multiple of 257 does not survive a hex round trip', () => {
    const color = Rgb.create(32767, 0, 0)
    expect(Rgb.fromHex(Rgb.toHex(color))).toEqual({ r: 32639, g: 0, b: 0 })
  })
})

/** Simulate a value that bypassed static types. */
function bypass(value: { r: number; g: number; b: number }): Rgb {
  return value as Rgb
}

function errorMessage(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('expected the call to throw')
}

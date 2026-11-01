/**
 * Tests for the in-memory fixed-window rate limiter.
 *
 * Expected admissions and retry delays are hand-derived from the fixed-window
 * rule: a key's window opens at its first call and lasts `windowMs`; the first
 * `max` calls in a window are admitted; a denial reports the whole seconds
 * left in the window, rounded up, and never less than one. Time is driven by
 * an injected clock, so no test depends on the wall clock.
 */

import { describe, expect, it } from 'vitest'
import { createRateLimiter, type RateLimitAdmission } from './rate-limiter.js'

const START = Date.parse('2026-03-04T05:06:07.000Z')

/** A clock whose current time a test advances explicitly. */
function manualClock(): { readonly clock: () => Date; advance(ms: number): void } {
  let now = START
  return {
    clock: () => new Date(now),
    advance(ms) {
      now += ms
    },
  }
}

/** Admit `count` calls for `key`, returning each outcome in order. */
function admitMany(
  limiter: ReturnType<typeof createRateLimiter>,
  key: string,
  count: number
): RateLimitAdmission[] {
  return Array.from({ length: count }, () => limiter.admit(key))
}

describe('createRateLimiter', () => {
  it('admits up to max calls per window, then denies', () => {
    const { clock } = manualClock()
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000, clock })

    expect(admitMany(limiter, 'key_a', 4)).toEqual([
      { allowed: true },
      { allowed: true },
      { allowed: true },
      { allowed: false, retryAfterSeconds: 60 },
    ])
  })

  it('reports the seconds left in the window, rounded up', () => {
    const time = manualClock()
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, clock: time.clock })

    limiter.admit('key_a')
    time.advance(20_500)

    // 39.5 s remain, rounded up to 40.
    expect(limiter.admit('key_a')).toEqual({ allowed: false, retryAfterSeconds: 40 })
  })

  it('never reports less than one second, even for a sub-second window', () => {
    const { clock } = manualClock()
    const limiter = createRateLimiter({ max: 0, windowMs: 200, clock })

    expect(limiter.admit('key_a')).toEqual({ allowed: false, retryAfterSeconds: 1 })
  })

  it('admits again once the window has ended', () => {
    const time = manualClock()
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, clock: time.clock })

    admitMany(limiter, 'key_a', 3)
    time.advance(60_000)

    expect(admitMany(limiter, 'key_a', 3)).toEqual([
      { allowed: true },
      { allowed: true },
      { allowed: false, retryAfterSeconds: 60 },
    ])
  })

  it('keeps denying until the window ends', () => {
    const time = manualClock()
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, clock: time.clock })

    admitMany(limiter, 'key_a', 2)
    time.advance(59_999)

    expect(limiter.admit('key_a')).toEqual({ allowed: false, retryAfterSeconds: 1 })
  })

  it('counts each key independently', () => {
    const { clock } = manualClock()
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, clock })

    expect(limiter.admit('key_a')).toEqual({ allowed: true })
    expect(limiter.admit('key_a').allowed).toBe(false)
    expect(limiter.admit('key_b')).toEqual({ allowed: true })
  })

  it('admits nothing when max is 0', () => {
    const { clock } = manualClock()
    const limiter = createRateLimiter({ max: 0, windowMs: 60_000, clock })

    expect(limiter.admit('key_a')).toEqual({ allowed: false, retryAfterSeconds: 60 })
  })

  it('defaults to 100 calls per minute', () => {
    const { clock } = manualClock()
    const limiter = createRateLimiter({ clock })

    const outcomes = admitMany(limiter, 'key_a', 101)

    expect(outcomes.slice(0, 100).every((outcome) => outcome.allowed)).toBe(true)
    expect(outcomes[100]).toEqual({ allowed: false, retryAfterSeconds: 60 })
  })

  it('opens a fresh window for a key whose old window expired while other keys were active', () => {
    const time = manualClock()
    const limiter = createRateLimiter({ max: 1, windowMs: 1_000, clock: time.clock })

    limiter.admit('key_a')
    time.advance(5_000)
    // A call from another key sweeps expired windows; key_a starts over.
    limiter.admit('key_b')

    expect(limiter.admit('key_a')).toEqual({ allowed: true })
  })

  it.each([
    ['zero windowMs', { windowMs: 0 }],
    ['negative windowMs', { windowMs: -1 }],
    ['non-finite windowMs', { windowMs: Number.POSITIVE_INFINITY }],
    ['NaN windowMs', { windowMs: Number.NaN }],
    ['negative max', { max: -1 }],
    ['fractional max', { max: 1.5 }],
    ['NaN max', { max: Number.NaN }],
  ])('rejects %s', (_name, options) => {
    expect(() => createRateLimiter(options)).toThrow(RangeError)
  })
})

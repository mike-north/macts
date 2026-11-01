/**
 * Admission limiting: how many calls a key may make in a window of time.
 *
 * A {@link RateLimiter} answers one question about a key (the verified
 * subject of a credential, or any other caller key a surface chooses): may
 * this call be admitted now? It never decides whether the call is authorized.
 * Admission only ever turns a call away early; an admitted call still goes
 * through every authorization step, so a limiter cannot grant anything.
 *
 * {@link createRateLimiter} is the in-memory fixed-window implementation: each
 * key gets a counter that starts with its first call and resets when its
 * window ends. State lives in the process, so limits are per runtime instance
 * and reset on restart. Expired windows are swept during admission, so the
 * limiter holds no timers and needs no shutdown.
 *
 * @packageDocumentation
 */

/**
 * The outcome of asking a {@link RateLimiter} to admit one call.
 *
 * @remarks
 * A denial carries `retryAfterSeconds`: a non-negative integer number of
 * seconds after which the same key will be admitted again.
 */
export type RateLimitAdmission =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number }

/**
 * Decides whether a call from a given key may be admitted.
 *
 * @remarks
 * `admit` counts the call when it admits it. It is synchronous and must not
 * throw in normal operation; a caller treats a throw as a limiter failure and
 * fails closed.
 */
export interface RateLimiter {
  /** Count one call from `key` and report whether it is admitted. */
  admit(key: string): RateLimitAdmission
}

/** Configuration for {@link createRateLimiter}. */
export interface RateLimiterOptions {
  /**
   * Length of each key's window, in milliseconds. A positive finite number.
   *
   * @defaultValue 60000
   */
  readonly windowMs?: number
  /**
   * Calls admitted per key per window. A non-negative safe integer; `0` admits
   * nothing.
   *
   * @defaultValue 100
   */
  readonly max?: number
  /**
   * Source of the current time.
   *
   * @defaultValue the system clock
   */
  readonly clock?: () => Date
}

/** Window length used when none is configured: one minute. */
const DEFAULT_WINDOW_MS = 60_000

/** Calls per window used when no limit is configured. */
const DEFAULT_MAX = 100

/** One key's counter in the current window. */
interface WindowState {
  /** Calls counted in this window, including denied ones. */
  count: number
  /** Epoch milliseconds at which this window ends and the count resets. */
  readonly resetAt: number
}

/**
 * Build an in-memory fixed-window rate limiter.
 *
 * @remarks
 * Each key's window opens at its first call and lasts `windowMs`. Within a
 * window the first `max` calls are admitted and the rest are denied with the
 * whole seconds remaining until the window ends, rounded up and never less
 * than one, so a client that honors the delay is admitted when it retries.
 *
 * @param options - Window length, per-window limit, and clock.
 * @returns A limiter with no keys counted yet.
 * @throws `RangeError` when `windowMs` is not a positive finite number or `max`
 *   is not a non-negative safe integer.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const max = options.max ?? DEFAULT_MAX
  const clock = options.clock ?? (() => new Date())

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError(`Rate limit windowMs must be a positive number, got ${String(windowMs)}`)
  }
  if (!Number.isSafeInteger(max) || max < 0) {
    throw new RangeError(`Rate limit max must be a non-negative integer, got ${String(max)}`)
  }

  const windows = new Map<string, WindowState>()
  // Expired windows are dropped at most once per window length, so memory is
  // bounded by the keys seen in roughly the last two windows.
  let nextSweepAt = 0

  function sweep(now: number): void {
    if (now < nextSweepAt) return
    for (const [key, state] of windows) {
      if (state.resetAt <= now) windows.delete(key)
    }
    nextSweepAt = now + windowMs
  }

  return {
    admit(key) {
      const now = clock().getTime()
      sweep(now)

      let state = windows.get(key)
      if (state === undefined || state.resetAt <= now) {
        state = { count: 0, resetAt: now + windowMs }
        windows.set(key, state)
      }
      state.count++

      if (state.count <= max) {
        return { allowed: true }
      }
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
      }
    },
  }
}

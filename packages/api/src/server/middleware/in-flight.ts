/**
 * In-flight request tracker for graceful shutdown.
 *
 * Tracks active requests and provides a drain mechanism
 * to wait for all in-flight requests to complete before
 * shutting down the server.
 *
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'

/**
 * In-flight request tracker for graceful shutdown.
 */
export interface InFlightTracker {
  /** Middleware that tracks in-flight requests */
  middleware(): MiddlewareHandler
  /** Wait for all in-flight requests to complete */
  waitForDrain(timeoutMs: number): Promise<void>
  /** Current number of in-flight requests */
  readonly count: number
}

/**
 * Create an in-flight request tracker.
 *
 * Use this to implement graceful shutdown by waiting for
 * all active requests to complete before closing the server.
 *
 * @returns An in-flight request tracker
 *
 * @example
 * ```typescript
 * const tracker = createInFlightTracker();
 * app.use('*', tracker.middleware());
 *
 * // During shutdown:
 * await tracker.waitForDrain(10_000);
 * ```
 */
export function createInFlightTracker(): InFlightTracker {
  let inFlightCount = 0
  let drainResolve: (() => void) | null = null

  function checkDrain(): void {
    if (inFlightCount === 0 && drainResolve) {
      drainResolve()
      drainResolve = null
    }
  }

  return {
    middleware(): MiddlewareHandler {
      return async (_c, next) => {
        inFlightCount++
        try {
          await next()
        } finally {
          inFlightCount--
          checkDrain()
        }
      }
    },

    waitForDrain(timeoutMs: number): Promise<void> {
      if (inFlightCount === 0) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve, reject) => {
        drainResolve = resolve

        const timer = setTimeout(() => {
          drainResolve = null
          reject(
            new Error(
              `Drain timeout: ${String(inFlightCount)} requests still in-flight after ${String(timeoutMs)}ms`
            )
          )
        }, timeoutMs)

        // Don't hold the process open for the timeout
        if (typeof timer === 'object' && 'unref' in timer) {
          timer.unref()
        }
      })
    },

    get count(): number {
      return inFlightCount
    },
  }
}

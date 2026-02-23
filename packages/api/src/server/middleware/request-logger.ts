/**
 * Request logging middleware using Pino.
 *
 * Assigns a unique request ID to each request, logs request start
 * and completion with timing information.
 *
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'
import { getLogger } from '../../logger.js'

/**
 * Create a request logging middleware.
 *
 * For each request:
 * 1. Generates a unique request ID (UUID v4)
 * 2. Sets the `x-request-id` response header
 * 3. Logs request start with method and path
 * 4. Logs request completion with status and duration
 *
 * @returns Hono middleware handler
 */
export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const requestId = randomUUID()
    const start = Date.now()
    const log = getLogger().child({ requestId })

    c.header('x-request-id', requestId)

    log.info({ method: c.req.method, path: c.req.path }, 'request started')

    await next()

    const duration = Date.now() - start
    log.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, duration },
      'request completed'
    )
  }
}

/**
 * Permission middleware for the macts API server.
 *
 * Checks if the authenticated user has the required permission
 * for a specific endpoint.
 *
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'
import type { PermissionHistoryEntry } from '@macts/core'
import { checkPayloadPermission } from '../../keys/validator.js'
import { getTracer, SpanStatusCode } from '../../telemetry.js'
import type { AuthVariables } from './auth.js'

/**
 * Error response structure for permission failures.
 */
export interface PermissionErrorResponse {
  error: {
    code: 'PERMISSION_DENIED'
    message: string
    required: string
    hint?: string
    changelog?: {
      version: string
      previousPermission: string
      reason?: string
    }
  }
}

/**
 * Options for the permission middleware.
 */
export interface PermissionMiddlewareOptions {
  /** History entries for helpful error messages */
  permissionHistory?: PermissionHistoryEntry[]
}

/**
 * Permission middleware factory.
 *
 * Creates middleware that checks if the authenticated user has
 * a specific permission. Must be used after auth middleware.
 *
 * @param requiredPermission - The permission string required (e.g., 'calendar:events:list')
 * @param options - Optional configuration
 * @returns Middleware handler
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { authMiddleware } from './middleware/auth.js';
 * import { requirePermission } from './middleware/permission.js';
 *
 * const app = new Hono<{ Variables: AuthVariables }>();
 *
 * app.use('/api/*', authMiddleware());
 *
 * app.post('/api/rpc/calendar.events.list', requirePermission('calendar:events:list'), (c) => {
 *   // Handle request - user has permission
 * });
 * ```
 */
export function requirePermission(
  requiredPermission: string,
  options: PermissionMiddlewareOptions = {}
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const payload = c.get('apiKeyPayload')

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive check for missing auth middleware
    if (!payload) {
      // Auth middleware wasn't applied - this is a server configuration error
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authentication required but no payload found',
          },
        },
        500
      )
    }

    const span = getTracer('macts-api').startSpan('auth.checkPermission', {
      attributes: { 'auth.permission': requiredPermission },
    })
    const result = checkPayloadPermission(payload, requiredPermission, options.permissionHistory)
    span.setAttribute('auth.granted', result.granted)
    span.setStatus({ code: result.granted ? SpanStatusCode.OK : SpanStatusCode.UNSET })
    span.end()

    if (!result.granted) {
      return c.json<PermissionErrorResponse>(
        {
          error: {
            code: 'PERMISSION_DENIED',
            message: result.hint ?? `Missing required permission: ${requiredPermission}`,
            required: requiredPermission,
            ...(result.hint && { hint: result.hint }),
            ...(result.changelog && { changelog: result.changelog }),
          },
        },
        403
      )
    }

    return next()
  }
}

/**
 * Extract required permission from RPC path.
 *
 * Converts RPC path format to permission string.
 * Example: '/rpc/calendar.events.list' -> 'calendar:events:list'
 *
 * @param path - RPC path (e.g., '/rpc/calendar.events.list')
 * @returns Permission string (e.g., 'calendar:events:list')
 */
export function rpcPathToPermission(path: string): string {
  // Remove /rpc/ prefix
  const rpcPath = path.replace(/^\/rpc\//, '')
  // Replace dots with colons
  return rpcPath.replace(/\./g, ':')
}

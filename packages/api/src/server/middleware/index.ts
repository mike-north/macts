/**
 * Server middleware exports.
 * @packageDocumentation
 */

export {
  authMiddleware,
  type AuthVariables,
  type AuthErrorCode,
  type AuthErrorResponse,
} from './auth.js'

export {
  requirePermission,
  rpcPathToPermission,
  type PermissionErrorResponse,
  type PermissionMiddlewareOptions,
} from './permission.js'

export { requestLogger } from './request-logger.js'

export { createInFlightTracker, type InFlightTracker } from './in-flight.js'

export { createRateLimiter, type RateLimitOptions, type RateLimiterInstance } from './rate-limit.js'

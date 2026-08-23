/**
 * Authentication middleware for the macts API server.
 *
 * Validates API keys from the Authorization header and attaches
 * the validated payload to the Hono context.
 *
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'
import type { ApiKeyPayload, ApiKeyValidationErrorCode } from '@macts/core'
import { validateApiKey } from '../../keys/validator.js'
import { withSpan } from '../../telemetry.js'

/**
 * Context variables added by auth middleware.
 */
export interface AuthVariables {
  /** The validated API key payload */
  apiKeyPayload: ApiKeyPayload
}

/**
 * Error codes for authentication failures.
 */
export type AuthErrorCode =
  | 'MISSING_AUTHORIZATION'
  | 'INVALID_AUTH_SCHEME'
  | ApiKeyValidationErrorCode

/**
 * Authentication error response structure.
 */
export interface AuthErrorResponse {
  error: {
    code: AuthErrorCode
    message: string
  }
}

/**
 * Authentication middleware for macts API.
 *
 * Expects `Authorization: Bearer macts_sk_...` header.
 * On success, sets `apiKeyPayload` variable in context.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { authMiddleware } from './middleware/auth.js';
 *
 * const app = new Hono<{ Variables: AuthVariables }>();
 * app.use('/api/*', authMiddleware());
 *
 * app.get('/api/protected', (c) => {
 *   const payload = c.get('apiKeyPayload');
 *   return c.json({ keyId: payload.sub });
 * });
 * ```
 */
export function authMiddleware(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')

    // Check for Authorization header
    if (!authHeader) {
      return c.json<AuthErrorResponse>(
        {
          error: {
            code: 'MISSING_AUTHORIZATION',
            message: 'Authorization header is required',
          },
        },
        401
      )
    }

    // Parse Bearer token
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json<AuthErrorResponse>(
        {
          error: {
            code: 'INVALID_AUTH_SCHEME',
            message: 'Authorization header must use Bearer scheme',
          },
        },
        401
      )
    }

    const token = parts[1] ?? ''

    // Validate token
    const result = await withSpan('auth.validateApiKey', async (span) => {
      span.setAttribute('auth.token_prefix', token.slice(0, 9))
      return validateApiKey(token)
    })

    if (!result.valid) {
      return c.json<AuthErrorResponse>(
        {
          error: {
            code: result.errorCode,
            message: result.error,
          },
        },
        401
      )
    }

    // Attach payload to context
    c.set('apiKeyPayload', result.payload)

    return next()
  }
}

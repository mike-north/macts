/**
 * HTTP server for the macts API.
 *
 * Creates a Hono-based HTTP server that exposes RPC endpoints
 * for macOS app automation.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import type pino from 'pino'
import type { AppManifest } from '@macts/core'
import { getLogger, setLogger } from '../logger.js'
import { authMiddleware, type AuthVariables } from './middleware/auth.js'
import { createInFlightTracker } from './middleware/in-flight.js'
import { createRateLimiter, type RateLimitOptions } from './middleware/rate-limit.js'
import { requestLogger } from './middleware/request-logger.js'
import { createRpcRouter, createMultiAppRpcRouter } from './handlers/rpc.js'
import { loadTlsOptions, type TlsOptions } from './tls.js'

// Re-export middleware and handlers
export {
  authMiddleware,
  type AuthVariables,
  type AuthErrorCode,
  type AuthErrorResponse,
} from './middleware/auth.js'
export {
  requirePermission,
  rpcPathToPermission,
  type PermissionErrorResponse,
  type PermissionMiddlewareOptions,
} from './middleware/permission.js'
export {
  createRpcRouter,
  createMultiAppRpcRouter,
  type RpcRequest,
  type RpcSuccessResponse,
  type RpcErrorResponse,
  type RpcHandler,
  type RpcHandlerContext,
  type RpcEndpointInfo,
} from './handlers/rpc.js'
export { createInFlightTracker, type InFlightTracker } from './middleware/in-flight.js'
export { type TlsOptions, type LoadedTlsOptions } from './tls.js'
export {
  createRateLimiter,
  type RateLimitOptions,
  type RateLimiterInstance,
} from './middleware/rate-limit.js'

/**
 * Server configuration options.
 */
export interface ServerOptions {
  /** Port to listen on (default: 8372) */
  port?: number
  /** Host to bind to (default: 'localhost') */
  host?: string
  /** Enable CORS (default: true for localhost) */
  cors?: boolean | { origin: string | string[] }
  /** Enable request logging (default: false) */
  logging?: boolean
  /** Custom Pino logger instance */
  logger?: pino.Logger
  /** Pretty print JSON responses (default: true in development) */
  prettyJson?: boolean
  /** Timeout for graceful shutdown in milliseconds (default: 10000) */
  gracefulShutdownTimeout?: number
  /** TLS configuration for HTTPS support */
  tls?: TlsOptions
  /** Rate limiting configuration, or false to disable (default: enabled with 100 req/min) */
  rateLimit?: RateLimitOptions | false
}

/**
 * Server instance with lifecycle methods.
 */
export interface ServerInstance {
  /** The Hono app */
  app: Hono<{ Variables: AuthVariables }>
  /** Start the server */
  start(): Promise<void>
  /** Stop the server */
  stop(): Promise<void>
  /** Server URL after start */
  url: string | null
}

/**
 * Default server port for macts API.
 */
export const DEFAULT_PORT = 8372

/**
 * Default host for macts API.
 */
export const DEFAULT_HOST = 'localhost'

/**
 * Create a macts API server for a single app.
 *
 * @param manifest - App manifest to serve
 * @param options - Server configuration
 * @returns Hono app configured with routes
 *
 * @example
 * ```typescript
 * import { createServer, DEFAULT_PORT } from '@macts/api/server';
 * import { loadManifest } from '@macts/core';
 *
 * const manifest = await loadManifest('./calendar/app.yaml');
 * const { app, start } = createServer(manifest, { port: DEFAULT_PORT });
 *
 * await start();
 * console.log('Server running on http://localhost:8372');
 * ```
 */
export function createServer(manifest: AppManifest, options: ServerOptions = {}): ServerInstance {
  return createMultiServer([manifest], options)
}

/**
 * Create a macts API server for multiple apps.
 *
 * @param manifests - Array of app manifests
 * @param options - Server configuration
 * @returns Hono app configured with routes for all apps
 *
 * @example
 * ```typescript
 * import { createMultiServer } from '@macts/api/server';
 * import { loadManifest } from '@macts/core';
 *
 * const calendar = await loadManifest('./calendar/app.yaml');
 * const reminders = await loadManifest('./reminders/app.yaml');
 * const { app, start } = createMultiServer([calendar, reminders]);
 *
 * await start();
 * ```
 */
export function createMultiServer(
  manifests: AppManifest[],
  options: ServerOptions = {}
): ServerInstance {
  const {
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    cors: corsOption = true,
    logging = false,
    logger: customLogger,
    prettyJson = process.env['NODE_ENV'] !== 'production',
    gracefulShutdownTimeout = 10_000,
    tls,
    rateLimit,
  } = options

  if (customLogger) {
    setLogger(customLogger)
  }

  const app = new Hono<{ Variables: AuthVariables }>()

  // Track in-flight requests for graceful shutdown
  const tracker = createInFlightTracker()
  app.use('*', tracker.middleware())

  // Apply middleware
  if (logging) {
    app.use('*', requestLogger())
  }

  if (prettyJson) {
    app.use('*', prettyJSON())
  }

  if (corsOption) {
    const corsConfig =
      typeof corsOption === 'object' ? { origin: corsOption.origin } : { origin: '*' }
    app.use('*', cors(corsConfig))
  }

  // Health check endpoint (no auth required)
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      version: '1.0.0',
      apps: manifests.map((m) => m.app.name),
    })
  })

  // API info endpoint (no auth required)
  app.get('/api/v1', (c) => {
    return c.json({
      name: 'macts API',
      version: 'v1',
      documentation: 'https://github.com/macts/macts',
      apps: manifests.map((m) => ({
        name: m.app.name,
        bundleId: m.app.bundleId,
      })),
    })
  })

  // Protected API routes
  app.use('/api/v1/rpc/*', authMiddleware())

  // Rate limiting (after auth so we can key by API key ID)
  if (rateLimit !== false) {
    const limiter = createRateLimiter(typeof rateLimit === 'object' ? rateLimit : undefined)
    app.use('/api/v1/rpc/*', limiter.middleware())
  }

  // Mount RPC router
  const firstManifest = manifests[0]
  const rpcRouter =
    manifests.length === 1 && firstManifest
      ? createRpcRouter(firstManifest)
      : createMultiAppRpcRouter(manifests)
  app.route('/api/v1', rpcRouter)

  // Error handling
  app.onError((err, c) => {
    getLogger().error({ err }, 'Server error')
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message,
        },
      },
      500
    )
  })

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Route not found: ${c.req.method} ${c.req.path}`,
        },
      },
      404
    )
  })

  // Server state
  let serverUrl: string | null = null
  // Use generic type for server to support both Bun and Node.js
  let server: { stop?: () => void; close?: () => void } | null = null

  return {
    app,
    get url() {
      return serverUrl
    },
    async start() {
      // Use Bun.serve if available, otherwise fall back to Node.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      if (typeof (globalThis as any).Bun !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        server = (globalThis as any).Bun.serve({
          fetch: app.fetch,
          port,
          hostname: host,
          ...(tls ? { tls: loadTlsOptions(tls) } : {}),
        })
        serverUrl = `${tls ? 'https' : 'http'}://${host}:${String(port)}`
      } else {
        // Node.js fallback using @hono/node-server
        const { serve } = await import('@hono/node-server')
        if (tls) {
          const https = await import('node:https')
          const tlsOpts = loadTlsOptions(tls)
          server = serve({
            fetch: app.fetch,
            port,
            hostname: host,
            createServer: https.createServer,
            serverOptions: {
              cert: tlsOpts.cert,
              key: tlsOpts.key,
              ca: tlsOpts.ca,
            },
          })
          serverUrl = `https://${host}:${String(port)}`
        } else {
          server = serve({
            fetch: app.fetch,
            port,
            hostname: host,
          })
          serverUrl = `http://${host}:${String(port)}`
        }
      }
    },
    async stop() {
      if (server) {
        // Stop accepting new connections
        if (server.stop) {
          server.stop()
        } else if (server.close) {
          server.close()
        }

        // Wait for in-flight requests to complete
        try {
          await tracker.waitForDrain(gracefulShutdownTimeout)
        } catch {
          // Timeout reached, force close
          getLogger().warn('Graceful shutdown timeout reached, forcing close')
        }

        server = null
        serverUrl = null
      }
    },
  }
}

/**
 * Create just the Hono app without server lifecycle.
 *
 * Useful for testing or custom server setups.
 *
 * @param manifests - Array of app manifests
 * @param options - Server configuration (only middleware options used)
 * @returns Configured Hono app
 */
export function createApp(
  manifests: AppManifest[],
  options: Pick<ServerOptions, 'cors' | 'logging' | 'prettyJson'> = {}
): Hono<{ Variables: AuthVariables }> {
  return createMultiServer(manifests, options).app
}

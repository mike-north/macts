/**
 * HTTP server for the macts API.
 *
 * Composes a macts runtime (executor, credential verifier, governance, and the
 * per-subject admission limit) with the HTTP adapter, and adds the
 * server-level concerns around it: the unauthenticated `/health` and
 * `/api/v1` endpoints, CORS, pretty JSON, request logging, in-flight request
 * tracking, TLS, and graceful shutdown. Every operation request is handled by
 * the adapter and runs through the runtime's invocation pipeline.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import type pino from 'pino'
import { createNativeExecutor, type AppManifest, type Executor } from '@macts/core'
import {
  createRateLimiter,
  createRuntime,
  getLogger,
  loadHostGovernance,
  setLogger,
  type CredentialVerifier,
  type GovernanceContext,
  type RateLimiterOptions,
} from '@macts/runtime'
import { getPackageVersion } from '../package-version.js'
import {
  createHttpAdapter,
  DEFAULT_ADDRESS_RATE_LIMIT,
  errorLogFields,
  internalErrorResponse,
  notFoundResponse,
  type ClientAddressResolver,
} from './adapter.js'
import { createInFlightTracker } from './middleware/in-flight.js'
import { requestLogger } from './middleware/request-logger.js'
import { loadTlsOptions, type TlsOptions } from './tls.js'

export {
  createHttpAdapter,
  httpStatusForError,
  defaultClientAddress,
  DEFAULT_ADDRESS_RATE_LIMIT,
  type ClientAddressResolver,
  type HttpAdapterOptions,
  type RpcSuccessResponse,
} from './adapter.js'
export type { WireErrorEnvelope } from '@macts/contracts'
export { createInFlightTracker, type InFlightTracker } from './middleware/in-flight.js'
export { type TlsOptions, type LoadedTlsOptions } from './tls.js'

/** Calls per minute admitted per verified subject when no limit is configured. */
export const DEFAULT_SUBJECT_RATE_LIMIT = 100

/** Window, in milliseconds, of both default rate limits. */
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000

/**
 * Rate limiting for the HTTP server.
 *
 * @remarks
 * Two independent fixed-window limits apply to operation requests:
 *
 * - The top-level `windowMs` and `max` limit calls per verified subject (the
 *   API key). This is the runtime's admission step, after the credential is
 *   verified and before the permission check.
 * - `perAddress` limits requests per client network address, before the
 *   credential is examined, so failed authentication attempts are bounded too.
 *
 * Both answer `429` with the `RATE_LIMITED` error and a `Retry-After` header.
 */
export interface RateLimitOptions extends RateLimiterOptions {
  /**
   * The per-client-address limit.
   *
   * @defaultValue 300 requests per minute per address
   */
  readonly perAddress?: RateLimiterOptions
}

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
  /**
   * Rate limiting, or `false` to disable both the per-subject and the
   * per-address limit.
   *
   * @defaultValue 100 calls per minute per subject and 300 requests per minute
   *   per client address
   */
  rateLimit?: RateLimitOptions | false
  /**
   * Governance enforcement context (active policy, optional audit writer,
   * optional per-key policy resolver, and optional human-in-the-loop approval
   * gate).
   *
   * When omitted, the server enforces this Mac's governance: `loadHostGovernance`
   * from `@macts/runtime`, loaded on the first call that reaches the governance
   * step. That is the policy file under `MACTS_HOME` (or the default policy when
   * there is none), the registered approval provider if any, every key's own
   * policy, and an audit log under `MACTS_HOME`. If that configuration is
   * malformed or unreadable, every call is denied with `INTERNAL`; it never
   * falls back to allowing everything.
   *
   * Supply a context to enforce something else instead, for example in tests
   * or a custom deployment. Build one from `loadActivePolicy`,
   * `loadApprovalGate`, and `createStoredKeyPolicyResolver` in `@macts/runtime`
   * and `createFileAuditWriter` in `@macts/core`.
   *
   * @defaultValue this Mac's governance, from `loadHostGovernance`
   */
  governance?: GovernanceContext
  /**
   * The executor that carries out authorized operations. A composition point
   * for tests and alternate providers.
   *
   * @defaultValue the native macOS executor from `createNativeExecutor()`
   */
  executor?: Executor
  /**
   * Turns presented credentials into authority. A composition point for tests
   * and alternate credential stores.
   *
   * @defaultValue the runtime's key-store verifier
   */
  verifier?: CredentialVerifier
  /**
   * Resolves the client address the per-address limit is keyed by. A
   * composition point for tests and for deployments behind a trusted proxy.
   *
   * @defaultValue the connection's remote address
   */
  clientAddress?: ClientAddressResolver
}

/**
 * Server instance with lifecycle methods.
 */
export interface ServerInstance {
  /** The Hono app */
  app: Hono
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
    governance,
    executor,
    verifier,
    clientAddress,
  } = options

  if (customLogger) {
    setLogger(customLogger)
  }

  const runtime = createRuntime({
    executor: executor ?? createNativeExecutor(),
    governance: governance ?? loadHostGovernance,
    ...(verifier === undefined ? {} : { verifier }),
    ...(customLogger === undefined ? {} : { logger: customLogger }),
    ...(rateLimit === false
      ? {}
      : {
          rateLimiter: createRateLimiter({
            max: DEFAULT_SUBJECT_RATE_LIMIT,
            windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
            ...subjectLimitOptions(rateLimit),
          }),
        }),
  })
  for (const manifest of manifests) {
    runtime.registerManifest(manifest)
  }

  const adapter = createHttpAdapter(runtime, {
    ...(customLogger === undefined ? {} : { logger: customLogger }),
    ...(clientAddress === undefined ? {} : { clientAddress }),
    addressRateLimiter:
      rateLimit === false
        ? false
        : createRateLimiter({
            max: DEFAULT_ADDRESS_RATE_LIMIT,
            windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
            ...rateLimit?.perAddress,
          }),
  })

  const app = new Hono()

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
  const version = getPackageVersion()
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      version,
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

  // Every operation request goes through the adapter, and from it through the
  // runtime's invocation pipeline.
  app.route('/api/v1', adapter)

  // Fallbacks, in the same envelope as every other failure.
  app.onError((err) => {
    try {
      getLogger().error({ err: errorLogFields(err) }, 'Server error')
    } catch {
      // The fallback must answer even when logging itself is what failed.
    }
    return internalErrorResponse()
  })
  app.notFound(() => notFoundResponse())

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
 * The server options that shape the app itself, as opposed to its listener.
 */
export type AppOptions = Omit<ServerOptions, 'port' | 'host' | 'tls' | 'gracefulShutdownTimeout'>

/**
 * Create just the Hono app without server lifecycle.
 *
 * Useful for testing (with an injected `executor` and `verifier`) or custom
 * server setups.
 *
 * @param manifests - Array of app manifests
 * @param options - Server configuration, excluding listener options
 * @returns Configured Hono app
 */
export function createApp(manifests: AppManifest[], options: AppOptions = {}): Hono {
  return createMultiServer(manifests, options).app
}

/** The per-subject limiter options from the server's rate-limit options. */
function subjectLimitOptions(rateLimit: RateLimitOptions | undefined): RateLimiterOptions {
  if (rateLimit === undefined) return {}
  const { perAddress: _perAddress, ...subject } = rateLimit
  return subject
}

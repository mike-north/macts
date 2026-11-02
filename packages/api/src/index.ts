/**
 * @macts/api - HTTP API for macts
 * @packageDocumentation
 */

export { VERSION } from '@macts/core'

// HTTP server
export {
  createServer,
  createMultiServer,
  createApp,
  DEFAULT_PORT,
  DEFAULT_HOST,
  DEFAULT_SUBJECT_RATE_LIMIT,
  type AppOptions,
  type AppRegistrar,
  type RateLimitOptions,
  type ServerOptions,
  type ServerInstance,
  type TlsOptions,
  type LoadedTlsOptions,
} from './server/index.js'

// HTTP adapters over the runtime: operations and reference resolution
export {
  createHttpAdapter,
  createReferencesAdapter,
  httpStatusForError,
  defaultClientAddress,
  DEFAULT_ADDRESS_RATE_LIMIT,
  type ClientAddressResolver,
  type HttpAdapterOptions,
  type ResolveReferenceRequest,
  type RpcSuccessResponse,
} from './server/index.js'
export type { WireErrorEnvelope } from '@macts/contracts'

// Server-level middleware
export { createInFlightTracker, type InFlightTracker } from './server/middleware/index.js'

// Telemetry
export {
  getTracer,
  withSpan,
  configureTelemetry,
  SpanStatusCode,
  type Span,
  type Tracer,
  type SpanStatusCodeValue,
  type AttributeValue,
  type TelemetryOptions,
} from './telemetry.js'

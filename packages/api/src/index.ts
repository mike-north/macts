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
  type RateLimitOptions,
  type ServerOptions,
  type ServerInstance,
  type TlsOptions,
  type LoadedTlsOptions,
} from './server/index.js'

// HTTP adapter over the runtime
export {
  createHttpAdapter,
  httpStatusForError,
  defaultClientAddress,
  DEFAULT_ADDRESS_RATE_LIMIT,
  type ClientAddressResolver,
  type HttpAdapterOptions,
  type RpcSuccessResponse,
} from './server/adapter.js'
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

// JXA bridge (execution layer)
export {
  runJxa,
  runWithApp,
  JxaExecutionError,
  connect,
  isAppRunning,
  activateApp,
  quitApp,
  getAppName,
  ObjectSpecifier,
  dateCoercer,
  colorCoercer,
  createEnumCoercer,
  pathCoercer,
  booleanCoercer,
  numberCoercer,
  stringCoercer,
  createArrayCoercer,
  nullSafe,
  HexColorSchema,
  type JxaExecutorOptions,
  type AppConnection,
  type AppConnectionOptions,
  type SpecifierStep,
  type Selector,
  type TypeCoercer,
  type HexColor,
  type JxaEnumValue,
} from '@macts/core'

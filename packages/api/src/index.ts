/**
 * @macts/api - HTTP API for macts
 * @packageDocumentation
 */

export { VERSION } from '@macts/core'

// Structured logging
export { createLogger, getLogger, setLogger } from './logger.js'

// API key management
export * from './keys/index.js'

// HTTP server
export {
  createServer,
  createMultiServer,
  createApp,
  DEFAULT_PORT,
  DEFAULT_HOST,
  type ServerOptions,
  type ServerInstance,
  type TlsOptions,
  type LoadedTlsOptions,
} from './server/index.js'

// Middleware
export {
  authMiddleware,
  createInFlightTracker,
  requirePermission,
  rpcPathToPermission,
  type AuthVariables,
  type AuthErrorCode,
  type AuthErrorResponse,
  type InFlightTracker,
  type PermissionErrorResponse,
  type PermissionMiddlewareOptions,
} from './server/middleware/index.js'

// RPC handlers
export {
  createRpcRouter,
  createMultiAppRpcRouter,
  type RpcRequest,
  type RpcSuccessResponse,
  type RpcErrorResponse,
  type RpcHandler,
  type RpcHandlerContext,
  type RpcEndpointInfo,
} from './server/handlers/index.js'

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

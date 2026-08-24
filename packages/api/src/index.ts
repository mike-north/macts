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
  requirePolicy,
  resolveGovernanceForRequest,
  type AuthVariables,
  type AuthErrorCode,
  type AuthErrorResponse,
  type InFlightTracker,
  type PermissionErrorResponse,
  type PermissionMiddlewareOptions,
  type GovernanceContext,
  type ResolvedGovernanceContext,
  type RequirePolicyOptions,
  type GovernanceDeniedResponse,
  type GovernancePendingResponse,
} from './server/middleware/index.js'

// Active governance policy loading
export {
  loadActivePolicy,
  getActivePolicyPath,
  ALLOW_ALL_POLICY,
  ActivePolicyError,
  type LoadActivePolicyOptions,
} from './server/governance/active-policy.js'

// Per-request resolution of the policy attached to an API key
export {
  createKeyPolicyResolver,
  createStoredKeyPolicyResolver,
  DEFAULT_KEY_POLICY_CACHE_TTL_MS,
  type KeyPolicyResolver,
  type KeyPolicyLoader,
  type CreateKeyPolicyResolverOptions,
} from './server/governance/key-policy.js'

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

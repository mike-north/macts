---
'@macts/api': minor
'@macts/runtime': minor
'@macts/contracts': minor
---

Serve the HTTP API through the shared runtime, with structured errors and rate limiting

**`@macts/api`** now composes `createRuntime` with a thin HTTP adapter. Every `POST /api/v1/rpc/<operation>` runs through the runtime's pipeline (verify the credential, admit against the rate limit, check permission, enforce governance, validate input, execute), so the HTTP server and every other surface enforce exactly the same checks.

- **`createHttpAdapter(runtime, options?)`** is the pure HTTP transport, mounted at `/api/v1` by `createServer`. It reads the JSON body (a missing or blank body is `{}`), the `Authorization: Bearer` credential, the request's abort signal, and an optional `X-Request-Id` correlation id. Unknown routes, including `POST /rpc/<unknown operation>`, are 404 `NOT_FOUND` and never reach the runtime.
- **Errors** are always `{ "error": { code, message, details } }` with the structured codes from `@macts/contracts`, so a client can rebuild the same error class with `fromWireErrorEnvelope`. `httpStatusForError(error)` gives the status for each code. Native failures are no longer collapsed into `EXECUTION_ERROR`: a missing target is 404 `TARGET_NOT_FOUND`, an unavailable app is 503 `APP_UNAVAILABLE`, a timeout is 504 `TIMEOUT`, and so on. An unexpected failure is a generic 500 `INTERNAL` that never repeats the underlying message. A confirm-first call with no approval provider is now 409 `APPROVAL_PENDING` instead of 202.
- **`ServerOptions`** gains `executor`, `verifier`, and `clientAddress`, so tests and alternate providers can compose the server without a Mac app or key store. `createApp` accepts every option except the listener ones.
- **Rate limiting** answers 429 `RATE_LIMITED` with a `Retry-After` header. The per-key limit (default 100 calls per minute) now runs in the runtime. A new per-client-address limit (default 300 requests per minute, `rateLimit.perAddress`) runs before the credential is checked, so failed authentication attempts are bounded too. `rateLimit: false` disables both. The `X-RateLimit-*` headers are no longer sent.
- `/health` reports the installed `@macts/api` version instead of a fixed `1.0.0`.
- Removed: `authMiddleware`, `requirePermission`, `rpcPathToPermission`, `requirePolicy`, `createRpcRouter`, `createMultiAppRpcRouter`, the server-only `createRateLimiter` middleware, and their response types (`AuthVariables`, `AuthErrorCode`, `AuthErrorResponse`, `PermissionErrorResponse`, `PermissionMiddlewareOptions`, `RequirePolicyOptions`, `GovernanceDeniedResponse`, `GovernancePendingResponse`, `GovernanceApprovalDeniedResponse`, `RpcRequest`, `RpcErrorResponse`, `RpcHandler`, `RpcHandlerContext`, `RpcEndpointInfo`, `RateLimiterInstance`). Error bodies are now typed by `WireErrorEnvelope`, re-exported from `@macts/contracts`.

**`@macts/runtime`** adds an optional admission step: `createRuntime({ rateLimiter })` admits each call by the verified key after authentication and before the permission check, raising `RateLimitedError` when the limit is exhausted. Admission never grants anything, and a limiter that fails denies the call with `InternalError`. `createRateLimiter({ max, windowMs })` is the in-memory fixed-window limiter.

**`@macts/contracts`** adds `RateLimitedError` (code `RATE_LIMITED`, details `{ retryAfterSeconds }`), with its registry entry and wire schema.

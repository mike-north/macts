/**
 * The HTTP adapter: macts operations over HTTP, as a pure transport over a
 * {@link MactsRuntime}.
 *
 * The adapter translates each HTTP request into one `runtime.invoke` call and
 * the outcome back into an HTTP response. It owns protocol concerns only:
 *
 * - routing `POST /rpc/<operation id>` for every registered operation, and
 *   nothing else under `/rpc/`;
 * - reading the JSON body, the bearer credential, the caller's abort signal,
 *   and a correlation id from the request;
 * - mapping canonical structured errors onto HTTP statuses and the
 *   `{ "error": { code, message, details } }` envelope (phases/13 D6);
 * - an optional per-client-address request limit, which protects the
 *   transport before any credential is examined.
 *
 * It never verifies a credential, checks a permission, evaluates policy, or
 * validates operation input: the runtime does all of that, identically for
 * every surface (phases/13 D5). The adapter never logs or returns the
 * credential, and never echoes the text of an unexpected failure.
 *
 * @packageDocumentation
 */

import { Hono, type Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
import type { Command } from '@macts/core'
import {
  InternalError,
  MactsError,
  OperationCancelledError,
  RateLimitedError,
  UnreachableError,
  ValidationError,
  toWireErrorEnvelope,
  type AnyMactsError,
  type Credential,
  type InvocationContext,
  type OperationId,
  type WireErrorEnvelope,
} from '@macts/contracts'
import {
  createBearerCredential,
  createRateLimiter,
  getLogger,
  type MactsRuntime,
  type RateLimiter,
  type RegisteredOperation,
  type RuntimeLogger,
} from '@macts/runtime'
import { withSpan } from '../telemetry.js'

/** The body of a successful operation response. */
export interface RpcSuccessResponse<T = unknown> {
  /** The operation's result in wire form. */
  result: T
}

/**
 * Resolves the network address of the client that sent a request, or
 * `undefined` when the request has no network peer.
 */
export type ClientAddressResolver = (c: Context) => string | undefined

/** Configuration for {@link createHttpAdapter}. */
export interface HttpAdapterOptions {
  /**
   * Destination for operator-side diagnostics about failed requests.
   *
   * @defaultValue the process-wide logger from `getLogger()`
   */
  readonly logger?: RuntimeLogger
  /**
   * Resolves the client address the per-address limit is keyed by.
   *
   * @defaultValue the socket's remote address under `@hono/node-server`, or
   *   the server's `requestIP` under Bun
   */
  readonly clientAddress?: ClientAddressResolver
  /**
   * Per-client-address limit applied to operation requests before the
   * credential is examined, or `false` for none.
   *
   * @remarks
   * Transport protection, not policy: the subject-keyed limit in the runtime
   * only counts calls whose credential verified, so without this limit
   * credential guessing would be unbounded. A request whose address cannot be
   * determined (such as an in-process `app.request`) is not counted, because
   * there is no peer to protect against.
   *
   * @defaultValue {@link DEFAULT_ADDRESS_RATE_LIMIT} requests per minute per address
   */
  readonly addressRateLimiter?: RateLimiter | false
}

/** Requests per minute admitted from one client address when no limit is configured. */
export const DEFAULT_ADDRESS_RATE_LIMIT = 300

/** Window of the default per-address limit: one minute. */
const ADDRESS_RATE_LIMIT_WINDOW_MS = 60_000

/**
 * HTTP status for a call the caller abandoned. Not a registered status: the
 * de facto "client closed request" code, recorded so a cancelled call is never
 * counted as a server error. The caller is usually gone and never sees it.
 */
const CLIENT_CLOSED_REQUEST = 499

/** Longest `X-Request-Id` accepted as a correlation id. */
const MAX_CORRELATION_ID_LENGTH = 128

/** Accepted correlation ids: visible ASCII with no spaces, bounded in length. */
const CORRELATION_ID_PATTERN = new RegExp(`^[\\x21-\\x7e]{1,${String(MAX_CORRELATION_ID_LENGTH)}}$`)

/** `Bearer <token>`, with the scheme matched case-insensitively (RFC 7235). */
const BEARER_AUTHORIZATION = /^Bearer +(\S+) *$/i

/** The message every unexpected failure is reported with; never the original text. */
const INTERNAL_ERROR_MESSAGE = 'Internal server error'

/**
 * The HTTP status for a canonical structured error, per the phases/13 D6
 * table.
 *
 * @remarks
 * `CANCELLED` maps to 499 ("client closed request"): the caller stopped
 * waiting, so this is neither a client nor a server error.
 * `TRANSPORT_FAILED` is client-only and never sent by a service; a server
 * that somehow holds one reports a generic internal failure, so it maps to
 * 500. Clients choose the error class from the envelope's `code`, never from
 * this status.
 *
 * @param error - Any structured error.
 * @returns The status the HTTP adapter responds with.
 */
export function httpStatusForError(error: AnyMactsError): number {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return 400
    case 'UNEXPECTED_VALUE':
      return 502
    case 'UNAUTHENTICATED':
      return 401
    case 'RATE_LIMITED':
      return 429
    case 'PERMISSION_DENIED':
      return 403
    case 'POLICY_DENIED':
      return 403
    case 'APPROVAL_PENDING':
      return 409
    case 'APPROVAL_REJECTED':
      return 403
    case 'TARGET_NOT_FOUND':
      return 404
    case 'FILE_NOT_FOUND':
      return 404
    case 'INVALID_SELECTION':
      return 400
    case 'APP_UNAVAILABLE':
      return 503
    case 'APP_AUTHORIZATION_REQUIRED':
      return 503
    case 'APP_OPERATION_FAILED':
      return 502
    case 'TIMEOUT':
      return 504
    case 'CANCELLED':
      return CLIENT_CLOSED_REQUEST
    case 'TRANSFER_FAILED':
      switch (error.details.reason) {
        case 'expired':
          return 410
        case 'too-large':
          return 413
        case 'incomplete':
        case 'unknown-transfer':
          return 400
        default:
          throw new UnreachableError(error.details.reason, 'transfer failure reason')
      }
    case 'INTERNAL':
      return 500
    case 'TRANSPORT_FAILED':
      return 500
    default:
      throw new UnreachableError(error, 'structured error')
  }
}

/**
 * The body of a route miss.
 *
 * @remarks
 * Deliberately outside the error registry: an unknown route means the client
 * and service disagree about the protocol, not that an operation failed, so
 * no canonical class describes it. A client decodes the unknown code `NOT_FOUND`
 * as a transport failure with reason `'protocol-mismatch'`. The message is
 * fixed and never echoes the requested path.
 */
const NOT_FOUND_BODY = {
  error: { code: 'NOT_FOUND', message: 'No such route.', details: {} },
} as const

/** A JSON response with an arbitrary status (499 is outside Hono's typed status set). */
function jsonResponse(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', ...headers },
  })
}

/** The 404 response for a request that matches no route. */
export function notFoundResponse(): Response {
  return jsonResponse(NOT_FOUND_BODY, 404)
}

/** The generic 500 response, carrying only the correlation id when there is one. */
export function internalErrorResponse(correlationId?: string): Response {
  const error = new InternalError(
    INTERNAL_ERROR_MESSAGE,
    correlationId === undefined ? {} : { correlationId }
  )
  return jsonResponse(toWireErrorEnvelope(error), 500)
}

/**
 * Fields that describe an unexpected failure in an operator log line.
 *
 * @remarks
 * Name, message, and stack only. Other own properties of an error (such as a
 * child process's captured standard error) are deliberately not logged.
 */
export function errorLogFields(error: unknown): Record<string, string | undefined> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { type: typeof error }
}

/**
 * Run one diagnostic log call, ignoring any failure of the logger itself: a
 * response must still be produced when logging is what broke.
 */
function logSafely(write: () => void): void {
  try {
    write()
  } catch {
    // Nothing more can be reported.
  }
}

/** Whether `error` is one of the canonical structured errors. */
function isMactsError(error: unknown): error is AnyMactsError {
  return error instanceof MactsError
}

/** What the adapter needs to turn a failure into a response. */
interface FailureContext {
  readonly logger: RuntimeLogger
  readonly operation?: OperationId | undefined
  readonly correlationId?: string | undefined
}

/**
 * The response for any failure: the error's own envelope and status when it is
 * a canonical wire error whose details encode, otherwise a generic internal
 * failure whose original is logged but never echoed.
 */
function failureResponse(error: unknown, context: FailureContext): Response {
  const { logger, operation, correlationId } = context
  if (!isMactsError(error)) {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), operation, correlationId },
        'Request failed unexpectedly'
      )
    })
    return internalErrorResponse(correlationId)
  }
  if (error.code === 'TRANSPORT_FAILED') {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), operation, correlationId },
        'A client-only transport failure reached the HTTP adapter'
      )
    })
    return internalErrorResponse(correlationId)
  }
  if (error.code === 'CANCELLED') {
    // The caller left; not a server failure.
    logSafely(() => {
      logger.info({ operation, correlationId }, 'Request cancelled by the caller')
    })
  }

  let envelope: WireErrorEnvelope
  try {
    envelope = toWireErrorEnvelope(error)
  } catch (encodeError) {
    // Details that violate their schema are a producer defect. The details
    // themselves are not logged: they failed the contract that keeps secrets
    // out of them.
    logSafely(() => {
      logger.error(
        { err: errorLogFields(encodeError), code: error.code, operation, correlationId },
        'A structured error could not be encoded for the wire'
      )
    })
    return internalErrorResponse(correlationId)
  }

  const headers =
    error.code === 'RATE_LIMITED'
      ? { 'Retry-After': String(error.details.retryAfterSeconds) }
      : undefined
  return jsonResponse(envelope, httpStatusForError(error), headers)
}

/** A server environment that can report a request's peer, as Bun's `Server` does. */
interface PeerAddressSource {
  requestIP(request: Request): unknown
}

/** Whether the request environment can report a request's peer address. */
function isPeerAddressSource(env: unknown): env is PeerAddressSource {
  return (
    typeof env === 'object' &&
    env !== null &&
    'requestIP' in env &&
    typeof env.requestIP === 'function'
  )
}

/**
 * The default client address: the socket's remote address under
 * `@hono/node-server`, or the server's `requestIP` under Bun.
 *
 * @returns The address, or `undefined` when the request has no network peer
 *   (an in-process `app.request`, or a runtime without connection info).
 */
export function defaultClientAddress(c: Context): string | undefined {
  const env: unknown = c.env
  if (isPeerAddressSource(env)) {
    // Bun.serve passes its Server as the environment.
    const peer = env.requestIP(c.req.raw)
    if (
      typeof peer === 'object' &&
      peer !== null &&
      'address' in peer &&
      typeof peer.address === 'string' &&
      peer.address.length > 0
    ) {
      return peer.address
    }
    return undefined
  }
  try {
    const address = getConnInfo(c).remote.address
    return address === undefined || address.length === 0 ? undefined : address
  } catch {
    // No Node socket on this request.
    return undefined
  }
}

/** The bearer credential presented in `Authorization`, or an empty one when none was. */
function readCredential(c: Context): Credential {
  const header = c.req.header('Authorization')
  const match = header === undefined ? null : BEARER_AUTHORIZATION.exec(header)
  // Anything but a well-formed bearer header presents no bearer credential;
  // the runtime reports that as a missing credential.
  return createBearerCredential(match?.[1] ?? '')
}

/** The caller's correlation id from `X-Request-Id`, when present and well-formed. */
function readCorrelationId(c: Context): string | undefined {
  const value = c.req.header('X-Request-Id')?.trim()
  return value !== undefined && CORRELATION_ID_PATTERN.test(value) ? value : undefined
}

/**
 * The request body as an operation input. A missing or blank body is `{}`.
 *
 * @throws `ValidationError` when the body is not valid JSON.
 */
async function readInput(c: Context): Promise<unknown> {
  const text = await c.req.text()
  if (text.trim().length === 0) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  } catch {
    throw new ValidationError('Request body must be valid JSON', {
      issues: [{ path: [], message: 'Request body must be valid JSON' }],
    })
  }
}

/** One endpoint in the introspection listing. */
interface IntrospectedEndpoint {
  readonly path: string
  readonly permission: string
  readonly method: 'POST'
}

/** One endpoint in a single app's detailed introspection listing. */
interface DetailedEndpoint extends IntrospectedEndpoint {
  readonly description: string
  readonly parameters: Command['parameters']
  readonly returns: Command['returns']
}

/** The registered operations of one app, in registration order. */
interface AppOperations {
  readonly app: string
  readonly bundleId: string
  readonly operations: readonly RegisteredOperation[]
}

/** The HTTP path an operation is served at, relative to the adapter's mount point. */
function operationPath(operation: RegisteredOperation): string {
  return `/rpc/${operation.descriptor.id}`
}

/** Group registered operations by the manifest that executes them, in registration order. */
function groupByApp(operations: readonly RegisteredOperation[]): AppOperations[] {
  const groups = new Map<RegisteredOperation['manifest'], RegisteredOperation[]>()
  for (const operation of operations) {
    const group = groups.get(operation.manifest)
    if (group === undefined) {
      groups.set(operation.manifest, [operation])
    } else {
      group.push(operation)
    }
  }
  return [...groups].map(([manifest, ops]) => ({
    app: manifest.app.name,
    bundleId: manifest.app.bundleId,
    operations: ops,
  }))
}

/** The summary listing entry for an operation. */
function summarize(operation: RegisteredOperation): IntrospectedEndpoint {
  return {
    path: operationPath(operation),
    permission: operation.descriptor.permission,
    method: 'POST',
  }
}

/** The detailed listing entry for an operation, from its manifest command. */
function detail(operation: RegisteredOperation): DetailedEndpoint {
  const { manifest, descriptor } = operation
  const command = Object.hasOwn(manifest.commands, descriptor.target.command)
    ? manifest.commands[descriptor.target.command]
    : undefined
  return {
    ...summarize(operation),
    description: command?.description ?? descriptor.description,
    parameters: command?.parameters ?? [],
    returns: command?.returns,
  }
}

/**
 * Build the HTTP transport for a runtime.
 *
 * @remarks
 * Registers, relative to wherever the returned app is mounted:
 *
 * - `POST /rpc/<id>` for each operation registered on the runtime when the
 *   adapter is built. The body is the operation's input record in wire form (a
 *   missing or blank body is `{}`); `Authorization: Bearer <token>` carries
 *   the credential; `X-Request-Id` optionally supplies the correlation id.
 *   Success is `200 { result }`; failure is the D6 error envelope with the
 *   status from {@link httpStatusForError}, plus `Retry-After` for
 *   `RATE_LIMITED`.
 * - `GET /introspect`: the first registered app's operations with their
 *   manifest descriptions, parameters, and return types.
 * - `GET /introspect/all`: every registered app's operations.
 *
 * Any other route, including `POST /rpc/<unregistered id>`, is a 404 whose
 * code `NOT_FOUND` is deliberately outside the error registry, and never
 * reaches the runtime. Operations registered on the runtime after this call
 * are not routed.
 *
 * @param runtime - The runtime that runs every operation.
 * @param options - Logger, client-address resolution, and the per-address limit.
 * @returns A Hono app to mount (the macts server mounts it at `/api/v1`).
 */
export function createHttpAdapter(runtime: MactsRuntime, options: HttpAdapterOptions = {}): Hono {
  const logger = (): RuntimeLogger => options.logger ?? getLogger()
  const clientAddress = options.clientAddress ?? defaultClientAddress
  const addressLimiter =
    options.addressRateLimiter === false
      ? undefined
      : (options.addressRateLimiter ??
        createRateLimiter({
          max: DEFAULT_ADDRESS_RATE_LIMIT,
          windowMs: ADDRESS_RATE_LIMIT_WINDOW_MS,
        }))

  /** The per-address denial for this request, if its address has exhausted its limit. */
  function admitAddress(c: Context): RateLimitedError | undefined {
    if (addressLimiter === undefined) return undefined
    const address = clientAddress(c)
    if (address === undefined) return undefined
    const admission = addressLimiter.admit(address)
    if (admission.allowed) return undefined
    return new RateLimitedError(
      `Too many requests from this client. Try again in ${String(admission.retryAfterSeconds)} seconds.`,
      { retryAfterSeconds: admission.retryAfterSeconds }
    )
  }

  // Routes and introspection share one snapshot, so the listing never names an
  // operation this adapter does not serve.
  const operations = runtime.operations()
  const apps = groupByApp(operations)
  const app = new Hono()

  for (const operation of operations) {
    const { id, target } = operation.descriptor
    const path = operationPath(operation)

    app.post(path, async (c) => {
      const correlationId = readCorrelationId(c)
      const signal = c.req.raw.signal
      try {
        const limited = admitAddress(c)
        if (limited !== undefined) {
          return failureResponse(limited, { logger: logger(), operation: id, correlationId })
        }

        const input = await readInput(c)
        const context: InvocationContext = {
          credential: readCredential(c),
          signal,
          ...(correlationId === undefined ? {} : { correlationId }),
        }

        const result = await withSpan('rpc.execute', async (span) => {
          span.setAttribute('rpc.operation', id)
          span.setAttribute('rpc.command', target.command)
          span.setAttribute('rpc.path', path)
          return runtime.invoke(id, input, context)
        })
        return c.json<RpcSuccessResponse>({ result })
      } catch (error) {
        // A body read that fails because the caller hung up is a cancellation,
        // not a server failure.
        const failure =
          !isMactsError(error) && signal.aborted
            ? new OperationCancelledError('The request was cancelled.', {}, { cause: error })
            : error
        return failureResponse(failure, { logger: logger(), operation: id, correlationId })
      }
    })
  }

  app.get('/introspect', (c) => {
    const first = apps[0]
    if (first === undefined) {
      return notFoundResponse()
    }
    return c.json({
      app: first.app,
      bundleId: first.bundleId,
      endpoints: first.operations.map(detail),
    })
  })

  app.get('/introspect/all', (c) =>
    c.json({
      apps: apps.map((group) => ({
        app: group.app,
        bundleId: group.bundleId,
        endpoints: group.operations.map(summarize),
      })),
    })
  )

  app.notFound(() => notFoundResponse())
  app.onError((error) => failureResponse(error, { logger: logger() }))

  return app
}

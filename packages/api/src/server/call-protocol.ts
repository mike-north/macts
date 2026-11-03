/**
 * The HTTP protocol shared by every route that runs a call through a
 * {@link MactsRuntime}: RPC operations (`/api/v1/rpc/<operation id>`) and
 * reference resolution (`/references/v1/resolve`).
 *
 * Each such route is a pure transport: it turns one request into one runtime
 * call and the outcome back into a response. This module holds what those
 * routes must do identically, so no route can drift from the others:
 *
 * - building the {@link InvocationContext} from a request: the bearer
 *   credential, the caller's abort signal, and a correlation id;
 * - reading the JSON body, refusing one that is not JSON;
 * - the optional per-client-address request limit, which protects the
 *   transport before any credential is examined;
 * - the success envelope `{ result }`, and mapping canonical structured errors
 *   onto HTTP statuses and the `{ "error": { code, message, details } }`
 *   envelope (phases/13 D6), with `WWW-Authenticate` on a 401 and
 *   `Retry-After` on a 429.
 *
 * Nothing here verifies a credential, checks a permission, evaluates policy,
 * or validates a call's input: the runtime does all of that (phases/13 D5).
 * Nothing here logs or returns the credential, or echoes the text of an
 * unexpected failure.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
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
  type WireErrorEnvelope,
  type WireValue,
} from '@macts/contracts'
import {
  createBearerCredential,
  createRateLimiter,
  getLogger,
  type RateLimiter,
  type RuntimeLogger,
} from '@macts/runtime'

/** The body of a successful runtime call: an operation result or a resolved reference. */
export interface RpcSuccessResponse<T = unknown> {
  /** The call's result in wire form. */
  result: T
}

/**
 * Resolves the network address of the client that sent a request, or
 * `undefined` when the request has no network peer.
 */
export type ClientAddressResolver = (c: Context) => string | undefined

/**
 * Configuration shared by the HTTP adapters that serve runtime calls
 * ({@link createHttpAdapter} and {@link createReferencesAdapter}).
 */
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
   * Per-client-address limit applied to requests before the credential is
   * examined, or `false` for none.
   *
   * @remarks
   * Transport protection, not policy: the subject-keyed limit in the runtime
   * only counts calls whose credential verified, so without this limit
   * credential guessing would be unbounded. A request whose address cannot be
   * determined (such as an in-process `app.request`) is not counted, because
   * there is no peer to protect against.
   *
   * Adapters given the same limiter share one budget per address, which is
   * how the macts server limits every runtime route together.
   *
   * @defaultValue {@link DEFAULT_ADDRESS_RATE_LIMIT} requests per minute per
   *   address, in a limiter of the adapter's own
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
 * The challenge sent with every 401: the bearer scheme, the only one macts
 * accepts (RFC 7235 §4.1 requires a challenge on a 401; RFC 6750 §3 defines
 * the scheme).
 */
const BEARER_CHALLENGE = 'Bearer'

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
 * @returns The status the HTTP adapters respond with.
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
    case 'COLLECTION_CHANGED':
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
export function isMactsError(error: unknown): error is AnyMactsError {
  return error instanceof MactsError
}

/**
 * What operator log lines say about the call a request carried: the operation
 * id for an RPC request, the call kind for a reference resolution. Never the
 * credential.
 */
export type CallLabels = Readonly<Record<string, string>>

/** What is needed to turn a failure into a response. */
export interface FailureContext {
  readonly logger: RuntimeLogger
  readonly labels?: CallLabels | undefined
  readonly correlationId?: string | undefined
}

/** The headers a failure's status calls for: a challenge on 401, a delay on 429. */
function failureHeaders(error: AnyMactsError): Record<string, string> | undefined {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      return { 'WWW-Authenticate': BEARER_CHALLENGE }
    case 'RATE_LIMITED':
      return { 'Retry-After': String(error.details.retryAfterSeconds) }
    default:
      return undefined
  }
}

/**
 * The response for any failure: the error's own envelope and status when it is
 * a canonical wire error whose details encode, otherwise a generic internal
 * failure whose original is logged but never echoed.
 */
export function failureResponse(error: unknown, context: FailureContext): Response {
  const { logger, labels, correlationId } = context
  if (!isMactsError(error)) {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), ...labels, correlationId },
        'Request failed unexpectedly'
      )
    })
    return internalErrorResponse(correlationId)
  }
  if (error.code === 'TRANSPORT_FAILED') {
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error), ...labels, correlationId },
        'A client-only transport failure reached the HTTP adapter'
      )
    })
    return internalErrorResponse(correlationId)
  }
  if (error.code === 'CANCELLED') {
    // The caller left; not a server failure.
    logSafely(() => {
      logger.info({ ...labels, correlationId }, 'Request cancelled by the caller')
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
        { err: errorLogFields(encodeError), code: error.code, ...labels, correlationId },
        'A structured error could not be encoded for the wire'
      )
    })
    return internalErrorResponse(correlationId)
  }

  return jsonResponse(envelope, httpStatusForError(error), failureHeaders(error))
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
 * The invocation context a request carries: its bearer credential, its abort
 * signal, and its correlation id when it has a well-formed one.
 *
 * @remarks
 * The one translation from HTTP request to runtime context (phases/13 D5), so
 * every runtime route presents the caller identically.
 */
function readInvocationContext(c: Context, correlationId: string | undefined): InvocationContext {
  return {
    credential: readCredential(c),
    signal: c.req.raw.signal,
    ...(correlationId === undefined ? {} : { correlationId }),
  }
}

/**
 * The request body parsed as JSON. A missing or blank body is `{}`.
 *
 * @throws `ValidationError` with one issue at the root when the body is not
 *   valid JSON (phases/13 D6, unreadable bodies).
 */
async function readJsonBody(c: Context): Promise<unknown> {
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

/**
 * The transport-level state an adapter shares across its requests: where it
 * logs and how it admits client addresses.
 */
export interface CallTransport {
  /** The logger for operator diagnostics, resolved at the time of use. */
  logger(): RuntimeLogger
  /** The per-address denial for this request, if its address has exhausted its limit. */
  admitAddress(c: Context): RateLimitedError | undefined
}

/**
 * Build the transport state an adapter's routes share, from the adapter's
 * options.
 */
export function createCallTransport(options: HttpAdapterOptions): CallTransport {
  const clientAddress = options.clientAddress ?? defaultClientAddress
  const addressLimiter =
    options.addressRateLimiter === false
      ? undefined
      : (options.addressRateLimiter ??
        createRateLimiter({
          max: DEFAULT_ADDRESS_RATE_LIMIT,
          windowMs: ADDRESS_RATE_LIMIT_WINDOW_MS,
        }))

  return {
    logger: () => options.logger ?? getLogger(),
    admitAddress(c) {
      if (addressLimiter === undefined) return undefined
      const address = clientAddress(c)
      if (address === undefined) return undefined
      const admission = addressLimiter.admit(address)
      if (admission.allowed) return undefined
      return new RateLimitedError(
        `Too many requests from this client. Try again in ${String(admission.retryAfterSeconds)} seconds.`,
        { retryAfterSeconds: admission.retryAfterSeconds }
      )
    },
  }
}

/**
 * Serve one runtime call over HTTP.
 *
 * @remarks
 * In order: the per-address limit, the JSON body, the invocation context, then
 * `call`. A result is answered `200 { result }`; any failure, including one
 * `call` raises before reaching the runtime, is answered by
 * {@link failureResponse}. A failure that is not a structured error and comes
 * after the caller hung up (such as a body read cut short) is a cancellation,
 * not a server failure.
 *
 * @param c - The request.
 * @param transport - The adapter's shared transport state.
 * @param labels - What log lines say about this call.
 * @param call - Runs the call: receives the parsed body and the invocation
 *   context, and returns the result in wire form.
 */
export async function serveRuntimeCall(
  c: Context,
  transport: CallTransport,
  labels: CallLabels,
  call: (body: unknown, context: InvocationContext) => Promise<WireValue>
): Promise<Response> {
  const correlationId = readCorrelationId(c)
  const signal = c.req.raw.signal
  try {
    const limited = transport.admitAddress(c)
    if (limited !== undefined) {
      return failureResponse(limited, { logger: transport.logger(), labels, correlationId })
    }

    const body = await readJsonBody(c)
    const result = await call(body, readInvocationContext(c, correlationId))
    return c.json<RpcSuccessResponse>({ result })
  } catch (error) {
    const failure =
      !isMactsError(error) && signal.aborted
        ? new OperationCancelledError('The request was cancelled.', {}, { cause: error })
        : error
    return failureResponse(failure, { logger: transport.logger(), labels, correlationId })
  }
}

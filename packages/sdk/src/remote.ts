/**
 * The remote client: runs an app's operations on a macts service over HTTP.
 *
 * Each call posts the encoded input to `<url>/api/v1/rpc/<operation id>` with
 * the client's token as a bearer credential. The service runs the same
 * invocation pipeline a local client does (verify the credential, check
 * permission, enforce governance, validate, execute); this module only carries
 * the call there and back and turns every outcome into the same canonical
 * results and errors a local call produces:
 *
 * - an error envelope becomes the class its code names, through
 *   `fromWireErrorEnvelope` (never chosen from the HTTP status);
 * - an abort becomes `OperationCancelledError`;
 * - a service that cannot be reached, or a response that is not a usable
 *   result or envelope, becomes `TransportError`.
 *
 * The token lives only in this module's closure. It is written into the
 * `Authorization` header and nowhere else: no error message, `details`, or
 * `cause` produced here contains it.
 *
 * This module depends only on `@macts/contracts`, so a remote client never
 * loads the Mac-side runtime or native execution.
 *
 * @packageDocumentation
 */

import {
  fromWireErrorEnvelope,
  OperationCancelledError,
  TransportError,
  type AppContract,
  type CallOptions,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import { createCodecClientRuntime } from './codec-runtime.js'

/** Options for a client that runs operations on a macts service. */
export interface RemoteClientOptions {
  /** The API key (`macts_sk_...`) every call is authorized with. */
  readonly token: string
  /**
   * The service root, for example `http://localhost:8372`. Operations are
   * posted to `<url>/api/v1/rpc/<operation id>`.
   */
  readonly url: string | URL
  /**
   * The `fetch` implementation requests are sent with. A composition point for
   * tests and custom transports.
   *
   * @defaultValue `globalThis.fetch`
   */
  readonly fetch?: typeof globalThis.fetch
}

/** Path, under the service root, that operations are posted beneath. */
const RPC_PATH = 'api/v1/rpc'

/**
 * Characters a bearer token may contain: visible ASCII. Anything else cannot
 * be sent in a header, and the error `fetch` would raise for it repeats the
 * header value.
 */
const HEADER_SAFE_TOKEN = /^[\x21-\x7e]*$/

/** How many links of a `cause` chain are checked for the token. */
const MAX_CAUSE_DEPTH = 8

/** Whether `value` is a plain record (not `null`, not an array). */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse the service root once, at client construction.
 *
 * @throws `TypeError` when `url` is not an absolute URL.
 */
function parseServiceRoot(url: string | URL): URL {
  const root = new URL(url)
  root.search = ''
  root.hash = ''
  return root
}

/** The endpoint an operation is posted to, beneath the service root. */
function rpcEndpoint(root: URL, operation: OperationId): URL {
  const endpoint = new URL(root)
  endpoint.pathname = `${root.pathname.replace(/\/+$/, '')}/${RPC_PATH}/${encodeURIComponent(operation)}`
  return endpoint
}

/**
 * Whether `value`, or anything in its `cause` chain, mentions `secret` in its
 * text.
 *
 * @remarks
 * A failure raised by `fetch` (or an injected replacement) is third-party
 * text. Before such a failure is kept as a `cause`, it is checked, so an
 * implementation that echoes the request's headers cannot carry the token out
 * of the client.
 */
function mentionsSecret(value: unknown, secret: string): boolean {
  let current: unknown = value
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined; depth++) {
    if (current instanceof Error) {
      if (current.message.includes(secret) || (current.stack ?? '').includes(secret)) {
        return true
      }
      current = current.cause
    } else if (typeof current === 'string') {
      return current.includes(secret)
    } else {
      // Anything else is checked in its serialized form; a value that cannot
      // be serialized cannot be shown to be safe, so it is treated as unsafe.
      try {
        // `JSON.stringify` yields `undefined` for functions and symbols.
        const serialized: unknown = JSON.stringify(current)
        return typeof serialized !== 'string' || serialized.includes(secret)
      } catch {
        return true
      }
    }
  }
  return false
}

/**
 * Create a client for one app that runs its operations on a macts service.
 *
 * @remarks
 * The client never loads the app manifest or any Mac-side code; the service
 * holds the manifest and enforces every check. Every method resolves to the
 * operation's SDK result or throws a canonical structured error from
 * `@macts/contracts`, exactly as the local client does. Values are validated
 * on the way out (`ValidationError`, before any request is sent) and on the way
 * back (`UnexpectedValueError`).
 *
 * @example
 * ```typescript
 * import { createClient, resolveClientOptions, TargetNotFoundError } from '@macts/sdk'
 * import { calendarContract } from '@macts/calendar/contract'
 *
 * const calendar = createClient(calendarContract, resolveClientOptions())
 * try {
 *   await calendar.events.get({ uid: 'missing' })
 * } catch (error) {
 *   if (error instanceof TargetNotFoundError) console.log('No such event')
 *   else throw error
 * }
 * ```
 *
 * @param app - The app's generated contract.
 * @param options - The token, the service root, and an optional `fetch`.
 * @returns The app's client.
 * @throws `TypeError` when `url` is not an absolute URL or `token` contains
 *   characters that cannot be sent in a header.
 */
export function createClient<Client>(
  app: AppContract<Client>,
  options: RemoteClientOptions
): Client {
  const { token } = options
  if (!HEADER_SAFE_TOKEN.test(token)) {
    throw new TypeError('The token contains characters that cannot be sent in a request header.')
  }
  const root = parseServiceRoot(options.url)
  // The global is looked up per call, never detached from `globalThis`, so it
  // keeps its receiver and a later replacement of the global is honored.
  const send: typeof globalThis.fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init))

  /**
   * The failure for a request whose `fetch` rejected: a cancellation when the
   * caller aborted, otherwise an unreachable service. The rejection is kept as
   * the cause only when it does not mention the token.
   */
  function requestFailed(error: unknown, signal: AbortSignal | undefined): Error {
    if (signal?.aborted === true) {
      return new OperationCancelledError('The operation was cancelled.', {})
    }
    return new TransportError(
      'The macts service could not be reached.',
      { reason: 'unreachable' },
      mentionsSecret(error, token) ? undefined : { cause: error }
    )
  }

  /** The failure for a response that is neither a usable result nor an error envelope. */
  function invalidResponse(message: string, status: number): TransportError {
    return new TransportError(message, { reason: 'invalid-response', status })
  }

  async function transport(
    operation: OperationId,
    input: WireValue,
    callOptions: CallOptions | undefined
  ): Promise<unknown> {
    const signal = callOptions?.signal
    let response: Response
    try {
      response = await send(rpcEndpoint(root, operation), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        ...(signal === undefined ? {} : { signal }),
      })
    } catch (error) {
      throw requestFailed(error, signal)
    }

    let text: string
    try {
      text = await response.text()
    } catch (error) {
      if (signal?.aborted === true) {
        throw new OperationCancelledError('The operation was cancelled.', {})
      }
      throw new TransportError(
        'The response from the macts service could not be read.',
        { reason: 'invalid-response', status: response.status },
        mentionsSecret(error, token) ? undefined : { cause: error }
      )
    }

    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      throw response.ok
        ? invalidResponse('The macts service sent a result that is not JSON.', response.status)
        : invalidResponse('The macts service sent an error that is not JSON.', response.status)
    }

    if (!response.ok) {
      throw fromWireErrorEnvelope(body, { status: response.status })
    }
    if (!isRecord(body) || !Object.hasOwn(body, 'result')) {
      throw invalidResponse('The macts service sent a response without a result.', response.status)
    }
    return body['result']
  }

  return app.bind(createCodecClientRuntime(transport))
}

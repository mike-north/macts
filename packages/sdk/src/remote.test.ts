/**
 * Unit tests for the remote client, with an injected `fetch`.
 *
 * Expected requests, values, and errors are hand-written from phases/13:
 *
 * - D2: `invoke` encodes the input, runs the operation under the client's
 *   credential, and decodes the result; encode failures are
 *   `ValidationError`, client-side decode failures `UnexpectedValueError`.
 * - D3: the integer wire form `{ "integer": "7" }` decodes to `7`.
 * - D6: the error class comes from the envelope's code through the registry,
 *   never from the HTTP status; an unknown code is a `TransportError` with
 *   reason `'protocol-mismatch'`; `TransportError` is client-side only; no
 *   error message or `details` ever contains a credential.
 * - D11: client `encode` runs before any network call.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2, D3, D6, D11)
 */

import { inspect } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AuthenticationError,
  InternalError,
  MactsError,
  OperationCancelledError,
  RateLimitedError,
  TargetNotFoundError,
  TransportError,
  UnexpectedValueError,
  ValidationError,
  type ValueType,
} from '@macts/contracts'
import { createClient, type RemoteClientOptions } from './remote.js'
import {
  GET,
  SPROCKET_WIRE,
  fixtureContract,
  rejection,
  type FixtureClient,
  type Widget,
} from './test-helpers.js'

const TOKEN = 'macts_sk_remote-token-must-never-leak'
const URL_ROOT = 'http://localhost:8372'

/** One request the fake `fetch` received. */
interface RecordedRequest {
  readonly url: string
  readonly init: RequestInit
}

/** A fake `fetch` that records requests and answers with `respond`. */
function fakeFetch(respond: (request: RecordedRequest) => Promise<Response> | Response): {
  readonly fetch: typeof globalThis.fetch
  readonly requests: RecordedRequest[]
} {
  const requests: RecordedRequest[] = []
  const fetch: typeof globalThis.fetch = (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input)
    const request = { url, init }
    requests.push(request)
    return Promise.resolve(respond(request))
  }
  return { fetch, requests }
}

/** A JSON response with `status`. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** A fixture client over `fetch`. */
function client(
  fetch: typeof globalThis.fetch,
  options: Partial<RemoteClientOptions> = {}
): FixtureClient {
  return createClient(fixtureContract(), { token: TOKEN, url: URL_ROOT, fetch, ...options })
}

/**
 * Assert that the token appears nowhere a caller, logger, or serializer could
 * read it from an error: its string form, its JSON form, its inspected form,
 * and every link of its cause chain.
 */
function expectNoToken(error: unknown): void {
  expect(String(error)).not.toContain(TOKEN)
  expect(JSON.stringify(error)).not.toContain(TOKEN)
  expect(inspect(error, { depth: Infinity, showHidden: true })).not.toContain(TOKEN)
  let current: unknown = error
  for (let depth = 0; current !== undefined && depth < 16; depth++) {
    expect(inspect(current)).not.toContain(TOKEN)
    if (current instanceof Error) {
      expect(current.message).not.toContain(TOKEN)
      expect(current.stack ?? '').not.toContain(TOKEN)
      current = current.cause
    } else {
      current = undefined
    }
  }
}

describe('remote client: request', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the encoded input to <url>/api/v1/rpc/<id> with bearer auth and JSON content', async () => {
    const { fetch, requests } = fakeFetch(() => json({ result: SPROCKET_WIRE }))

    await client(fetch).widgets.get('w-1')

    expect(requests).toHaveLength(1)
    const [request] = requests
    expect(request?.url).toBe('http://localhost:8372/api/v1/rpc/fixture.widgets.get')
    expect(request?.init.method).toBe('POST')
    expect(request?.init.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    })
    expect(request?.init.body).toBe('{"id":"w-1"}')
    expect(request?.init).not.toHaveProperty('signal')
  })

  it('passes the caller signal to fetch', async () => {
    const { fetch, requests } = fakeFetch(() => json({ result: [] }))
    const controller = new AbortController()

    await client(fetch).widgets.list({ signal: controller.signal })

    expect(requests[0]?.init.signal).toBe(controller.signal)
    expect(requests[0]?.init.body).toBe('{}')
    expect(requests[0]?.url).toBe('http://localhost:8372/api/v1/rpc/fixture.widgets.list')
  })

  it.each([
    [
      'a trailing slash',
      'http://localhost:8372/',
      'http://localhost:8372/api/v1/rpc/fixture.widgets.list',
    ],
    [
      'a path prefix',
      'https://mac.example/macts',
      'https://mac.example/macts/api/v1/rpc/fixture.widgets.list',
    ],
    [
      'a path prefix with a trailing slash',
      'https://mac.example/macts/',
      'https://mac.example/macts/api/v1/rpc/fixture.widgets.list',
    ],
    [
      'a URL object',
      new URL('http://127.0.0.1:9000'),
      'http://127.0.0.1:9000/api/v1/rpc/fixture.widgets.list',
    ],
  ])('joins the RPC path onto a service root with %s', async (_label, url, expected) => {
    const { fetch, requests } = fakeFetch(() => json({ result: [] }))

    await client(fetch, { url }).widgets.list()

    expect(requests[0]?.url).toBe(expected)
  })

  it('uses the global fetch when none is injected', async () => {
    const { fetch, requests } = fakeFetch(() => json({ result: [] }))
    vi.stubGlobal('fetch', fetch)

    await createClient(fixtureContract(), { token: TOKEN, url: URL_ROOT }).widgets.list()

    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('http://localhost:8372/api/v1/rpc/fixture.widgets.list')
  })

  it('refuses a service URL that is not absolute, at construction', () => {
    const { fetch } = fakeFetch(() => json({ result: [] }))
    expect(() => client(fetch, { url: 'localhost:8372/' })).not.toThrow()
    expect(() => client(fetch, { url: '/relative/only' })).toThrow(TypeError)
  })

  it('refuses a token that cannot be sent in a header, at construction, without repeating it', () => {
    const { fetch } = fakeFetch(() => json({ result: [] }))
    const badToken = `${TOKEN}\r\nX-Injected: yes`

    let thrown: unknown
    try {
      createClient(fixtureContract(), { token: badToken, url: URL_ROOT, fetch })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(TypeError)
    expect(String(thrown)).not.toContain(TOKEN)
  })
})

describe('remote client: values', () => {
  it('decodes a 2xx result through the output contract', async () => {
    const { fetch } = fakeFetch(() => json({ result: SPROCKET_WIRE }))

    const widget: Widget = await client(fetch).widgets.get('w-1')

    // D3: {"integer":"7"} decodes to the number 7.
    expect(widget).toEqual({ name: 'Sprocket', count: 7 })
  })

  it('rejects an input that fails its contract with ValidationError, sending nothing', async () => {
    const { fetch, requests } = fakeFetch(() => json({ result: SPROCKET_WIRE }))

    const error = await rejection(client(fetch).widgets.get(''))

    expect(error).toBeInstanceOf(ValidationError)
    if (!(error instanceof ValidationError)) return
    expect(error.details.issues).toHaveLength(1)
    expect(error.details.issues[0]?.path).toEqual(['id'])
    expect(requests).toHaveLength(0)
  })

  it('rejects an input that bypassed the static types with ValidationError, sending nothing', async () => {
    const { fetch, requests } = fakeFetch(() => json({ result: SPROCKET_WIRE }))

    const error = await rejection(client(fetch).widgets.get(42 as unknown as string))

    expect(error).toBeInstanceOf(ValidationError)
    expect(requests).toHaveLength(0)
  })

  it('rejects a 2xx result that fails its contract with UnexpectedValueError', async () => {
    // A bare JSON number where D3 requires an integer control record.
    const { fetch } = fakeFetch(() => json({ result: { name: 'Sprocket', count: 7 } }))

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.details.issues[0]?.path).toEqual(['count'])
  })

  it('rejects a result element that fails its contract, locating it in the list', async () => {
    const { fetch } = fakeFetch(() =>
      json({ result: [SPROCKET_WIRE, { name: 'Cog', count: { integer: '007' } }] })
    )

    const error = await rejection(client(fetch).widgets.list())

    expect(error).toBeInstanceOf(UnexpectedValueError)
    if (!(error instanceof UnexpectedValueError)) return
    expect(error.details.issues[0]?.path).toEqual([1, 'count'])
  })

  it('refuses file values in a result with InternalError', async () => {
    const filing: ValueType<Widget> = {
      ...GET.output,
      decode: (wire, context) => ({
        ok: true,
        value: context.bindFile(wire as never) as unknown as Widget,
      }),
    }
    const { fetch } = fakeFetch(() => json({ result: SPROCKET_WIRE }))
    const contract = fixtureContract({ get: { ...GET, output: filing } })

    const error = await rejection(
      createClient(contract, { token: TOKEN, url: URL_ROOT, fetch }).widgets.get('w-1')
    )

    expect(error).toBeInstanceOf(InternalError)
    expect(error).toMatchObject({ message: 'This client does not support file values.' })
  })

  it('turns a codec that throws into InternalError, keeping the cause locally', async () => {
    const cause = new Error('generated codec defect')
    const throwing: ValueType<Widget> = {
      ...GET.output,
      decode: () => {
        throw cause
      },
    }
    const { fetch } = fakeFetch(() => json({ result: SPROCKET_WIRE }))
    const contract = fixtureContract({ get: { ...GET, output: throwing } })

    const error = await rejection(
      createClient(contract, { token: TOKEN, url: URL_ROOT, fetch }).widgets.get('w-1')
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).not.toContain('generated codec defect')
    expect(error.cause).toBe(cause)
  })
})

describe('remote client: error envelopes', () => {
  it.each([
    {
      code: 'TARGET_NOT_FOUND',
      status: 404,
      details: { resource: 'Widget' },
      errorClass: TargetNotFoundError,
    },
    {
      code: 'UNAUTHENTICATED',
      status: 401,
      details: { reason: 'revoked' },
      errorClass: AuthenticationError,
    },
    {
      code: 'RATE_LIMITED',
      status: 429,
      details: { retryAfterSeconds: 30 },
      errorClass: RateLimitedError,
    },
    {
      code: 'INTERNAL',
      status: 500,
      details: { correlationId: 'req-9' },
      errorClass: InternalError,
    },
  ])('reconstructs $code ($status) as its canonical class with its details', async (row) => {
    const message = `Service says ${row.code}`
    const { fetch } = fakeFetch(() =>
      json({ error: { code: row.code, message, details: row.details } }, row.status)
    )

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(row.errorClass)
    expect(error).toBeInstanceOf(MactsError)
    expect(error).toMatchObject({ code: row.code, message, details: row.details })
  })

  it('chooses the class from the code, not the status', async () => {
    const { fetch } = fakeFetch(() =>
      json({ error: { code: 'TARGET_NOT_FOUND', message: 'gone', details: {} } }, 500)
    )

    expect(await rejection(client(fetch).widgets.get('w-1'))).toBeInstanceOf(TargetNotFoundError)
  })

  it('reports an unknown code as a protocol mismatch carrying the code and status', async () => {
    // D6: a route miss is NOT_FOUND, deliberately outside the registry.
    const { fetch } = fakeFetch(() =>
      json({ error: { code: 'NOT_FOUND', message: 'No route', details: {} } }, 404)
    )

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({
      details: { reason: 'protocol-mismatch', status: 404, receivedCode: 'NOT_FOUND' },
    })
  })

  it('reports a non-JSON error response as an invalid response with its status', async () => {
    const { fetch } = fakeFetch(
      () =>
        new Response('<html>Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        })
    )

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({ details: { reason: 'invalid-response', status: 502 } })
  })

  it('reports a non-JSON 2xx response as an invalid response', async () => {
    const { fetch } = fakeFetch(() => new Response('ok', { status: 200 }))

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({ details: { reason: 'invalid-response', status: 200 } })
  })

  it.each([
    ['an object without result', { value: SPROCKET_WIRE }],
    ['an array', [SPROCKET_WIRE]],
    ['null', null],
  ])('reports a 2xx JSON body that is %s as an invalid response', async (_label, body) => {
    const { fetch } = fakeFetch(() => json(body))

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({ details: { reason: 'invalid-response' } })
  })
})

describe('remote client: transport failures', () => {
  it('reports a fetch rejection as an unreachable service, keeping the cause', async () => {
    const cause = new TypeError('fetch failed')
    const fetch: typeof globalThis.fetch = () => Promise.reject(cause)

    const error = await rejection(client(fetch).widgets.get('w-1'))

    expect(error).toBeInstanceOf(TransportError)
    expect(error).toMatchObject({ details: { reason: 'unreachable' } })
    expect((error as TransportError).cause).toBe(cause)
  })

  it('reports an abort during the request as OperationCancelledError', async () => {
    const controller = new AbortController()
    const fetch: typeof globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('This operation was aborted', 'AbortError'))
        })
      })

    const pending = client(fetch).widgets.get('w-1', { signal: controller.signal })
    controller.abort()

    expect(await rejection(pending)).toBeInstanceOf(OperationCancelledError)
  })

  it('reports an already-aborted signal as OperationCancelledError', async () => {
    const fetch: typeof globalThis.fetch = () =>
      Promise.reject(new DOMException('This operation was aborted', 'AbortError'))

    const error = await rejection(client(fetch).widgets.get('w-1', { signal: AbortSignal.abort() }))

    expect(error).toBeInstanceOf(OperationCancelledError)
  })

  it('reports an abort while reading the body as OperationCancelledError', async () => {
    const controller = new AbortController()
    // A response whose body is still arriving when the caller aborts.
    const pendingBody = {
      ok: true,
      status: 200,
      text: () =>
        new Promise<string>((_resolve, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new DOMException('This operation was aborted', 'AbortError'))
          })
        }),
    } as unknown as Response
    const { fetch } = fakeFetch(() => pendingBody)

    const pending = client(fetch).widgets.get('w-1', { signal: controller.signal })
    // Let the response arrive, so the abort lands while its body is pending.
    await new Promise((resolve) => setTimeout(resolve, 0))
    controller.abort()

    expect(await rejection(pending)).toBeInstanceOf(OperationCancelledError)
  })
})

describe('remote client: the token never leaks', () => {
  const failures: readonly [string, () => typeof globalThis.fetch][] = [
    [
      'an error envelope',
      () =>
        fakeFetch(() =>
          json({ error: { code: 'TARGET_NOT_FOUND', message: 'gone', details: {} } }, 404)
        ).fetch,
    ],
    [
      'an unknown code',
      () =>
        fakeFetch(() => json({ error: { code: 'NOPE', message: 'x', details: {} } }, 418)).fetch,
    ],
    ['a non-JSON error', () => fakeFetch(() => new Response('bad gateway', { status: 502 })).fetch],
    ['a result without a result field', () => fakeFetch(() => json({})).fetch],
    ['a result that fails decoding', () => fakeFetch(() => json({ result: { name: 1 } })).fetch],
    ['an unreachable service', () => () => Promise.reject(new TypeError('fetch failed'))],
    ['an abort', () => () => Promise.reject(new DOMException('aborted', 'AbortError'))],
    [
      'a fetch failure that echoes the request headers',
      () => (_input, init) =>
        Promise.reject(
          new Error('request failed', {
            cause: new Error(`headers were ${JSON.stringify(init?.headers)}`),
          })
        ),
    ],
    [
      'a fetch failure that is a plain object holding the request',
      () => (_input, init) =>
        // A non-Error rejection, as a custom transport might produce.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        Promise.reject({ failed: true, headers: init?.headers }),
    ],
    [
      'a body read failure that echoes the token',
      () => () =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.reject(new Error(`stream broke for Bearer ${TOKEN}`)),
        } as unknown as Response),
    ],
  ]

  it.each(failures)('for %s', async (_label, makeFetch) => {
    const error = await rejection(client(makeFetch()).widgets.get('w-1'))

    expect(error).toBeInstanceOf(MactsError)
    expectNoToken(error)
  })

  it('for an input that fails validation', async () => {
    const { fetch } = fakeFetch(() => json({ result: SPROCKET_WIRE }))
    expectNoToken(await rejection(client(fetch).widgets.get('')))
  })
})

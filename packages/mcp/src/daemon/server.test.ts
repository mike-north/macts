/**
 * Tests for the MCP daemon HTTP server.
 *
 * The daemon is a transport over an `McpAdapter`. Most tests here serve an
 * adapter built over a stub runtime that records each call's credential, and
 * verify bearers with a fake verifier, so they exercise only what the daemon
 * owns: transport-level authentication, the structured 401 envelope, and
 * carrying each request's bearer to the tool calls that request makes. The
 * last group uses the default verifier over a real key store in a temporary
 * `MACTS_HOME`, so the refusal reasons are the key validator's own.
 *
 * Expected values are written by hand from the decision record:
 *
 * - phases/13 D6: a refusal is `{ "error": { code, message, details } }`; an
 *   unusable credential is `UNAUTHENTICATED` with `details.reason` one of
 *   `missing`, `malformed`, `invalid`, `expired`, `revoked`; an unexpected
 *   failure is a generic `INTERNAL` that never echoes its text. A tool result
 *   is `{ "result": … }`.
 * - phases/13 A1, D5: every call carries a token, and authority derives from
 *   that token alone; the key-store verifier's messages are fixed per reason
 *   (`packages/runtime/src/invocation/verifier.ts`).
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (A1, D5, D6)
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
 * @see https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse
 * @see https://datatracker.ietf.org/doc/html/rfc6750#section-3
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import * as http from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { CallToolResultSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { AuthenticationError, type Authority } from '@macts/contracts'
import type { CredentialVerifier } from '@macts/runtime'
import { createMcpAdapter } from '../adapter/adapter.js'
import {
  createRecordingLogger,
  createStubRuntime,
  fakeOperation,
  type StubRuntime,
} from '../adapter/test-helpers.js'
import { createDaemon, type DaemonOptions, type DaemonServer } from './server.js'

/**
 * `StreamableHTTPClientTransport`/`SSEClientTransport` declare `sessionId`/
 * `onclose`/`onerror` as get/set accessor pairs typed to allow `undefined`,
 * rather than the plain optional fields `Transport` declares them as. Under
 * `exactOptionalPropertyTypes` those are structurally incompatible even
 * though both classes fully implement `Transport` at runtime - this is the
 * same upstream SDK typing gap documented next to the equivalent server-side
 * cast in `./server.ts`.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated -- accepting the deprecated SSEClientTransport is required to exercise the legacy transport in tests
function asTransport(transport: StreamableHTTPClientTransport | SSEClientTransport): Transport {
  return transport as unknown as Transport
}

/** The one operation the stub runtime serves, and its tool name. */
const LIST = fakeOperation('notes.notes.list')
const LIST_TOOL = 'macts__notes__notes_list'

/** Two keys the fake verifier recognizes, with different subjects. */
const ALICE_TOKEN = 'tok-alice-0123456789'
const BOB_TOKEN = 'tok-bob-0123456789'
const AUTHORITIES: Readonly<Record<string, Authority>> = {
  [ALICE_TOKEN]: { subject: 'key-alice', permissions: ['notes:notes:list'] },
  [BOB_TOKEN]: { subject: 'key-bob', permissions: ['notes:accounts:list'] },
}

/** The envelope for a request with no usable bearer, from the verifier's fixed message. */
const MISSING_CREDENTIAL_BODY = {
  error: {
    code: 'UNAUTHENTICATED',
    message: 'No credential was presented.',
    details: { reason: 'missing' },
  },
}

/**
 * A verifier that recognizes {@link AUTHORITIES}, with the key-store
 * verifier's reasons and messages for an empty or unknown secret.
 */
const fakeVerifier: CredentialVerifier = {
  verify(credential) {
    const secret = credential.reveal()
    if (secret.length === 0) {
      return Promise.reject(
        new AuthenticationError('No credential was presented.', { reason: 'missing' })
      )
    }
    const authority = Object.hasOwn(AUTHORITIES, secret) ? AUTHORITIES[secret] : undefined
    return authority === undefined
      ? Promise.reject(
          new AuthenticationError('The credential could not be verified.', { reason: 'invalid' })
        )
      : Promise.resolve(authority)
  },
}

/** A stub runtime whose result names the bearer each call was invoked under. */
function createCredentialEchoRuntime(): StubRuntime {
  return createStubRuntime([LIST], (call) =>
    Promise.resolve({ invokedWith: call.context.credential.reveal() })
  )
}

/** The JSON document in a tool result's only text content. */
function documentOf(result: CallToolResult): unknown {
  const [first] = result.content
  if (first?.type !== 'text') throw new Error('Expected one text content item')
  return JSON.parse(first.text)
}

/** Make a raw HTTP request over a Unix domain socket. */
function requestOverSocket(
  socketPath: string,
  options: { path: string; method: string; headers?: Record<string, string> }
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath, path: options.path, method: options.method, headers: options.headers },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString('utf-8')
        })
        res.on('end', () => {
          resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body: data })
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/** A Streamable HTTP client that presents `token` on every request. */
async function connectStreamable(
  baseUrl: string,
  token: string
): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  })
  const client = new Client({ name: `client-${token}`, version: '1.0.0' })
  await client.connect(asTransport(transport))
  return { client, transport }
}

/** A legacy SSE client that presents `token` on the stream and every message. */
async function connectSse(baseUrl: string, token: string): Promise<Client> {
  const authHeaders = { Authorization: `Bearer ${token}` }
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- exercising the deprecated legacy SSE transport is the point of these tests
  const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`), {
    eventSourceInit: {
      fetch: (input, init) =>
        fetch(input, { ...init, headers: { ...init.headers, ...authHeaders } }),
    },
    requestInit: { headers: authHeaders },
  })
  const client = new Client({ name: `sse-client-${token}`, version: '1.0.0' })
  await client.connect(asTransport(transport))
  return client
}

/** Call the list tool and return its result, validated as a tool result. */
async function callList(client: Client): Promise<CallToolResult> {
  return CallToolResultSchema.parse(await client.callTool({ name: LIST_TOOL, arguments: {} }))
}

/**
 * Per-test state: a temporary `MACTS_HOME` (the PID file and default socket
 * live there) and the daemons started.
 */
let originalMactsHome: string | undefined
const tempDirs: string[] = []
const daemons: DaemonServer[] = []

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

/**
 * Load fresh copies of `@macts/runtime` and `./server.js`, so the key store
 * resolves under the current `MACTS_HOME`. Only the key-store tests need this:
 * a fresh copy also has its own error classes, which a statically imported
 * fake verifier's errors would not be instances of.
 */
async function loadModules(): Promise<{
  runtime: typeof import('@macts/runtime')
  createDaemon: (options: DaemonOptions) => DaemonServer
}> {
  vi.resetModules()
  const runtime = await import('@macts/runtime')
  const serverModule = await import('./server.js')
  return { runtime, createDaemon: serverModule.createDaemon }
}

/** Start a TCP daemon on an ephemeral port and return it with its base URL. */
async function startTcpDaemon(
  options: Omit<DaemonOptions, 'socketPath' | 'port'>
): Promise<{ daemon: DaemonServer; baseUrl: string }> {
  const daemon = createDaemon({
    ...options,
    socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
    port: 0,
  })
  await daemon.start()
  daemons.push(daemon)
  const address = daemon.httpServer?.address() as AddressInfo
  return { daemon, baseUrl: `http://127.0.0.1:${String(address.port)}` }
}

beforeEach(() => {
  originalMactsHome = process.env['MACTS_HOME']
  process.env['MACTS_HOME'] = makeTempDir('macts-mcp-daemon-')
})

afterEach(async () => {
  for (const daemon of daemons.splice(0)) {
    try {
      await daemon.stop()
    } catch {
      // Ignore errors during cleanup
    }
  }
  if (originalMactsHome === undefined) {
    delete process.env['MACTS_HOME']
  } else {
    process.env['MACTS_HOME'] = originalMactsHome
  }
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('createDaemon lifecycle', () => {
  it('is not running and has no HTTP server until started', async () => {
    const daemon = createDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
      socketPath: join(makeTempDir('macts-test-daemon-'), 'mcp.sock'),
      port: 0,
    })

    expect(daemon.isRunning()).toBe(false)
    expect(daemon.httpServer).toBeNull()
    await expect(daemon.stop()).resolves.toBeUndefined()
  })

  it('reports the configured server name and version to clients', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
      name: 'custom-daemon',
      version: '1.2.3',
    })

    const { client } = await connectStreamable(baseUrl, ALICE_TOKEN)

    expect(client.getServerVersion()).toMatchObject({ name: 'custom-daemon', version: '1.2.3' })
    await client.close()
  })
})

describe('createDaemon: GET /health', () => {
  it('answers without authentication and counts the served tools', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const res = await fetch(`${baseUrl}/health`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', tools: 1 })
  })
})

describe('createDaemon: transport-level authentication', () => {
  it.each([
    { route: '/mcp', method: 'POST' },
    { route: '/mcp', method: 'GET' },
    { route: '/sse', method: 'GET' },
    { route: '/message?sessionId=any', method: 'POST' },
  ])(
    'refuses $method $route without a bearer with 401 and the UNAUTHENTICATED envelope',
    async ({ route, method }) => {
      const { baseUrl } = await startTcpDaemon({
        adapter: createMcpAdapter(createCredentialEchoRuntime()),
        verifier: fakeVerifier,
      })

      const res = await fetch(`${baseUrl}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(401)
      expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
      expect(await res.json()).toEqual(MISSING_CREDENTIAL_BODY)
    }
  )

  it('treats an Authorization header with another scheme as no bearer at all', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: `Basic ${ALICE_TOKEN}`, 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(MISSING_CREDENTIAL_BODY)
  })

  it('refuses an unrecognized bearer with the verifier reason, never echoing the token', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer tok-nobody-0123456789',
        'Content-Type': 'application/json',
      },
    })
    const text = await res.text()

    expect(res.status).toBe(401)
    expect(JSON.parse(text)).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'The credential could not be verified.',
        details: { reason: 'invalid' },
      },
    })
    expect(text).not.toContain('tok-nobody')
  })

  it('fails closed with a generic 500 INTERNAL when verification itself fails', async () => {
    const { logger, entries } = createRecordingLogger()
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: { verify: () => Promise.reject(new Error('key store unreadable: secret-detail')) },
      logger,
    })

    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE_TOKEN}`, 'Content-Type': 'application/json' },
    })
    const text = await res.text()

    expect(res.status).toBe(500)
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error', details: {} },
    })
    expect(text).not.toContain('secret-detail')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.level).toBe('error')
  })

  it('enforces authentication over the Unix socket transport too', async () => {
    const socketPath = join(makeTempDir('macts-test-daemon-unix-'), 'mcp.sock')
    const daemon = createDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
      socketPath,
    })
    await daemon.start()
    daemons.push(daemon)

    const res = await requestOverSocket(socketPath, { path: '/mcp', method: 'POST' })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body)).toEqual(MISSING_CREDENTIAL_BODY)
  })
})

describe('createDaemon: each request governs its own calls', () => {
  it('invokes each Streamable HTTP client’s calls under that client’s bearer', async () => {
    const runtime = createCredentialEchoRuntime()
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(runtime),
      verifier: fakeVerifier,
    })

    const alice = await connectStreamable(baseUrl, ALICE_TOKEN)
    const bob = await connectStreamable(baseUrl, BOB_TOKEN)

    const [aliceResult, bobResult] = await Promise.all([
      callList(alice.client),
      callList(bob.client),
    ])

    expect(documentOf(aliceResult)).toEqual({ result: { invokedWith: ALICE_TOKEN } })
    expect(documentOf(bobResult)).toEqual({ result: { invokedWith: BOB_TOKEN } })
    expect(runtime.calls.map((call) => call.id)).toEqual(['notes.notes.list', 'notes.notes.list'])

    await alice.client.close()
    await bob.client.close()
  })

  it('invokes each legacy SSE client’s calls under that client’s bearer', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const alice = await connectSse(baseUrl, ALICE_TOKEN)
    const bob = await connectSse(baseUrl, BOB_TOKEN)

    expect(documentOf(await callList(alice))).toEqual({ result: { invokedWith: ALICE_TOKEN } })
    expect(documentOf(await callList(bob))).toEqual({ result: { invokedWith: BOB_TOKEN } })

    await alice.close()
    await bob.close()
  })

  it('lists the adapter’s tools to an authenticated client', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const { client } = await connectStreamable(baseUrl, ALICE_TOKEN)
    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name)).toEqual([LIST_TOOL])
    await client.close()
  })
})

describe('createDaemon: sessions and routes', () => {
  it('terminates a Streamable HTTP session on DELETE', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })
    const { client, transport } = await connectStreamable(baseUrl, ALICE_TOKEN)
    const sessionId = transport.sessionId
    expect(sessionId).toBeDefined()

    await transport.terminateSession()

    // A request against the terminated session is an unknown session (404),
    // proving DELETE tore it down server-side rather than only closing the client.
    const followUp = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ALICE_TOKEN}`,
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId ?? '',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 99 }),
    })
    expect(followUp.status).toBe(404)

    await client.close()
  })

  it('answers POST /message for an unknown SSE session with a 404 JSON-RPC error', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const res = await fetch(`${baseUrl}/message?sessionId=does-not-exist`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ALICE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
    })

    expect(res.status).toBe(404)
    const body = (await res.json()) as { jsonrpc: string; error: { message: string } }
    expect(body.jsonrpc).toBe('2.0')
    expect(body.error.message).toMatch(/session/i)
  })

  it('answers an unrecognized path with 404 NOT_FOUND', async () => {
    const { baseUrl } = await startTcpDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      verifier: fakeVerifier,
    })

    const res = await fetch(`${baseUrl}/nope`, {
      headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    })

    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('createDaemon: the default verifier over the key store', () => {
  /** Start a daemon with the default verifier and mint keys in the same home. */
  async function startWithKeyStore(): Promise<{
    runtime: typeof import('@macts/runtime')
    baseUrl: string
  }> {
    const { runtime, createDaemon: createFreshDaemon } = await loadModules()
    const daemon = createFreshDaemon({
      adapter: createMcpAdapter(createCredentialEchoRuntime()),
      socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
      port: 0,
    })
    await daemon.start()
    daemons.push(daemon)
    const address = daemon.httpServer?.address() as AddressInfo
    return { runtime, baseUrl: `http://127.0.0.1:${String(address.port)}` }
  }

  /** POST /mcp with `token` and return the status and decoded body. */
  async function postWith(baseUrl: string, token: string): Promise<[number, unknown]> {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    return [res.status, await res.json()]
  }

  it('refuses a tampered key with reason "invalid"', async () => {
    const { runtime, baseUrl } = await startWithKeyStore()
    const { token } = await runtime.createApiKey({
      name: 'tamper-test',
      permissions: ['notes:notes:list'],
    })

    expect(await postWith(baseUrl, token.slice(0, -5) + 'xxxxx')).toEqual([
      401,
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The credential could not be verified.',
          details: { reason: 'invalid' },
        },
      },
    ])
  })

  it('refuses an expired key with reason "expired"', async () => {
    const { runtime, baseUrl } = await startWithKeyStore()
    const { token } = await runtime.createApiKey({
      name: 'expired-test',
      permissions: ['notes:notes:list'],
      expires: -1,
    })

    expect(await postWith(baseUrl, token)).toEqual([
      401,
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The credential has expired.',
          details: { reason: 'expired' },
        },
      },
    ])
  })

  it('refuses a revoked key with reason "revoked"', async () => {
    const { runtime, baseUrl } = await startWithKeyStore()
    const { token, keyId } = await runtime.createApiKey({
      name: 'revoked-test',
      permissions: ['notes:notes:list'],
    })
    runtime.revokeKey(keyId)

    expect(await postWith(baseUrl, token)).toEqual([
      401,
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The credential has been revoked.',
          details: { reason: 'revoked' },
        },
      },
    ])
  })

  it('refuses a token that is not a macts key with reason "malformed"', async () => {
    const { baseUrl } = await startWithKeyStore()

    expect(await postWith(baseUrl, 'not-a-macts-key')).toEqual([
      401,
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The credential is not a well-formed macts API key.',
          details: { reason: 'malformed' },
        },
      },
    ])
  })

  it('admits a valid key and carries it to the tool call', async () => {
    const { runtime, baseUrl } = await startWithKeyStore()
    const { token } = await runtime.createApiKey({
      name: 'valid-test',
      permissions: ['notes:notes:list'],
    })

    const { client } = await connectStreamable(baseUrl, token)

    expect(documentOf(await callList(client))).toEqual({ result: { invokedWith: token } })
    await client.close()
  })
})

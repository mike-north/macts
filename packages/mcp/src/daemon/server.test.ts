/**
 * Tests for the MCP daemon HTTP server.
 *
 * The auth-enforcement and transport-round-trip tests below need real API
 * keys, which `@macts/api/keys` resolves against `MACTS_HOME` at
 * module-load time. So — mirroring `../auth.test.ts` — each such test points
 * `MACTS_HOME` at a fresh temp directory and re-imports `@macts/api/keys`
 * and `./server.js` via `vi.resetModules()` before use.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
 * @see https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createDaemon, type DaemonServer, type DaemonOptions } from './server.js'
import type { McpPlugin } from '../types.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import * as http from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

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

/** Build a plugin with a single, trivially-verifiable tool. */
function makeTestPlugin(): McpPlugin {
  return {
    name: 'test',
    description: 'Test plugin',
    tools: [
      {
        name: 'macts__test__foo',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => Promise.resolve({ result: 'ok' }),
      },
    ],
  }
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

describe('createDaemon', () => {
  let daemon: DaemonServer | null = null

  // Use a unique test directory for each test run
  const testDir = join(tmpdir(), `macts-test-daemon-${randomBytes(8).toString('hex')}`)

  afterEach(async () => {
    // Clean up daemon after each test
    if (daemon) {
      try {
        await daemon.stop()
      } catch {
        // Ignore errors during cleanup
      }
      daemon = null
    }

    // Clean up test directory
    try {
      const pidFile = join(testDir, 'mcp.pid')
      const socketPath = join(testDir, 'mcp.sock')
      if (existsSync(pidFile)) {
        unlinkSync(pidFile)
      }
      if (existsSync(socketPath)) {
        unlinkSync(socketPath)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('initialization', () => {
    it('should create a daemon with no plugins', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0, // Use TCP for tests
      })

      expect(daemon).toBeDefined()
      expect(daemon.isRunning()).toBe(false)
    })

    it('should create a daemon with plugins', () => {
      const mockPlugin: McpPlugin = {
        name: 'test',
        description: 'Test plugin',
        tools: [
          {
            name: 'macts__test__foo',
            description: 'Test tool',
            inputSchema: { type: 'object' },
            handler: async () => Promise.resolve({ result: 'ok' }),
          },
        ],
      }

      daemon = createDaemon({
        plugins: [mockPlugin],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0, // Use TCP for tests
      })

      expect(daemon).toBeDefined()
      expect(daemon.isRunning()).toBe(false)
    })

    it('should reject duplicate tool names', () => {
      const tool = {
        name: 'macts__test__foo',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => Promise.resolve({ result: 'ok' }),
      }

      const plugin1: McpPlugin = {
        name: 'test1',
        description: 'Test plugin 1',
        tools: [tool],
      }

      const plugin2: McpPlugin = {
        name: 'test2',
        description: 'Test plugin 2',
        tools: [tool],
      }

      expect(() =>
        createDaemon({
          plugins: [plugin1, plugin2],
          socketPath: join(testDir, 'mcp.sock'),
          port: 0, // Use TCP for tests
        })
      ).toThrow('Duplicate tool name')
    })
  })

  describe('lifecycle', () => {
    it('should handle stop when not running', async () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
      })

      // Should not throw
      await expect(daemon.stop()).resolves.toBeUndefined()
    })

    it('should expose httpServer property', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
      })

      expect(daemon.httpServer).toBeNull()
    })
  })

  describe('custom options', () => {
    it('should use custom server name and version', () => {
      daemon = createDaemon({
        plugins: [],
        socketPath: join(testDir, 'mcp.sock'),
        port: 0,
        name: 'custom-daemon',
        version: '1.2.3',
      })

      expect(daemon).toBeDefined()
    })
  })
})

describe('createDaemon HTTP routes', () => {
  let originalMactsHome: string | undefined
  const tempDirs: string[] = []
  let daemon: DaemonServer | null = null

  /** Create a fresh temp directory, tracked for cleanup in `afterEach`. */
  function makeTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix))
    tempDirs.push(dir)
    return dir
  }

  /** Load fresh copies of `@macts/api/keys` and `./server.js` under the current env. */
  async function loadModules(): Promise<{
    keys: typeof import('@macts/api/keys')
    createDaemon: (options: DaemonOptions) => DaemonServer
  }> {
    vi.resetModules()
    const keys = await import('@macts/api/keys')
    const serverModule = await import('./server.js')
    return { keys, createDaemon: serverModule.createDaemon }
  }

  /** Start a TCP daemon and return its base URL. */
  async function startTcpDaemon(options: Omit<DaemonOptions, 'socketPath' | 'port'>): Promise<{
    daemon: DaemonServer
    baseUrl: string
  }> {
    const { createDaemon: create } = await loadModules()
    const created = create({
      ...options,
      socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
      port: 0,
    })
    await created.start()
    daemon = created
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- httpServer is guaranteed non-null immediately after a successful start()
    const port = (created.httpServer!.address() as AddressInfo).port
    return { daemon: created, baseUrl: `http://127.0.0.1:${String(port)}` }
  }

  beforeEach(() => {
    originalMactsHome = process.env['MACTS_HOME']
    process.env['MACTS_HOME'] = makeTempDir('macts-mcp-daemon-auth-')
  })

  afterEach(async () => {
    if (daemon) {
      try {
        await daemon.stop()
      } catch {
        // Ignore errors during cleanup
      }
      daemon = null
    }

    if (originalMactsHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalMactsHome
    }

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()
      if (dir) {
        try {
          rmSync(dir, { recursive: true, force: true })
        } catch {
          // Ignore cleanup errors.
        }
      }
    }
  })

  describe('GET /health', () => {
    it('responds 200 without authentication, even with validation enabled', async () => {
      const { baseUrl } = await startTcpDaemon({ plugins: [makeTestPlugin()] })

      const res = await fetch(`${baseUrl}/health`)

      expect(res.status).toBe(200)
      const body = (await res.json()) as { status: string; plugins: number }
      expect(body.status).toBe('ok')
      expect(body.plugins).toBe(1)
    })
  })

  describe('auth enforcement', () => {
    it.each([
      { route: '/mcp', method: 'POST' },
      { route: '/sse', method: 'GET' },
      { route: '/message?sessionId=any', method: 'POST' },
    ])(
      'rejects $method $route with 401 and MISSING_AUTHORIZATION when no header is present',
      async ({ route, method }) => {
        const { baseUrl } = await startTcpDaemon({ plugins: [makeTestPlugin()] })

        const res = await fetch(`${baseUrl}${route}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
        })

        expect(res.status).toBe(401)
        expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
        const body = (await res.json()) as { error: { code: string } }
        expect(body.error.code).toBe('MISSING_AUTHORIZATION')
      }
    )

    it('rejects /mcp with INVALID_SIGNATURE for a tampered token', async () => {
      const { keys, baseUrl } = await (async () => {
        const modules = await loadModules()
        const created = modules.createDaemon({
          plugins: [makeTestPlugin()],
          socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
          port: 0,
        })
        await created.start()
        daemon = created
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const port = (created.httpServer!.address() as AddressInfo).port
        return { keys: modules.keys, baseUrl: `http://127.0.0.1:${String(port)}` }
      })()

      const { token } = await keys.createApiKey({
        name: 'tamper-test',
        permissions: ['calendar:events:list'],
      })
      const tampered = token.slice(0, -5) + 'xxxxx'

      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tampered}`, 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('INVALID_SIGNATURE')
    })

    it('rejects /mcp with EXPIRED for an expired token', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token } = await modules.keys.createApiKey(
        { name: 'expired-test', permissions: ['calendar:events:list'], expires: -1 },
        undefined
      )

      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('EXPIRED')
    })

    it('rejects /mcp with REVOKED for a revoked token', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token, keyId } = await modules.keys.createApiKey({
        name: 'revoked-test',
        permissions: ['calendar:events:list'],
      })
      modules.keys.revokeKey(keyId)

      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(401)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('REVOKED')
    })

    it('enforces auth over the Unix socket transport too', async () => {
      const modules = await loadModules()
      const socketPath = join(makeTempDir('macts-test-daemon-unix-'), 'mcp.sock')
      const created = modules.createDaemon({ plugins: [makeTestPlugin()], socketPath })
      await created.start()
      daemon = created

      const res = await requestOverSocket(socketPath, { path: '/mcp', method: 'POST' })

      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.body) as { error: { code: string } }
      expect(body.error.code).toBe('MISSING_AUTHORIZATION')
    })
  })

  describe('POST /message', () => {
    it('returns 404 JSON for an unknown sessionId', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token } = await modules.keys.createApiKey({
        name: 'message-test',
        permissions: ['calendar:events:list'],
      })

      const res = await fetch(`${baseUrl}/message?sessionId=does-not-exist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      })

      expect(res.status).toBe(404)
      const body = (await res.json()) as {
        jsonrpc: string
        error: { code: number; message: string }
      }
      expect(body.jsonrpc).toBe('2.0')
      expect(body.error.message).toMatch(/session/i)
    })
  })

  describe('unknown routes', () => {
    it('returns 404 JSON for an unrecognized path', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token } = await modules.keys.createApiKey({
        name: 'unknown-route-test',
        permissions: ['calendar:events:list'],
      })

      const res = await fetch(`${baseUrl}/nope`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(404)
      const body = (await res.json()) as { error: { code: string } }
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('Streamable HTTP transport (/mcp)', () => {
    it('completes initialize -> tools/list -> tools/call, and DELETE terminates the session', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token } = await modules.keys.createApiKey({
        name: 'streamable-test',
        permissions: ['calendar:events:list'],
      })

      const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      })
      const client = new Client({ name: 'test-client', version: '1.0.0' })

      await client.connect(asTransport(transport))

      const tools = await client.listTools()
      expect(tools.tools.some((tool) => tool.name === 'macts__test__foo')).toBe(true)

      const result = await client.callTool({ name: 'macts__test__foo', arguments: {} })
      expect(result.isError).not.toBe(true)
      expect(transport.sessionId).toBeDefined()

      await transport.terminateSession()

      // A subsequent request against the now-terminated session must be
      // rejected as an unknown session (404), proving DELETE actually tore
      // it down server-side rather than only closing the client.
      const followUp = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- sessionId is defined once initialized, asserted above
          'Mcp-Session-Id': transport.sessionId!,
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 99 }),
      })
      expect(followUp.status).toBe(404)

      await client.close()
    })

    it('succeeds without an Authorization header when disableApiKeyValidation is true', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
        disableApiKeyValidation: true,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`))
      const client = new Client({ name: 'test-client-no-auth', version: '1.0.0' })

      await client.connect(asTransport(transport))
      const tools = await client.listTools()
      expect(tools.tools.some((tool) => tool.name === 'macts__test__foo')).toBe(true)

      await client.close()
    })
  })

  describe('legacy SSE transport (/sse + /message)', () => {
    it('regression: POST /message previously returned a hardcoded 404 - initialize and tools/list must now succeed', async () => {
      const modules = await loadModules()
      const created = modules.createDaemon({
        plugins: [makeTestPlugin()],
        socketPath: join(makeTempDir('macts-test-daemon-tcp-'), 'mcp.sock'),
        port: 0,
      })
      await created.start()
      daemon = created
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const port = (created.httpServer!.address() as AddressInfo).port
      const baseUrl = `http://127.0.0.1:${String(port)}`

      const { token } = await modules.keys.createApiKey({
        name: 'sse-test',
        permissions: ['calendar:events:list'],
      })
      const authHeaders = { Authorization: `Bearer ${token}` }

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- exercising the deprecated legacy SSE transport is the point of this regression test
      const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`), {
        eventSourceInit: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              headers: { ...init.headers, ...authHeaders },
            }),
        },
        requestInit: { headers: authHeaders },
      })
      const client = new Client({ name: 'test-client-sse', version: '1.0.0' })

      await client.connect(asTransport(transport))

      const tools = await client.listTools()
      expect(tools.tools.some((tool) => tool.name === 'macts__test__foo')).toBe(true)

      const result = await client.callTool({ name: 'macts__test__foo', arguments: {} })
      expect(result.isError).not.toBe(true)

      await client.close()
    })
  })
})

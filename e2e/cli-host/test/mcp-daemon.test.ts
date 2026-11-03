/**
 * UAT: the MCP HTTP daemon (`macts mcp serve`) governs every tool call by the
 * bearer of the request that carried it.
 *
 * The real built CLI runs `macts mcp serve --port <ephemeral>` as a
 * subprocess in a temporary macts home holding the real built Notes packages,
 * with `MACTS_TEST_EXECUTOR=stub`. Two keys with different grants are minted
 * by the CLI into the same home, and two real MCP clients connect over
 * Streamable HTTP, each presenting its own key.
 *
 * Expected values are hand-derived:
 *
 * - From the Notes contract: `notes.notes.list` requires `notes:notes:list`
 *   and targets command `list` on resource `Note`; its tool is
 *   `macts__notes__notes_list`.
 * - From phases/13 A1 and D5: authority derives from the token of each
 *   invocation, so on one daemon the key holding the permission is granted
 *   and the other is denied on the same tool.
 * - From phases/13 D6: a refused request is answered 401 with
 *   `{ "error": { "code": "UNAUTHENTICATED", "message", "details": { "reason" } } }`,
 *   the same envelope as the HTTP API; the key-store verifier's message for
 *   no credential is "No credential was presented."
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (A1, A7, D5, D6)
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
 * @see https://github.com/mike-north/macts/issues/101
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  callTool,
  connectMcpHttp,
  createKey,
  createMactsHome,
  freePort,
  startMcpDaemon,
  toolDocument,
  type MactsHome,
  type McpDaemonProcess,
  type McpSession,
  writePolicyFile,
} from '../src/harness.js'

/** Minting keys and starting the daemon spawns several Node processes. */
const SETUP_TIMEOUT_MS = 90_000

const LIST_TOOL = 'macts__notes__notes_list'

let home: MactsHome
let daemon: McpDaemonProcess
let granted: McpSession
let denied: McpSession

beforeAll(async () => {
  home = createMactsHome()
  const grantedToken = await createKey(home, 'notes:notes:list')
  const otherToken = await createKey(home, 'notes:accounts:list')
  daemon = await startMcpDaemon(home, await freePort(), { MACTS_TEST_EXECUTOR: 'stub' })
  granted = await connectMcpHttp(daemon.url, grantedToken)
  denied = await connectMcpHttp(daemon.url, otherToken)
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  await granted.close()
  await denied.close()
  await daemon.stop()
  home.dispose()
})

describe('macts mcp serve (UAT): startup', () => {
  it('reports the installed app, the executor, and the tool count on stderr', () => {
    expect(daemon.stderr()).toContain('Serving 2 app(s):\n  notes\n  reminders\n')
    expect(daemon.stderr()).toContain('Executor: test-stub\n')
    expect(daemon.stderr()).toMatch(/Serving \d+ tool\(s\)\n/)
  })
})

describe('macts mcp serve (UAT): each request’s bearer governs its own calls', () => {
  it('grants the key holding the permission', async () => {
    const result = await callTool(granted, LIST_TOOL, {})

    expect(result.isError).toBeUndefined()
    // The stub executor answers a list with an empty page, as an app with no
    // notes would; nothing remains, so no continuation line follows.
    expect(toolDocument(result)).toEqual({ result: { items: [] } })
  })

  it('denies the other key on the same tool of the same daemon', async () => {
    const result = await callTool(denied, LIST_TOOL, {})

    expect(result.isError).toBe(true)
    expect(toolDocument(result)).toMatchObject({
      error: { code: 'PERMISSION_DENIED', details: { required: 'notes:notes:list' } },
    })
  })

  it('keeps each client’s grant when their calls interleave', async () => {
    const [grantedResult, deniedResult] = await Promise.all([
      callTool(granted, LIST_TOOL, {}),
      callTool(denied, LIST_TOOL, {}),
    ])

    expect(grantedResult.isError).toBeUndefined()
    expect(deniedResult.isError).toBe(true)
  })
})

describe('macts mcp serve (UAT): transport authentication', () => {
  it('answers a request without a bearer with the D6 401 envelope', async () => {
    const res = await fetch(`${daemon.url}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })

    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
    expect(await res.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'No credential was presented.',
        details: { reason: 'missing' },
      },
    })
  })

  it('answers the health check without a bearer', async () => {
    const res = await fetch(`${daemon.url}/health`)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok' })
  })
})

describe('macts mcp serve (UAT): governance fails closed', () => {
  it(
    'answers every call with INTERNAL, never reaching the executor, when the policy file is malformed',
    async () => {
      const broken = createMactsHome()
      let brokenDaemon: McpDaemonProcess | undefined
      let session: McpSession | undefined
      try {
        const token = await createKey(broken, 'notes:notes:list')
        writePolicyFile(broken, '{ this is not json')
        brokenDaemon = await startMcpDaemon(broken, await freePort(), {
          MACTS_TEST_EXECUTOR: 'stub',
        })
        session = await connectMcpHttp(brokenDaemon.url, token)

        const result = await callTool(session, LIST_TOOL, {})

        // The same outcome as over stdio: the HTTP transport adds no path that
        // fails open.
        expect(result.isError).toBe(true)
        expect(toolDocument(result)).toEqual({
          error: { code: 'INTERNAL', message: 'Governance could not be loaded.', details: {} },
        })
      } finally {
        await session?.close()
        await brokenDaemon?.stop()
        broken.dispose()
      }
    },
    SETUP_TIMEOUT_MS
  )
})

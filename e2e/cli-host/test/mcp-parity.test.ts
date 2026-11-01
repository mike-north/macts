/**
 * UAT: the HTTP API and both MCP transports return the same structured error
 * for the same call.
 *
 * One temporary macts home holds the real built Notes packages and two keys
 * minted by the CLI: one holding `notes:notes:list`, one holding only
 * `notes:accounts:list`. Three real hosts run in it with
 * `MACTS_TEST_EXECUTOR=stub`: `macts --serve` (HTTP API), `macts --mcp`
 * (stdio, one process per key, as an MCP client starts it), and
 * `macts mcp serve` (HTTP daemon). Each failure is decoded from its transport
 * to the wire envelope, `{ "error": { code, message, details } }`, then
 * reconstructed with the shared codec, and compared there: never the HTTP
 * status, the MCP `isError` flag, or any other transport wrapping.
 *
 * Expected values are hand-derived from the Notes contract and phases/13:
 *
 * - `notes.notes.list` takes an empty strict record, so `{ "bogus": 1 }` is a
 *   `VALIDATION_FAILED` with one `unrecognized_keys` issue at the root (D2,
 *   D6), exactly as the HTTP UAT asserts.
 * - A key without `notes:notes:list` is `PERMISSION_DENIED`, whose details
 *   name the required permission (D5, D6).
 * - A9 parity acceptance: every surface answers the same call with the same
 *   code, message, and details.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (A9, D2, D5, D6)
 * @see https://github.com/mike-north/macts/issues/101
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fromWireErrorEnvelope, toWireError, type WireError } from '@macts/contracts'
import {
  callTool,
  connectMcpHttp,
  connectMcpStdio,
  createKey,
  createMactsHome,
  freePort,
  startMcpDaemon,
  startServe,
  toolDocument,
  type MactsHome,
  type McpDaemonProcess,
  type McpSession,
  type ServeProcess,
} from '../src/harness.js'

/** Minting keys and starting four hosts spawns several Node processes. */
const SETUP_TIMEOUT_MS = 120_000

const OPERATION = 'notes.notes.list'
const TOOL = 'macts__notes__notes_list'

/** The keys, by what they hold. */
type KeyName = 'granted' | 'other'

let home: MactsHome
let api: ServeProcess
let daemon: McpDaemonProcess
let tokens: Record<KeyName, string>
const stdio = new Map<KeyName, McpSession>()
const http = new Map<KeyName, McpSession>()

beforeAll(async () => {
  home = createMactsHome()
  tokens = {
    granted: await createKey(home, 'notes:notes:list'),
    other: await createKey(home, 'notes:accounts:list'),
  }
  const env = { MACTS_TEST_EXECUTOR: 'stub' }
  ;[api, daemon] = await Promise.all([
    startServe(home, await freePort(), env),
    startMcpDaemon(home, await freePort(), env),
  ])
  for (const key of ['granted', 'other'] as const) {
    stdio.set(key, await connectMcpStdio(home, { ...env, MACTS_API_KEY: tokens[key] }))
    http.set(key, await connectMcpHttp(daemon.url, tokens[key]))
  }
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  for (const session of [...stdio.values(), ...http.values()]) await session.close()
  await api.stop()
  await daemon.stop()
  home.dispose()
})

/**
 * The wire error in a decoded envelope, after reconstruction by the shared
 * codec: proof that the envelope is a well-formed canonical error, in the
 * form every surface is compared in.
 */
function decoded(envelope: unknown): WireError {
  const error = fromWireErrorEnvelope(envelope)
  if (error.code === 'TRANSPORT_FAILED') {
    throw new Error(`Not a canonical error envelope: ${JSON.stringify(envelope)}`)
  }
  return toWireError(error)
}

/** The decoded failure of the call over the HTTP API. */
async function viaHttpApi(key: KeyName, input: unknown): Promise<WireError> {
  const res = await fetch(`${api.url}/api/v1/rpc/${OPERATION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[key]}` },
    body: JSON.stringify(input),
  })
  return decoded(await res.json())
}

/** The decoded failure of the call over an MCP session. */
async function viaMcp(
  sessions: Map<KeyName, McpSession>,
  key: KeyName,
  input: Record<string, unknown>
): Promise<WireError> {
  const session = sessions.get(key)
  if (session === undefined) throw new Error(`No session for ${key}`)
  const result = await callTool(session, TOOL, input)
  expect(result.isError).toBe(true)
  return decoded(toolDocument(result))
}

describe('error parity across the HTTP API, MCP stdio, and the MCP daemon (UAT)', () => {
  it('returns the same VALIDATION_FAILED for the same invalid input', async () => {
    const input = { bogus: 1 }
    const fromApi = await viaHttpApi('granted', input)

    expect(fromApi).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Operation input failed validation.',
      details: {
        issues: [{ path: [], code: 'unrecognized_keys', message: 'Unrecognized key: "bogus"' }],
      },
    })
    expect(await viaMcp(stdio, 'granted', input)).toEqual(fromApi)
    expect(await viaMcp(http, 'granted', input)).toEqual(fromApi)
  })

  it('returns the same PERMISSION_DENIED for the same denied key', async () => {
    const fromApi = await viaHttpApi('other', {})

    expect(fromApi).toMatchObject({
      code: 'PERMISSION_DENIED',
      details: { required: 'notes:notes:list' },
    })
    expect(await viaMcp(stdio, 'other', {})).toEqual(fromApi)
    expect(await viaMcp(http, 'other', {})).toEqual(fromApi)
  })
})

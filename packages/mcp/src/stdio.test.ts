/**
 * Unit tests for the stdio MCP server, over in-memory streams.
 *
 * The client side is written by hand as newline-delimited JSON-RPC, the stdio
 * transport's framing, so these tests see exactly the bytes a client would.
 * The runtime is a stub that records each call's credential. Expected values
 * are written by hand:
 *
 * - phases/13 D5: a stdio session presents the credential configured for it
 *   on every tool call; it does not rely on a startup-only check.
 * - phases/13 D6: a tool result is `{ "result": … }` as text content.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio
 */

import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import { createBearerCredential } from '@macts/runtime'
import { createMcpAdapter } from './adapter/adapter.js'
import { createStubRuntime, fakeOperation } from './adapter/test-helpers.js'
import { startStdioServer, type StdioServer } from './stdio.js'

const TOKEN = 'tok-stdio-0123456789'

/** A client speaking newline-delimited JSON-RPC to a server's streams. */
interface LineClient {
  readonly input: PassThrough
  readonly output: PassThrough
  /** Send one request and resolve with the response that carries its id. */
  request(id: number, method: string, params: unknown): Promise<unknown>
}

function createLineClient(): LineClient {
  const input = new PassThrough()
  const output = new PassThrough()
  const pending = new Map<number, (message: unknown) => void>()
  let buffer = ''
  output.setEncoding('utf-8').on('data', (chunk: string) => {
    buffer += chunk
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      const message = JSON.parse(line) as { id?: number }
      if (message.id !== undefined) pending.get(message.id)?.(message)
      newline = buffer.indexOf('\n')
    }
  })
  return {
    input,
    output,
    request(id, method, params) {
      return new Promise((resolve) => {
        pending.set(id, resolve)
        input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
      })
    },
  }
}

let server: StdioServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

describe('startStdioServer', () => {
  it('presents the session credential on every tool call', async () => {
    const runtime = createStubRuntime([fakeOperation('notes.notes.list')], (call) =>
      Promise.resolve({ invokedWith: call.context.credential.reveal() })
    )
    const client = createLineClient()
    server = await startStdioServer({
      adapter: createMcpAdapter(runtime),
      credential: createBearerCredential(TOKEN),
      input: client.input,
      output: client.output,
    })

    const init = await client.request(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'line-client', version: '1.0.0' },
    })
    expect(init).toMatchObject({ result: { serverInfo: { name: 'macts-mcp' } } })
    client.input.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`
    )

    const call = { name: 'macts__notes__notes_list', arguments: {} }
    const first = await client.request(2, 'tools/call', call)
    const second = await client.request(3, 'tools/call', call)

    const expected = {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ result: { invokedWith: TOKEN } }) }],
      },
    }
    expect(first).toMatchObject(expected)
    expect(second).toMatchObject(expected)
    expect(runtime.calls).toHaveLength(2)
  })

  it('lists the adapter’s tools', async () => {
    const client = createLineClient()
    server = await startStdioServer({
      adapter: createMcpAdapter(createStubRuntime([fakeOperation('notes.notes.list')])),
      credential: createBearerCredential(TOKEN),
      name: 'custom',
      version: '9.9.9',
      input: client.input,
      output: client.output,
    })

    const init = await client.request(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'line-client', version: '1.0.0' },
    })
    const list = await client.request(2, 'tools/list', {})

    expect(init).toMatchObject({ result: { serverInfo: { name: 'custom', version: '9.9.9' } } })
    expect(list).toMatchObject({ result: { tools: [{ name: 'macts__notes__notes_list' }] } })
  })
})

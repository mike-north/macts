/**
 * Unit tests for serving host tools beside an adapter's operation tools.
 *
 * The operation tools come from a real adapter over a stub runtime, so these
 * tests exercise only what the composition owns: the combined listing, the
 * refusal of duplicate names, routing a call by name, and the result of a host
 * tool call. Expected values are written by hand:
 *
 * - phases/13 D5: an operation tool call is exactly one `runtime.invoke` with
 *   the caller's credential; a host tool runs no operation and so is never
 *   given one.
 * - phases/13 D6: an unexpected failure is `isError: true` with a generic
 *   `INTERNAL` envelope whose original text is logged, never echoed.
 * - MCP: a call to a tool the server does not serve is a protocol error
 *   (`InvalidParams`), not a tool result.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#error-handling
 */

import { ErrorCode, McpError, type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'
import type { InvocationContext } from '@macts/contracts'
import { createBearerCredential } from '@macts/runtime'
import { createMcpAdapter } from './adapter.js'
import { McpToolCompositionError } from './errors.js'
import { withHostTools, type McpHostTool } from './host-tools.js'
import { createRecordingLogger, createStubRuntime, fakeOperation } from './test-helpers.js'

const LIST = fakeOperation('notes.notes.list')
const LIST_TOOL = 'macts__notes__notes_list'
const TOKEN = 'tok-host-tools-0123456789'

/** A host tool that answers with the arguments it received. */
function echoTool(name = 'macts__capabilities__discover'): McpHostTool & { calls: unknown[] } {
  const calls: unknown[] = []
  return {
    calls,
    name,
    description: `Echoes for ${name}`,
    inputSchema: { type: 'object', properties: { intent: { type: 'string' } } },
    handler(args) {
      calls.push(args)
      return Promise.resolve({ echoed: args })
    },
  }
}

/** The JSON document in a tool result's only text content. */
function documentOf(result: CallToolResult): unknown {
  const [first] = result.content
  if (first?.type !== 'text') throw new Error('Expected one text content item')
  return JSON.parse(first.text)
}

describe('withHostTools: listing', () => {
  it('lists the host tools first, as declared, then the operation tools', () => {
    const adapter = createMcpAdapter(createStubRuntime([LIST]))
    const host = echoTool()

    const listing = withHostTools(adapter, [host]).listTools()

    expect(listing.map((tool) => tool.name)).toEqual(['macts__capabilities__discover', LIST_TOOL])
    expect(listing[0]).toEqual({
      name: 'macts__capabilities__discover',
      description: 'Echoes for macts__capabilities__discover',
      inputSchema: { type: 'object', properties: { intent: { type: 'string' } } },
    })
    expect(listing[1]).toEqual(adapter.listTools()[0])
  })

  it('serves the operation tools unchanged when there are no host tools', () => {
    const adapter = createMcpAdapter(createStubRuntime([LIST]))

    expect(withHostTools(adapter, []).listTools()).toEqual(adapter.listTools())
  })
})

describe('withHostTools: name collisions', () => {
  it('refuses two host tools with the same name', () => {
    const adapter = createMcpAdapter(createStubRuntime([LIST]))

    expect(() => withHostTools(adapter, [echoTool('dup'), echoTool('dup')])).toThrow(
      new McpToolCompositionError('Two host tools are named "dup"')
    )
  })

  it('refuses a host tool named like an operation tool', () => {
    const adapter = createMcpAdapter(createStubRuntime([LIST]))

    expect(() => withHostTools(adapter, [echoTool(LIST_TOOL)])).toThrow(
      new McpToolCompositionError(
        `The host tool "${LIST_TOOL}" has the same name as an operation tool`
      )
    )
  })
})

describe('withHostTools: calls', () => {
  it('runs a host tool without consulting the call context', async () => {
    const runtime = createStubRuntime([LIST])
    const host = echoTool()
    const composed = withHostTools(createMcpAdapter(runtime), [host])
    let contextRequested = false

    const result = await composed.callTool(
      'macts__capabilities__discover',
      { intent: 'notes' },
      () => {
        contextRequested = true
        return { credential: createBearerCredential(TOKEN) }
      }
    )

    expect(result.isError).toBeUndefined()
    expect(documentOf(result)).toEqual({ echoed: { intent: 'notes' } })
    expect(contextRequested).toBe(false)
    expect(runtime.calls).toEqual([])
  })

  it('hands absent host tool arguments over as the empty object', async () => {
    const host = echoTool()
    const composed = withHostTools(createMcpAdapter(createStubRuntime([LIST])), [host])

    await composed.callTool('macts__capabilities__discover', undefined, {
      credential: createBearerCredential(TOKEN),
    })

    expect(host.calls).toEqual([{}])
  })

  it('dispatches an operation tool as one runtime.invoke with the caller credential', async () => {
    const runtime = createStubRuntime([LIST], () => Promise.resolve({ ok: true }))
    const composed = withHostTools(createMcpAdapter(runtime), [echoTool()])
    const context: InvocationContext = { credential: createBearerCredential(TOKEN) }

    const result = await composed.callTool(LIST_TOOL, {}, context)

    expect(documentOf(result)).toEqual({ result: { ok: true } })
    expect(runtime.calls).toHaveLength(1)
    expect(runtime.calls[0]?.id).toBe('notes.notes.list')
    expect(runtime.calls[0]?.context.credential.reveal()).toBe(TOKEN)
  })

  it('keeps an unknown tool a protocol error that never echoes the name', async () => {
    const composed = withHostTools(createMcpAdapter(createStubRuntime([LIST])), [echoTool()])

    const call = composed.callTool(
      'macts__secret__probe',
      {},
      {
        credential: createBearerCredential(TOKEN),
      }
    )

    await expect(call).rejects.toBeInstanceOf(McpError)
    await expect(call).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(call).rejects.not.toHaveProperty(
      'message',
      expect.stringContaining('macts__secret__probe') as unknown
    )
  })

  it('answers a failing host tool with a generic INTERNAL envelope and logs the original', async () => {
    const { logger, entries } = createRecordingLogger()
    const failing: McpHostTool = {
      name: 'macts__capabilities__discover',
      description: 'Fails',
      inputSchema: { type: 'object' },
      handler: () => Promise.reject(new Error('registry exploded: secret-detail')),
    }
    const composed = withHostTools(createMcpAdapter(createStubRuntime([LIST])), [failing], {
      logger,
    })

    const result = await composed.callTool(
      'macts__capabilities__discover',
      {},
      {
        credential: createBearerCredential(TOKEN),
      }
    )

    expect(result.isError).toBe(true)
    expect(documentOf(result)).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error', details: {} },
    })
    expect(JSON.stringify(result)).not.toContain('secret-detail')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      level: 'error',
      fields: { tool: 'macts__capabilities__discover' },
    })
  })
})

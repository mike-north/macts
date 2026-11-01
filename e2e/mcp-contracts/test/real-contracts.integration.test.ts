/**
 * Integration: the MCP adapter serving the real generated contracts through a
 * real MCP client and server.
 *
 * The contracts are the ones `@macts/notes` and `@macts/calendar` ship at their
 * `/contract` subpaths, registered on a real runtime against their real
 * manifests. Only the executor (no app runs) and the credential verifier (no
 * key store) are fakes. An MCP SDK `Client` talks to a `Server` wired with
 * {@link attachMcpAdapter} over the SDK's in-memory transport, and each request
 * carries its bearer token as transport auth info, the way an authenticating
 * HTTP transport delivers it.
 *
 * Every expected value is written by hand from the manifests and the decision
 * record:
 *
 * - Notes' `getAttachment` command has `routeName: get`, so the operation is
 *   `notes.attachments.get` with permission `notes:attachments:get`, target
 *   `{ command: 'getAttachment', resource: 'Attachment' }`, and one required
 *   string parameter `id`; its tool is `macts__notes__attachments_get`.
 * - Calendar's app-level `reloadCalendars` is `calendar.app.reloadCalendars`,
 *   whose tool is `macts__calendar__app_reload_calendars`.
 * - D5: the runtime verifies the credential, checks the permission, enforces
 *   governance (failing closed), and validates input, in that order, before the
 *   executor runs; a permission denial carries `required` and a `hint` naming
 *   the permission to grant and its resource wildcard.
 * - D6: MCP failures are `isError: true` with `{ "error": WireError }`; an
 *   unexpected failure is a generic `INTERNAL` that never echoes its text.
 * - D9: tool input schemas are derived from wire contracts, which are pure
 *   validators, so their input and output JSON Schemas coincide.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6, D9, D11)
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#calling-tools
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#error-handling
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolResultSchema,
  ErrorCode,
  McpError,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { calendarContract } from '@macts/calendar/contract'
import { notesContract } from '@macts/notes/contract'
import { AppManifestSchema } from '@macts/core'
import type { AnyOperationDescriptor, AppContract, Authority } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  createBearerCredential,
  createRuntime,
  type CreateRuntimeOptions,
} from '@macts/runtime'
import { attachMcpAdapter, createMcpAdapter, toolNameFor, type McpRequestExtra } from '@macts/mcp'
import {
  createFakeVerifier,
  createRecordingExecutor,
  createSilentLogger,
  type RecordingExecutor,
} from '../src/harness.js'

/** A key that holds the attachment read and the calendar reload. */
const READER_TOKEN = 'tok-reader-0123456789'

/** A key that holds only an unrelated Notes permission. */
const LIMITED_TOKEN = 'tok-limited-0123456789'

/** A token no key matches. */
const UNKNOWN_TOKEN = 'tok-unknown-0123456789'

const AUTHORITIES: Readonly<Record<string, Authority>> = {
  [READER_TOKEN]: {
    subject: 'key-reader',
    permissions: ['notes:attachments:get', 'calendar:calendars:reload'],
  },
  [LIMITED_TOKEN]: { subject: 'key-limited', permissions: ['notes:notes:list'] },
}

const ATTACHMENT_ID = 'x-coredata://attachment-1'

/** An attachment as the executor returns it, in wire form (dates are D3 control records). */
const ATTACHMENT_WIRE = {
  id: ATTACHMENT_ID,
  name: 'diagram.png',
  creationDate: { date: '2026-01-15T10:30:00.000Z' },
  modificationDate: { date: '2026-01-16T10:30:00.000Z' },
} as const

const ATTACHMENT_TOOL = 'macts__notes__attachments_get'
const RELOAD_TOOL = 'macts__calendar__app_reload_calendars'

/** The real contracts under test. */
const CONTRACTS: readonly AppContract<unknown>[] = [notesContract, calendarContract]

/** Every operation descriptor the real contracts declare. */
function allDescriptors(): AnyOperationDescriptor[] {
  return CONTRACTS.flatMap((contract) => Object.values(contract.operations))
}

/** A connected client and what the test observes on the server side. */
interface Harness {
  readonly client: Client
  readonly executor: RecordingExecutor
  /** The request context the credential resolver received, per call. */
  readonly extras: McpRequestExtra[]
  /** Present `token` as the bearer on every later request. */
  present(token: string): void
  close(): Promise<void>
}

const open: Harness[] = []

afterEach(async () => {
  await Promise.all(open.splice(0).map((harness) => harness.close()))
})

/**
 * Register the real contracts on a runtime, attach an adapter for it to an MCP
 * server, and connect a client over the in-memory transport.
 */
async function connect(
  options: {
    readonly executor?: RecordingExecutor
    readonly governance?: CreateRuntimeOptions['governance']
  } = {}
): Promise<Harness> {
  const executor = options.executor ?? createRecordingExecutor()
  const logger = createSilentLogger()
  const runtime = createRuntime({
    executor,
    verifier: createFakeVerifier(AUTHORITIES),
    governance: options.governance ?? { policy: ALLOW_ALL_POLICY },
    logger,
  })
  for (const contract of CONTRACTS) {
    runtime.registerContract(contract, AppManifestSchema.parse(await contract.loadManifest()))
  }

  const extras: McpRequestExtra[] = []
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const server = new Server({ name: 'macts-test', version: '0.0.0' }, { capabilities: {} })
  attachMcpAdapter(server, createMcpAdapter(runtime, { logger }), (extra) => {
    extras.push(extra)
    return createBearerCredential(extra.authInfo?.token ?? '')
  })

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  // Attach the bearer to every request, as an authenticating HTTP transport
  // delivers it to the server's handlers.
  let bearer = READER_TOKEN
  const send = clientTransport.send.bind(clientTransport)
  clientTransport.send = (message, sendOptions) =>
    send(message, { ...sendOptions, authInfo: { token: bearer, clientId: 'test', scopes: [] } })

  const client = new Client({ name: 'macts-test-client', version: '0.0.0' })
  await server.connect(serverTransport)
  await client.connect(clientTransport)

  const harness: Harness = {
    client,
    executor,
    extras,
    present(token) {
      bearer = token
    },
    async close() {
      await client.close()
      await server.close()
    },
  }
  open.push(harness)
  return harness
}

/** Call a tool and validate the response as an MCP tool result. */
async function call(client: Client, name: string, args: Record<string, unknown>) {
  return CallToolResultSchema.parse(await client.callTool({ name, arguments: args }))
}

/** The single JSON document carried as a tool result's text content. */
function documentOf(result: CallToolResult): unknown {
  expect(result.content).toHaveLength(1)
  const [content] = result.content
  if (content?.type !== 'text') {
    throw new Error(`Expected one text content item, got ${JSON.stringify(result.content)}`)
  }
  return JSON.parse(content.text)
}

/** The wire error of a failed tool result. */
function wireErrorOf(result: CallToolResult): { code: string; message: string; details: unknown } {
  expect(result.isError).toBe(true)
  const document = documentOf(result)
  const parsed = z
    .object({ error: z.object({ code: z.string(), message: z.string(), details: z.unknown() }) })
    .strict()
    .parse(document)
  return parsed.error
}

describe('tools/list over the real Notes and Calendar contracts', () => {
  it('lists one tool per registered operation, under its derived name', async () => {
    const { client } = await connect()

    const { tools } = await client.listTools()

    const descriptors = allDescriptors()
    expect(tools).toHaveLength(descriptors.length)
    expect(new Set(tools.map((tool) => tool.name))).toEqual(
      new Set(descriptors.map((descriptor) => toolNameFor(descriptor.id)))
    )
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([ATTACHMENT_TOOL, RELOAD_TOOL])
    )
  })

  it('gives every tool an object input schema', async () => {
    const { client } = await connect()

    const { tools } = await client.listTools()

    for (const tool of tools) {
      expect(tool.inputSchema.type, tool.name).toBe('object')
    }
  })

  it('describes the attachment get from its contract: one required string id', async () => {
    const { client } = await connect()

    const { tools } = await client.listTools()

    const attachmentGet = tools.find((tool) => tool.name === ATTACHMENT_TOOL)
    expect(attachmentGet).toMatchObject({
      description: 'Get an attachment by ID',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    })
  })
})

describe('tools/call over the real Notes and Calendar contracts', () => {
  it('runs a sufficiently granted call on the executor with the wire input and returns { result }', async () => {
    const executor = createRecordingExecutor(() => Promise.resolve(ATTACHMENT_WIRE))
    const { client, extras } = await connect({ executor })

    const result = await call(client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID })

    expect(result.isError).toBeFalsy()
    expect(documentOf(result)).toEqual({ result: ATTACHMENT_WIRE })
    expect(executor.requests).toHaveLength(1)
    expect(executor.requests[0]?.target).toEqual({
      command: 'getAttachment',
      resource: 'Attachment',
    })
    expect(executor.requests[0]?.input).toEqual({ id: ATTACHMENT_ID })
    // The request's abort signal is the invocation's cancellation signal.
    expect(executor.requests[0]?.signal).toBe(extras[0]?.signal)
  })

  it('runs an app-level Calendar operation with empty input', async () => {
    const executor = createRecordingExecutor(() => Promise.resolve(null))
    const { client } = await connect({ executor })

    const result = await call(client, RELOAD_TOOL, {})

    expect(documentOf(result)).toEqual({ result: null })
    expect(executor.requests[0]?.target).toEqual({ command: 'reloadCalendars' })
    expect(executor.requests[0]?.input).toEqual({})
  })

  it('denies a grant lacking the permission with PERMISSION_DENIED and a hint', async () => {
    const harness = await connect()
    harness.present(LIMITED_TOKEN)

    const error = wireErrorOf(await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID }))

    expect(error.code).toBe('PERMISSION_DENIED')
    expect(error.details).toMatchObject({ required: 'notes:attachments:get' })
    const { hint } = z.object({ hint: z.string() }).parse(error.details)
    expect(hint).toContain('"notes:attachments:get"')
    expect(hint).toContain('"notes:attachments:*"')
    expect(harness.executor.requests).toEqual([])
  })

  it('rejects input missing a required field with VALIDATION_FAILED, before execution', async () => {
    const { client, executor } = await connect()

    const error = wireErrorOf(await call(client, ATTACHMENT_TOOL, {}))

    expect(error.code).toBe('VALIDATION_FAILED')
    const { issues } = z
      .object({ issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])) })) })
      .parse(error.details)
    expect(issues.map((issue) => issue.path)).toContainEqual(['id'])
    expect(executor.requests).toEqual([])
  })

  it('rejects input of the wrong type with VALIDATION_FAILED, before execution', async () => {
    const { client, executor } = await connect()

    const error = wireErrorOf(await call(client, ATTACHMENT_TOOL, { id: 42 }))

    expect(error.code).toBe('VALIDATION_FAILED')
    expect(executor.requests).toEqual([])
  })

  it('rejects an unknown credential with UNAUTHENTICATED', async () => {
    const harness = await connect()
    harness.present(UNKNOWN_TOKEN)

    const error = wireErrorOf(await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID }))

    expect(error.code).toBe('UNAUTHENTICATED')
    expect(error.details).toEqual({ reason: 'invalid' })
    expect(harness.executor.requests).toEqual([])
  })

  it('rejects a call with no credential as UNAUTHENTICATED (missing)', async () => {
    const harness = await connect()
    harness.present('')

    const error = wireErrorOf(await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID }))

    expect(error.code).toBe('UNAUTHENTICATED')
    expect(error.details).toEqual({ reason: 'missing' })
  })

  it('fails closed with INTERNAL when governance cannot be loaded, on every call', async () => {
    const harness = await connect({
      governance: () => Promise.reject(new Error('policy.json is malformed at line 3')),
    })

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID })
      const error = wireErrorOf(result)
      expect(error.code).toBe('INTERNAL')
      expect(JSON.stringify(result)).not.toContain('malformed')
    }
    expect(harness.executor.requests).toEqual([])
  })

  it('reports an executor failure as INTERNAL without its text', async () => {
    const executor = createRecordingExecutor(() => Promise.reject(new Error('secret detail')))
    const { client } = await connect({ executor })

    const result = await call(client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID })

    expect(wireErrorOf(result).code).toBe('INTERNAL')
    expect(JSON.stringify(result)).not.toContain('secret detail')
  })

  it('answers a call to an unknown tool with an InvalidParams protocol error', async () => {
    const { client, executor, extras } = await connect()
    const requested = 'macts__notes__attachments_shred'

    const outcome = client.callTool({ name: requested, arguments: {} })

    await expect(outcome).rejects.toBeInstanceOf(McpError)
    await expect(outcome).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(outcome).rejects.not.toThrow(requested)
    expect(executor.requests).toEqual([])
    expect(extras).toEqual([])
  })

  it('hands the credential resolver each request’s own context', async () => {
    const harness = await connect()

    await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID })
    harness.present(LIMITED_TOKEN)
    await call(harness.client, ATTACHMENT_TOOL, { id: ATTACHMENT_ID })

    expect(harness.extras).toHaveLength(2)
    const [first, second] = harness.extras
    expect(first?.authInfo?.token).toBe(READER_TOKEN)
    expect(second?.authInfo?.token).toBe(LIMITED_TOKEN)
    expect(first?.signal).toBeInstanceOf(AbortSignal)
    expect(second?.signal).toBeInstanceOf(AbortSignal)
    expect(first?.requestId).not.toBe(second?.requestId)
  })
})

describe('wire contracts are pure validators (D9)', () => {
  const positions = allDescriptors().flatMap((descriptor) => [
    [`${descriptor.id} input`, descriptor.input.wire] as const,
    [`${descriptor.id} output`, descriptor.output.wire] as const,
  ])

  it.each(positions)('%s has the same input-side and output-side JSON Schema', (_label, wire) => {
    expect(z.toJSONSchema(wire, { target: 'draft-7', io: 'input' })).toStrictEqual(
      z.toJSONSchema(wire, { target: 'draft-7', io: 'output' })
    )
  })
})

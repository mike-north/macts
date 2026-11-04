/**
 * Unit tests for the MCP adapter over a stub runtime.
 *
 * The runtime is replaced by a stub that lists fixed operations and answers
 * each call with a chosen outcome, so these tests exercise only what the
 * adapter owns: tool derivation, construction-time refusals, and the mapping of
 * every class of outcome onto an MCP tool result. Expected values are written
 * by hand from the decision record and the MCP specification:
 *
 * - D6: success is `{ "result": <wire value> }`; a canonical failure is
 *   `isError: true` with `{ "error": { code, message, details } }`; anything
 *   that cannot be encoded as a canonical wire error is a generic `INTERNAL`
 *   whose original is logged, never echoed.
 * - D9: a tool's input schema is the input side of its wire contract,
 *   `z.toJSONSchema(input.wire, { target: 'draft-7', io: 'input' })`, and a
 *   contract JSON Schema cannot represent is an error, never an empty schema.
 * - D8: a file result is grant-bearing metadata in wire form, served exactly
 *   as received; bytes never appear in a tool result.
 * - MCP: tool input schemas are object schemas; failures of the tool itself
 *   are tool results with `isError`, while a call to an unknown tool is a
 *   protocol error.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D6, D8, D9)
 * @see https://github.com/mike-north/macts/issues/101
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#error-handling
 */

import { McpError, ErrorCode, type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  ApprovalPendingError,
  ApprovalRejectedError,
  AuthenticationError,
  FileNotFoundError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  PermissionDeniedError,
  PolicyDeniedError,
  RateLimitedError,
  TargetNotFoundError,
  TransferError,
  TransportError,
  UnexpectedValueError,
  ValidationError,
  type AnyMactsError,
  type InvocationContext,
  type WireValue,
} from '@macts/contracts'
import { createBearerCredential } from '@macts/runtime'
import { createMcpAdapter } from './adapter.js'
import { McpToolDerivationError } from './errors.js'
import {
  createRecordingLogger,
  createStubRuntime,
  fakeListOperation,
  fakeOperation,
  type InvokeCall,
} from './test-helpers.js'

/** The `$schema` keyword `z.toJSONSchema` emits for the draft-7 target. */
const DRAFT_7 = 'http://json-schema.org/draft-07/schema#'

/** A token that must never appear in a result or a log line. */
const TOKEN = 'tok-adapter-unit-0123456789'

/** The caller context every call presents unless a test says otherwise. */
const CONTEXT: InvocationContext = { credential: createBearerCredential(TOKEN) }

const LIST = fakeOperation('notes.notes.list', z.object({}).strict(), 'List notes')
const GET = fakeOperation(
  'notes.notes.get',
  z.object({ name: z.string() }).strict(),
  'Get a note by name'
)

/** An adapter over a stub runtime serving `LIST` and `GET`, answering with `respond`. */
function adapterAnswering(respond: (call: InvokeCall) => Promise<WireValue>) {
  const runtime = createStubRuntime([LIST, GET], respond)
  const log = createRecordingLogger()
  const adapter = createMcpAdapter(runtime, { logger: log.logger })
  return { adapter, runtime, log }
}

/** An adapter whose every call fails with `error`. */
function adapterFailingWith(error: Error) {
  return adapterAnswering(() => Promise.reject(error))
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

/** The generic internal failure document (D6), with an optional correlation id. */
function internalDocument(correlationId?: string) {
  return {
    error: {
      code: 'INTERNAL',
      message: 'Internal server error',
      details: correlationId === undefined ? {} : { correlationId },
    },
  }
}

describe('listTools', () => {
  it('lists one tool per operation, in registration order, with derived names and descriptions', () => {
    const { adapter } = adapterAnswering(() => Promise.resolve(null))

    expect(adapter.listTools()).toEqual([
      {
        name: 'macts__notes__notes_list',
        description: 'List notes',
        inputSchema: {
          $schema: DRAFT_7,
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'macts__notes__notes_get',
        description: 'Get a note by name',
        inputSchema: {
          $schema: DRAFT_7,
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
          additionalProperties: false,
        },
      },
    ])
  })

  it('returns the listing computed when the adapter was built', () => {
    const { adapter } = adapterAnswering(() => Promise.resolve(null))

    expect(adapter.listTools()).toBe(adapter.listTools())
  })

  it('lists no tools for a runtime with no operations', () => {
    expect(createMcpAdapter(createStubRuntime([])).listTools()).toEqual([])
  })
})

describe('an operation marked unavailable', () => {
  // Mail cannot get one account, so synchronize's required `with` admits no
  // value and the generated descriptor marks the operation unavailable.
  const base = fakeOperation(
    'mail.app.synchronize',
    z.object({ with: z.object({ reference: z.never() }).strict() }).strict(),
    'Synchronize an account'
  )
  const SYNCHRONIZE = {
    ...base,
    descriptor: {
      ...base.descriptor,
      unavailable: {
        positions: ['with'],
        reason:
          'Not available: `with` takes a reference to an account, which the app has no operation to get, so the operation cannot be called.',
      },
    },
  }

  it('is not listed as a tool, while the operations around it are', () => {
    const runtime = createStubRuntime([LIST, SYNCHRONIZE, GET], () => Promise.resolve(null))
    const names = createMcpAdapter(runtime)
      .listTools()
      .map((tool) => tool.name)
    expect(names).toEqual(['macts__notes__notes_list', 'macts__notes__notes_get'])
  })

  it('is an unknown tool when called by its derived name, and never reaches the runtime', async () => {
    const runtime = createStubRuntime([SYNCHRONIZE], () => Promise.resolve(null))
    const outcome = createMcpAdapter(runtime).callTool(
      'macts__mail__app_synchronize',
      { with: { reference: {} } },
      CONTEXT
    )
    await expect(outcome).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    expect(runtime.calls).toEqual([])
  })
})

describe('createMcpAdapter refuses operations it cannot serve', () => {
  it('refuses two operations that derive the same tool name, naming both', () => {
    // `getURL` and `getUrl` both snake-case to `get_url`.
    const runtime = createStubRuntime([
      fakeOperation('mail.app.getURL'),
      fakeOperation('mail.app.getUrl'),
    ])

    expect(() => createMcpAdapter(runtime)).toThrow(McpToolDerivationError)
    expect(() => createMcpAdapter(runtime)).toThrow(
      'Operations "mail.app.getURL" and "mail.app.getUrl" both derive the MCP tool name "macts__mail__app_get_url"'
    )
  })

  it('refuses an input contract that is not an object schema, naming the operation', () => {
    const runtime = createStubRuntime([fakeOperation('notes.notes.search', z.string())])

    expect(() => createMcpAdapter(runtime)).toThrow(McpToolDerivationError)
    expect(() => createMcpAdapter(runtime)).toThrow(
      /"notes\.notes\.search".*does not describe an object/
    )
  })

  it('refuses a union input contract, whose schema has no object type', () => {
    const runtime = createStubRuntime([
      fakeOperation(
        'notes.notes.find',
        z.union([z.object({ name: z.string() }), z.object({ id: z.string() })])
      ),
    ])

    expect(() => createMcpAdapter(runtime)).toThrow(
      /"notes\.notes\.find".*does not describe an object/
    )
  })

  it('refuses an input contract JSON Schema cannot represent, naming the operation', () => {
    const runtime = createStubRuntime([
      fakeOperation('notes.notes.tag', z.object({ tag: z.custom<string>(() => true) })),
    ])

    let thrown: unknown
    try {
      createMcpAdapter(runtime)
    } catch (error) {
      thrown = error
    }
    if (!(thrown instanceof McpToolDerivationError)) {
      throw new Error(`Expected McpToolDerivationError, got ${String(thrown)}`)
    }
    expect(thrown.message).toContain('"notes.notes.tag"')
    expect(thrown.message).toContain('cannot be represented as JSON Schema')
    // The zod failure is kept for the operator.
    expect(thrown.cause).toBeInstanceOf(Error)
  })

  it('refuses an operation id without three segments', () => {
    const runtime = createStubRuntime([fakeOperation('notes.notes.list.all')])

    expect(() => createMcpAdapter(runtime)).toThrow(McpToolDerivationError)
  })
})

describe('callTool success', () => {
  it('invokes the operation once with the arguments and context, and returns { result }', async () => {
    const wire = {
      name: 'Groceries',
      body: '<p>milk</p>',
      modified: { date: '2026-01-15T10:30:00.000Z' },
    }
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(wire))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'Groceries' }, CONTEXT)

    expect(result.isError).toBeUndefined()
    expect(documentOf(result)).toEqual({ result: wire })
    expect(runtime.calls).toEqual([
      { id: 'notes.notes.get', input: { name: 'Groceries' }, context: CONTEXT },
    ])
  })

  it('returns a file result as its wire metadata and grant only, never bytes or a URL (D8)', async () => {
    // A `file` control record: path, existence observation, and an opaque
    // fetch grant. Content moves outside model context, through the grant.
    const fileRecord = {
      file: {
        path: '/Users/example/Documents/report.pdf',
        exists: true,
        observedAt: { date: '2026-01-15T10:30:00.000Z' },
        grant: 'grant-opaque-1',
      },
    }
    const { adapter } = adapterAnswering(() => Promise.resolve(fileRecord))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'Report' }, CONTEXT)

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(1)
    expect(result.content[0]?.type).toBe('text')
    // Exactly the wire record, with nothing added: no inline content, no
    // base64, no download URL.
    expect(documentOf(result)).toStrictEqual({ result: fileRecord })
  })

  it('passes a null result through as { result: null }', async () => {
    const { adapter } = adapterAnswering(() => Promise.resolve(null))

    const result = await adapter.callTool('macts__notes__notes_list', {}, CONTEXT)

    expect(documentOf(result)).toEqual({ result: null })
  })

  it('invokes absent arguments as the empty input record', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))

    await adapter.callTool('macts__notes__notes_list', undefined, CONTEXT)

    expect(runtime.calls[0]?.input).toEqual({})
  })

  it('passes non-record arguments to the runtime unchanged, which validates them', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))

    await adapter.callTool('macts__notes__notes_list', null, CONTEXT)

    expect(runtime.calls[0]?.input).toBeNull()
  })

  it('calls a context function once, and invokes with what it returns', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))
    let produced = 0

    await adapter.callTool('macts__notes__notes_list', {}, () => {
      produced++
      return CONTEXT
    })

    expect(produced).toBe(1)
    expect(runtime.calls[0]?.context).toBe(CONTEXT)
  })
})

describe('callTool on a list: the continuation note', () => {
  const PAGED = fakeListOperation('notes.notes.listNotes')
  const NOTE_TWO =
    'This page holds 2 items; more remain. Call this tool again with the same arguments plus "cursor" set to the result\'s nextCursor to read the next page.'

  /** The text of every content block of a tool result, in order. */
  function textsOf(result: CallToolResult): string[] {
    return result.content.map((content) => {
      if (content.type !== 'text') throw new Error('expected only text content')
      return content.text
    })
  }

  /** An adapter serving the paged list, answering every call with `page`. */
  function pagedAdapter(page: WireValue) {
    const runtime = createStubRuntime([PAGED], () => Promise.resolve(page))
    return createMcpAdapter(runtime, { logger: createRecordingLogger().logger })
  }

  it('puts the note in a second text block after the result document, which parses as JSON', async () => {
    const page = { items: [{ name: 'a' }, { name: 'b' }], nextCursor: 'cursor-opaque' }

    const result = await pagedAdapter(page).callTool('macts__notes__notes_list_notes', {}, CONTEXT)

    expect(result.isError).toBeUndefined()
    const [document, note, ...rest] = textsOf(result)
    expect(JSON.parse(document ?? '')).toEqual({ result: page })
    expect(note).toBe(NOTE_TWO)
    expect(rest).toEqual([])
  })

  it('says "1 item" for a page of one', async () => {
    const result = await pagedAdapter({ items: [{ name: 'a' }], nextCursor: 'c' }).callTool(
      'macts__notes__notes_list_notes',
      {},
      CONTEXT
    )

    expect(textsOf(result)[1]).toMatch(/^This page holds 1 item; more remain\./)
  })

  it.each([
    { label: 'a page with more items', page: { items: [{ name: 'a' }], nextCursor: 'c' } },
    { label: 'the last page', page: { items: [{ name: 'a' }] } },
    { label: 'an empty page', page: { items: [] } },
  ])('keeps the first text block exactly the result document for $label', async ({ page }) => {
    const result = await pagedAdapter(page).callTool('macts__notes__notes_list_notes', {}, CONTEXT)

    const [document] = textsOf(result)
    expect(document).toBe(JSON.stringify({ result: page }))
    expect(JSON.parse(document ?? '')).toEqual({ result: page })
  })

  it('adds no note block to the last page, which has no nextCursor', async () => {
    const page = { items: [{ name: 'a' }] }

    const result = await pagedAdapter(page).callTool('macts__notes__notes_list_notes', {}, CONTEXT)

    expect(textsOf(result)).toEqual([JSON.stringify({ result: page })])
  })

  it('adds no note block to an operation that does not return a page, even if its result looks like one', async () => {
    const lookalike = { items: [], nextCursor: 'not-a-page' }
    const { adapter } = adapterAnswering(() => Promise.resolve(lookalike))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(textsOf(result)).toEqual([JSON.stringify({ result: lookalike })])
  })

  it('never repeats the cursor or any item in the note', async () => {
    const page = { items: [{ name: 'secret-item-1d2e' }], nextCursor: 'secret-cursor-1d2e' }

    const result = await pagedAdapter(page).callTool('macts__notes__notes_list_notes', {}, CONTEXT)

    expect(textsOf(result)[1]).not.toContain('secret')
  })
})

describe('callTool for a tool the adapter does not serve', () => {
  it('rejects with an InvalidParams protocol error that does not echo the name', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))
    const requested = 'macts__notes__notes_delete_everything'
    let produced = 0

    const outcome = adapter.callTool(requested, {}, () => {
      produced++
      return CONTEXT
    })

    await expect(outcome).rejects.toBeInstanceOf(McpError)
    await expect(outcome).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(outcome).rejects.not.toThrow(requested)
    expect(runtime.calls).toEqual([])
    expect(produced).toBe(0)
  })
})

describe('callTool failure mapping', () => {
  /**
   * One canonical failure per wire code, with the envelope D6 says it is sent
   * as: the same code, message, and details.
   */
  const canonical: readonly (readonly [AnyMactsError, unknown])[] = [
    [
      new ValidationError('Operation input failed validation.', {
        issues: [{ path: ['name'], message: 'Required' }],
      }),
      { issues: [{ path: ['name'], message: 'Required' }] },
    ],
    [
      new UnexpectedValueError('The app returned an unexpected value.', {
        issues: [{ path: ['modified'], message: 'Expected a date' }],
      }),
      { issues: [{ path: ['modified'], message: 'Expected a date' }] },
    ],
    [new AuthenticationError('No credential.', { reason: 'missing' }), { reason: 'missing' }],
    [new RateLimitedError('Slow down.', { retryAfterSeconds: 7 }), { retryAfterSeconds: 7 }],
    [
      new PermissionDeniedError('Missing permission.', {
        required: 'notes:notes:get',
        hint: 'Grant "notes:notes:get".',
      }),
      { required: 'notes:notes:get', hint: 'Grant "notes:notes:get".' },
    ],
    [
      new PolicyDeniedError('Forbidden by policy.', {
        permission: 'notes:notes:get',
        layer: 'host',
      }),
      { permission: 'notes:notes:get', layer: 'host' },
    ],
    [
      new ApprovalPendingError('Held.', { permission: 'notes:notes:get', layer: 'key' }),
      { permission: 'notes:notes:get', layer: 'key' },
    ],
    [
      new ApprovalRejectedError('Rejected.', {
        permission: 'notes:notes:get',
        layer: 'host',
        state: 'timeout',
      }),
      { permission: 'notes:notes:get', layer: 'host', state: 'timeout' },
    ],
    [new TargetNotFoundError('No such note.', { resource: 'Note' }), { resource: 'Note' }],
    [new FileNotFoundError('No such file.', {}), {}],
    [new InvalidSelectionError('Bad range.', { resource: 'Note' }), { resource: 'Note' }],
    [
      new AppUnavailableError('Notes is not running.', { app: 'Notes', reason: 'not-responding' }),
      { app: 'Notes', reason: 'not-responding' },
    ],
    [new AppAuthorizationRequiredError('Not authorized.', { app: 'Notes' }), { app: 'Notes' }],
    [
      new AppOperationError('Notes failed.', { app: 'Notes', appErrorCode: -1728 }),
      { app: 'Notes', appErrorCode: -1728 },
    ],
    [new OperationTimeoutError('Too slow.', { timeoutMs: 30000 }), { timeoutMs: 30000 }],
    [new OperationCancelledError('Cancelled.', {}), {}],
    [new TransferError('Expired.', { reason: 'expired' }), { reason: 'expired' }],
    [new InternalError('Governance could not be loaded.', {}), {}],
  ]

  const rows = canonical.map(([error, details]) => ({ code: error.code, error, details }))

  it.each(rows)('sends $code as its own envelope with isError', async ({ error, details }) => {
    const { adapter } = adapterFailingWith(error)

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(result.isError).toBe(true)
    expect(documentOf(result)).toEqual({
      error: { code: error.code, message: error.message, details },
    })
  })

  it('logs a cancellation at info, not as a failure', async () => {
    const { adapter, log } = adapterFailingWith(new OperationCancelledError('Cancelled.', {}))

    await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(log.entries.map((entry) => entry.level)).toEqual(['info'])
    expect(log.entries[0]?.fields).toEqual({
      operation: 'notes.notes.get',
      correlationId: undefined,
    })
  })

  it('reports a client-only transport failure as a generic internal failure, and logs it', async () => {
    const { adapter, log } = adapterFailingWith(
      new TransportError('Unreachable.', { reason: 'unreachable' })
    )

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(result.isError).toBe(true)
    expect(documentOf(result)).toEqual(internalDocument())
    expect(log.entries.map((entry) => entry.level)).toEqual(['error'])
  })

  it('reports details that fail their schema as a generic internal failure, logged without the details', async () => {
    // A producer defect: details outside the contract, which only a cast can build.
    const details = {
      app: 'Notes',
      reason: 'secret-detail-value',
    } as unknown as ConstructorParameters<typeof AppUnavailableError>[1]
    const { adapter, log } = adapterFailingWith(new AppUnavailableError('Down.', details))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(result.isError).toBe(true)
    expect(documentOf(result)).toEqual(internalDocument())
    expect(log.entries.map((entry) => entry.level)).toEqual(['error'])
    expect(log.entries[0]?.fields).toMatchObject({
      code: 'APP_UNAVAILABLE',
      operation: 'notes.notes.get',
    })
    expect(JSON.stringify(log.entries)).not.toContain('secret-detail-value')
  })

  it('reports a non-canonical throw as a generic internal failure without echoing its text', async () => {
    const thrown = new Error('secret detail from /Users/someone/private.txt')
    const { adapter, log } = adapterFailingWith(thrown)

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(result.isError).toBe(true)
    expect(documentOf(result)).toEqual(internalDocument())
    expect(JSON.stringify(result)).not.toContain('secret detail')
    // The operator log keeps name, message, and stack only.
    expect(log.entries).toEqual([
      {
        level: 'error',
        fields: {
          err: { name: 'Error', message: thrown.message, stack: thrown.stack },
          operation: 'notes.notes.get',
          correlationId: undefined,
        },
        message: 'Tool call failed unexpectedly',
      },
    ])
  })

  it('logs only the type of a thrown non-Error value', async () => {
    const { adapter, log } = adapterAnswering(() => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
      return Promise.reject('a bare string')
    })

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(documentOf(result)).toEqual(internalDocument())
    expect(log.entries[0]?.fields).toMatchObject({ err: { type: 'string' } })
  })

  it('carries the caller correlation id on a generic internal failure', async () => {
    const { adapter } = adapterFailingWith(new Error('boom'))

    const result = await adapter.callTool(
      'macts__notes__notes_get',
      { name: 'x' },
      { ...CONTEXT, correlationId: 'req-42' }
    )

    expect(documentOf(result)).toEqual(internalDocument('req-42'))
  })

  it('maps a context function that throws a canonical error like any other failure', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, () => {
      throw new AuthenticationError('No credential.', { reason: 'missing' })
    })

    expect(documentOf(result)).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'No credential.', details: { reason: 'missing' } },
    })
    expect(runtime.calls).toEqual([])
  })

  it('maps a context function that throws a plain error to a generic internal failure', async () => {
    const { adapter, runtime } = adapterAnswering(() => Promise.resolve(null))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, () => {
      throw new Error('resolver secret')
    })

    expect(documentOf(result)).toEqual(internalDocument())
    expect(JSON.stringify(result)).not.toContain('resolver secret')
    expect(runtime.calls).toEqual([])
  })

  it('still produces a result when the logger itself fails', async () => {
    const runtime = createStubRuntime([GET], () => Promise.reject(new Error('boom')))
    const failing = (): void => {
      throw new Error('log sink down')
    }
    const adapter = createMcpAdapter(runtime, {
      logger: { error: failing, warn: failing, info: failing },
    })

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(documentOf(result)).toEqual(internalDocument())
  })

  it('never puts the credential in a result or a log line', async () => {
    const { adapter, log } = adapterFailingWith(new Error('boom'))

    const result = await adapter.callTool('macts__notes__notes_get', { name: 'x' }, CONTEXT)

    expect(JSON.stringify(result)).not.toContain(TOKEN)
    expect(JSON.stringify(log.entries)).not.toContain(TOKEN)
  })
})

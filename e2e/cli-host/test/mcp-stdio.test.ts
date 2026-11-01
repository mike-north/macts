/**
 * UAT: `macts --mcp` serves every installed app's operations as MCP tools over
 * stdio, each call dispatched through the runtime under the session's key.
 *
 * The real built CLI is started the way an MCP client starts it: as a child
 * process speaking MCP on stdin and stdout, driven by the MCP SDK's real
 * `Client` over `StdioClientTransport`. The macts home is temporary and its
 * plugins directory holds the real built `@macts/notes-server` and
 * `@macts/notes`. `MACTS_TEST_EXECUTOR=stub` selects the built-in test
 * executor, so no app is automated and every dispatched call answers with the
 * target and input that reached the executor. Keys are minted by the CLI into
 * the same macts home.
 *
 * Expected values are hand-derived:
 *
 * - From the Notes contract (`packages/notes/src/contract/index.ts`): operation
 *   `notes.notes.list` requires `notes:notes:list`, targets command `list` on
 *   resource `Note`, and takes an empty strict record; its tool name is
 *   `macts__notes__notes_list`. `getAttachment` (route name `get`) is
 *   `notes.attachments.get`, whose tool is `macts__notes__attachments_get`.
 * - From phases/13 D6: a tool result is `{ "result": … }`; a failure is
 *   `isError: true` with `{ "error": { code, message, details } }`; a missing
 *   permission is `PERMISSION_DENIED` with the required permission and a hint.
 * - From phases/13 D5: a malformed policy file fails closed: every call fails
 *   with `INTERNAL` ("Governance could not be loaded.") before execution.
 * - From phases/13 A1: a token accompanies every invocation, so a missing key
 *   fails startup, and the removed trusted-caller flag is refused.
 * - From the MCP stdio transport: the server must not write anything to its
 *   stdout that is not a valid MCP message, and messages are delimited by
 *   newlines; logging goes to stderr.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (A1, D5, D6, D9)
 * @see ../../../packages/notes/src/contract/index.ts
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio
 * @see https://github.com/mike-north/macts/issues/101
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { notesContract } from '@macts/notes/contract'
import { remindersContract } from '@macts/reminders/contract'
import {
  callTool,
  connectMcpStdio,
  connectMcpStdioRaw,
  createKey,
  createMactsHome,
  runCli,
  toolDocument,
  writePolicyFile,
  type MactsHome,
  type McpSession,
} from '../src/harness.js'

/** Minting keys and starting servers spawns several Node processes. */
const SETUP_TIMEOUT_MS = 90_000

const LIST_TOOL = 'macts__notes__notes_list'
const DISCOVERY_TOOL = 'macts__capabilities__discover'

/** The result the stub executor gives for `notes.notes.list` with `{}`. */
const STUB_LIST_RESULT = {
  executor: 'test-stub',
  target: { command: 'list', resource: 'Note' },
  input: {},
}

let home: MactsHome
let granted: McpSession
let denied: McpSession

beforeAll(async () => {
  home = createMactsHome()
  const grantedToken = await createKey(home, 'notes:notes:list')
  const otherToken = await createKey(home, 'notes:accounts:list')
  ;[granted, denied] = await Promise.all([
    connectMcpStdio(home, { MACTS_TEST_EXECUTOR: 'stub', MACTS_API_KEY: grantedToken }),
    connectMcpStdio(home, { MACTS_TEST_EXECUTOR: 'stub', MACTS_API_KEY: otherToken }),
  ])
}, SETUP_TIMEOUT_MS)

afterAll(async () => {
  await granted.close()
  await denied.close()
  home.dispose()
})

describe('macts --mcp (UAT): startup', () => {
  it('reports the installed app and the test executor on stderr', () => {
    expect(granted.stderr()).toContain('Serving 2 app(s):\n  notes\n  reminders\n')
    expect(granted.stderr()).toContain('Executor: test-stub\n')
    expect(granted.stderr()).toContain('Warning: MACTS_TEST_EXECUTOR=stub is set')
  })
})

describe('macts --mcp (UAT): tools', () => {
  it('lists the derived tools of every installed app and the capabilities tool', async () => {
    const { tools } = await granted.client.listTools()
    const names = tools.map((tool) => tool.name)
    const notesCount = Object.keys(notesContract.operations).length
    const remindersCount = Object.keys(remindersContract.operations).length

    expect(names).toContain(DISCOVERY_TOOL)
    expect(names).toContain(LIST_TOOL)
    expect(names).toContain('macts__notes__attachments_get')
    // One tool per operation of each installed app, beside the discovery tool.
    expect(names.filter((name) => name.startsWith('macts__notes__'))).toHaveLength(notesCount)
    expect(names.filter((name) => name.startsWith('macts__reminders__'))).toHaveLength(
      remindersCount
    )
    expect(names).toHaveLength(notesCount + remindersCount + 1)
  })

  it('dispatches a granted call to the executor and answers { result }', async () => {
    const result = await callTool(granted, LIST_TOOL, {})

    expect(result.isError).toBeUndefined()
    expect(toolDocument(result)).toEqual({ result: STUB_LIST_RESULT })
  })

  it('denies a key without the permission with PERMISSION_DENIED and a hint', async () => {
    const result = await callTool(denied, LIST_TOOL, {})

    expect(result.isError).toBe(true)
    const document = toolDocument(result) as {
      error: { code: string; message: string; details: { required: string; hint: string } }
    }
    expect(document).toMatchObject({
      error: {
        code: 'PERMISSION_DENIED',
        message: expect.any(String) as unknown,
        details: { required: 'notes:notes:list', hint: expect.any(String) as unknown },
      },
    })
    expect(document.error.details.hint).toContain('notes:notes:list')
  })

  it('serves the discovery tool, which runs no operation', async () => {
    const result = await callTool(denied, DISCOVERY_TOOL, { intent: 'list notes' })

    expect(result.isError).toBeUndefined()
    const document = toolDocument(result) as { intent: string; results: { name: string }[] }
    expect(document.intent).toBe('list notes')
    expect(document.results.map((match) => match.name)).toContain('notes.notes.list')
  })
})

describe('macts --mcp (UAT): stdout carries only protocol frames', () => {
  it(
    'writes nothing but JSON-RPC messages to stdout while starting, listing tools, and calling a tool',
    async () => {
      const token = await createKey(home, 'notes:notes:list')
      const session = await connectMcpStdioRaw(home, {
        MACTS_TEST_EXECUTOR: 'stub',
        MACTS_API_KEY: token,
      })
      try {
        await session.client.listTools()
        const result = await callTool(session, LIST_TOOL, {})
        expect(toolDocument(result)).toEqual({ result: STUB_LIST_RESULT })

        // The server has finished starting once it says so on stderr.
        await expect
          .poll(() => session.stderr(), { timeout: 10_000 })
          .toContain('MCP server running on stdio with')

        // Every line on stdout is one JSON-RPC 2.0 message: at least the
        // initialize, tools/list, and tools/call responses.
        const lines = session
          .stdout()
          .split('\n')
          .filter((line) => line.trim() !== '')
        expect(lines.length).toBeGreaterThanOrEqual(3)
        for (const line of lines) {
          let frame: unknown
          try {
            frame = JSON.parse(line)
          } catch {
            throw new Error(`stdout carries a line that is not JSON: ${JSON.stringify(line)}`)
          }
          expect(frame, line).toBeTypeOf('object')
          expect(frame, line).not.toBeNull()
          expect(Array.isArray(frame), line).toBe(false)
          expect((frame as { jsonrpc?: unknown }).jsonrpc, line).toBe('2.0')
        }
        expect(session.stdout()).not.toContain('Serving 2 app(s)')
        expect(session.stdout()).not.toContain('MACTS_TEST_EXECUTOR')

        // The startup report and the test-executor warning are produced, on stderr.
        expect(session.stderr()).toContain('Serving 2 app(s):\n  notes\n  reminders\n')
        expect(session.stderr()).toContain('Executor: test-stub\n')
        expect(session.stderr()).toContain('Warning: MACTS_TEST_EXECUTOR=stub is set')
      } finally {
        await session.close()
      }
    },
    SETUP_TIMEOUT_MS
  )
})

describe('macts --mcp (UAT): governance fails closed', () => {
  it(
    'answers every call with INTERNAL, never reaching the executor, when the policy file is malformed',
    async () => {
      const broken = createMactsHome()
      try {
        const token = await createKey(broken, 'notes:notes:list')
        writePolicyFile(broken, '{ this is not json')
        const session = await connectMcpStdio(broken, {
          MACTS_TEST_EXECUTOR: 'stub',
          MACTS_API_KEY: token,
        })
        try {
          const result = await callTool(session, LIST_TOOL, {})

          expect(result.isError).toBe(true)
          expect(toolDocument(result)).toEqual({
            error: { code: 'INTERNAL', message: 'Governance could not be loaded.', details: {} },
          })
          // The stub executor's answer never appears: the call stopped at governance.
          expect(JSON.stringify(result)).not.toContain('test-stub')
          // The runtime's diagnostic for the denial reaches stderr, never the
          // stdout protocol channel.
          await expect
            .poll(() => session.stderr(), { timeout: 10_000 })
            .toContain('Could not load the governance context; denying the call')
        } finally {
          await session.close()
        }
      } finally {
        broken.dispose()
      }
    },
    SETUP_TIMEOUT_MS
  )
})

describe('macts --mcp (UAT): startup refusals', () => {
  it('fails startup without MACTS_API_KEY, naming `macts api-key create`', async () => {
    const result = await runCli(home, ['--mcp'], { MACTS_TEST_EXECUTOR: 'stub' })

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Failed to start MCP server: MACTS_API_KEY is not set.')
    expect(result.stderr).toContain(
      'macts api-key create --name <name> --permission <app:resource:operation>'
    )
    expect(result.stdout).toBe('')
  })

  it.each([
    [['--mcp', '--disable-api-key-validation']],
    [['mcp', 'serve', '--disable-api-key-validation']],
  ])('refuses %j with the unknown-option error and the replacement', async (args) => {
    const result = await runCli(home, args, { MACTS_API_KEY: 'unused' })

    expect(result.code).toBe(1)
    // Clipanion reports command-line errors on stdout.
    expect(result.stdout).toContain('Unknown Syntax Error')
    expect(result.stdout).toContain(
      '--disable-api-key-validation has been removed: every MCP tool call is verified by its own API key. Create a local key with `macts api-key create'
    )
    expect(result.stdout).toContain('pass it as MACTS_API_KEY')
  })

  it('warns that MACTS_DISABLE_API_KEY_VALIDATION has no effect, and still requires a key', async () => {
    const result = await runCli(home, ['--mcp'], { MACTS_DISABLE_API_KEY_VALIDATION: '1' })

    expect(result.code).toBe(1)
    expect(result.stderr).toContain(
      'Warning: MACTS_DISABLE_API_KEY_VALIDATION is set but no longer has any effect'
    )
    expect(result.stderr).toContain('MACTS_API_KEY is not set.')
  })
})

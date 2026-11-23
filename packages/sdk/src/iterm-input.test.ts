/**
 * Writing text into an iTerm Session. The Session is addressed by its
 * Window-scoped identity (Window id and Session id), the same identity the
 * Session resolver reads. Writing is a write-risk operation under its own
 * permission, separate from every Session read and from the screen-text
 * reads, and every surface (local and remote SDK, MCP, CLI) runs the same
 * operation contract over a stand-in app.
 *
 * @see https://iterm2.com/documentation-scripting.html (the `write` command: `text`, `newline`)
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D10, "Multilevel addresses and identity scope")
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMcpAdapter } from '@macts/mcp'
import { Cli } from 'clipanion'
import { plugin } from '@macts/iterm/cli'
import { createRuntime, createBearerCredential } from '@macts/runtime'
import { createApp } from '@macts/api/server'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  Integer,
  PermissionDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
} from '@macts/contracts'
import { iTermContract } from '@macts/iterm/contract'
import { capabilities } from '@macts/iterm'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient as local } from './local-client.js'
import { createClient as remote } from './remote.js'

const { home } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-session-input-'))
  process.env['MACTS_HOME'] = home
  return { home }
})
setLogger(createLogger({ level: 'silent' }))
afterAll(async () => {
  closeKeyStore()
  const fs = await import('node:fs/promises')
  await fs.rm(home, { recursive: true, force: true })
})

/** The operation and permission of writing text into a Session. */
const WRITE_PERMISSION = 'iterm:sessions:writeText'
/** Every Session read, the screen-text reads included; none of them authorizes typing. */
const SESSION_READS = [
  'iterm:sessions:list',
  'iterm:sessions:getWithinTab',
  'iterm:sessions:resolve',
  'iterm:sessions:readText',
  'iterm:sessions:readContents',
]

/** One write the stand-in app received: the Session it was sent to and its named arguments. */
interface Written {
  readonly window: number
  readonly session: string
  readonly named: unknown
}

/** Windows hold tabs of Session ids; the stand-in records every write it receives. */
interface State {
  windows: { id: number; tabs: string[][] }[]
  written: Written[]
}

const int = (value: number): Integer => Integer.validate(value)

/** A stand-in app with only the dictionary's containment: Windows, their Tabs, their Sessions. */
function fixture(state: State): object {
  const missing = { exists: () => false }
  const list = (items: () => object[]) => ({
    get length() {
      return items().length
    },
    at: (index: number) => items()[index] ?? missing,
  })
  /** A Session answers its id and a record read; every other property reads as no value. */
  const session = (window: number, id: string) =>
    new Proxy(
      { exists: () => true, id: () => id, properties: () => ({ id }), window },
      {
        get(target, key) {
          const value: unknown = Reflect.has(target, key) ? Reflect.get(target, key) : () => null
          return value
        },
      }
    )
  return {
    windows: {
      byId: (id: number) => {
        const window = state.windows.find((candidate) => candidate.id === id)
        if (window === undefined) return missing
        return {
          exists: () => true,
          id: () => id,
          tabs: list(() =>
            window.tabs.map((ids) => ({
              exists: () => true,
              sessions: list(() => ids.map((sessionId) => session(id, sessionId))),
            }))
          ),
        }
      },
    },
    write: (item: { id: () => string; window: number }, named?: unknown) => {
      state.written.push({ window: item.window, session: item.id(), named })
      return null
    },
  }
}

/** Both localities run the generated operation contract and native body over the stand-in. */
async function setup(locality: 'local' | 'remote', permissions: string[] = [WRITE_PERMISSION]) {
  const state: State = {
    windows: [
      { id: 7, tabs: [['a', 'b'], ['c']] },
      { id: 8, tabs: [['d']] },
    ],
    written: [],
  }
  const executor = createNativeExecutor({ transport: standInTransport(fixture(state)) })
  const key = await createApiKey({ name: 'Session input fixture', permissions })
  const manifest = AppManifestSchema.parse(await iTermContract.loadManifest())
  const app = createApp([], {
    cors: false,
    prettyJson: false,
    executor,
    governance: { policy: ALLOW_ALL_POLICY },
    register: (registrar) => {
      registrar.registerContract(iTermContract, manifest)
    },
  })
  const client =
    locality === 'local'
      ? local(iTermContract, {
          token: key.token,
          executor,
          governance: { policy: ALLOW_ALL_POLICY },
        })
      : remote(iTermContract, {
          token: key.token,
          url: 'http://session-input.test',
          fetch: (input, init) => Promise.resolve(app.fetch(new Request(input, init))),
        })
  return { state, client, app, token: key.token, executor, manifest }
}

it('declares writing as a write-risk operation with its own permission', () => {
  const write = capabilities.find(({ name }) => name === 'iterm.sessions.writeText')
  expect(write).toMatchObject({ permission: WRITE_PERMISSION, risk: 'write' })
  expect(write?.inputSchema['required']).toEqual(['windowId', 'sessionId', 'text'])
})

describe.each(['local', 'remote'] as const)('Session input via %s', (locality) => {
  it('writes the text into the Session found anywhere in its Window, with the newline choice', async () => {
    const { state, client } = await setup(locality)
    await client.sessions.write(int(7), 'c', 'ls -la', false)
    expect(state.written).toEqual([
      { window: 7, session: 'c', named: { text: 'ls -la', newline: false } },
    ])
  })

  it('leaves the newline to the app when the caller does not choose', async () => {
    const { state, client } = await setup(locality)
    await client.sessions.write(int(7), 'a', 'echo hi')
    expect(state.written).toEqual([{ window: 7, session: 'a', named: { text: 'echo hi' } }])
  })

  it('passes an explicit newline through', async () => {
    const { state, client } = await setup(locality)
    await client.sessions.write(int(8), 'd', 'make', true)
    expect(state.written).toEqual([
      { window: 8, session: 'd', named: { text: 'make', newline: true } },
    ])
  })

  it('fails as a missing Session, and writes nothing, when the Session is in another Window', async () => {
    const { state, client } = await setup(locality)
    await expect(client.sessions.write(int(7), 'd', 'x')).rejects.toSatisfy(
      (error) => error instanceof TargetNotFoundError && error.details.resource === 'Session'
    )
    expect(state.written).toEqual([])
  })

  it('fails as a missing Window, and writes nothing, when the Window does not exist', async () => {
    const { state, client } = await setup(locality)
    await expect(client.sessions.write(int(99), 'a', 'x')).rejects.toSatisfy(
      (error) => error instanceof TargetNotFoundError && error.details.resource === 'Window'
    )
    expect(state.written).toEqual([])
  })

  it('refuses to write when the identity matches two Sessions of the Window', async () => {
    const { state, client } = await setup(locality)
    state.windows[0]?.tabs[1]?.push('a')
    await expect(client.sessions.write(int(7), 'a', 'x')).rejects.toBeInstanceOf(
      UnexpectedValueError
    )
    expect(state.written).toEqual([])
  })

  it('rejects input without text before the app is reached', async () => {
    const { state, client } = await setup(locality)
    // Calls without typings, such as from plain JavaScript, may leave the text out.
    const write = client.sessions.write.bind(client.sessions) as unknown as (
      windowId: Integer,
      sessionId: string
    ) => Promise<void>
    await expect(write(int(7), 'a')).rejects.toBeInstanceOf(ValidationError)
    expect(state.written).toEqual([])
  })

  it('denies writing to a key that holds every Session read but not the write permission', async () => {
    const { state, client } = await setup(locality, SESSION_READS)
    await expect(client.sessions.write(int(7), 'a', 'x')).rejects.toBeInstanceOf(
      PermissionDeniedError
    )
    expect(state.written).toEqual([])
    // The same key may still read the Session it cannot type into.
    expect((await client.sessions.resolve(int(7), 'a')).id).toBe('a')
  })

  it('does not let the write permission read the Session', async () => {
    const { client } = await setup(locality)
    await expect(client.sessions.resolve(int(7), 'a')).rejects.toBeInstanceOf(PermissionDeniedError)
  })
})

it('writes through MCP with the same address, arguments and permission check', async () => {
  const { state, executor, manifest, token } = await setup('local')
  let granted = [WRITE_PERMISSION]
  const runtime = createRuntime({
    executor,
    verifier: {
      verify: () => Promise.resolve({ subject: 'session-typist', permissions: granted }),
    },
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(iTermContract, manifest)
  const adapter = createMcpAdapter(runtime)
  const name = 'macts__iterm__sessions_write_text'
  const tool = adapter.listTools().find((candidate) => candidate.name === name)
  expect(tool?.inputSchema['required']).toEqual(['windowId', 'sessionId', 'text'])
  const context = { credential: createBearerCredential(token) }
  const input = { windowId: { integer: '7' }, sessionId: 'b', text: 'top', newline: true }
  expect((await adapter.callTool(name, input, context)).isError).not.toBe(true)
  expect(state.written).toEqual([
    { window: 7, session: 'b', named: { text: 'top', newline: true } },
  ])

  const missing = await adapter.callTool(name, { ...input, sessionId: 'zz' }, context)
  const content = missing.content[0]
  if (content?.type !== 'text') throw new Error('Missing MCP error envelope')
  expect(JSON.parse(content.text)).toMatchObject({ error: { code: 'TARGET_NOT_FOUND' } })

  granted = SESSION_READS
  state.written.length = 0
  const denied = await adapter.callTool(name, input, context)
  const deniedContent = denied.content[0]
  if (deniedContent?.type !== 'text') throw new Error('Missing MCP error envelope')
  expect(JSON.parse(deniedContent.text)).toMatchObject({ error: { code: 'PERMISSION_DENIED' } })
  expect(state.written).toEqual([])
})

/**
 * The generated CLI command, driven from argv as a user types it: the Session id is
 * positional, `--text` is required, and the newline choice is sent only when stated.
 */
const SESSION_WRITE = ['iterm', 'windows', 'tabs', 'sessions', 'write']
it.each([
  {
    label: 'omits the newline choice by default, leaving the app default',
    argv: ['--window-id', '7', 'c', '--text', 'git status'],
    named: { text: 'git status' },
  },
  {
    label: 'sends newline true for --newline',
    argv: ['--window-id', '7', 'c', '--text', 'git status', '--newline'],
    named: { text: 'git status', newline: true },
  },
  {
    label: 'sends newline false for --no-newline',
    argv: ['--window-id', '7', 'c', '--text', 'git status', '--no-newline'],
    named: { text: 'git status', newline: false },
  },
])('writes through the generated CLI command and $label', async ({ argv, named }) => {
  const { app, token, state } = await setup('remote')
  const Write = plugin.commands.find((command) =>
    command.paths?.some((path) => path.join(' ') === SESSION_WRITE.join(' '))
  )
  if (Write === undefined) throw new Error('Missing Session CLI write')
  const cli = new Cli({ binaryName: 'macts' })
  cli.register(Write)
  let stderr = ''
  const command = cli.process([...SESSION_WRITE, ...argv, '--json'], {
    stdout: { write: () => true },
    stderr: {
      write: (value: string) => {
        stderr += value
        return true
      },
    },
  } as never)
  vi.stubEnv('MACTS_API_KEY', token)
  vi.stubEnv('MACTS_API_URL', 'http://session-input.test')
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    app.fetch(new Request(input, init))
  )
  try {
    expect(await command.execute()).toBe(0)
    expect(stderr).toBe('')
    expect(state.written).toEqual([{ window: 7, session: 'c', named }])
  } finally {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  }
})

it('rejects the generated CLI command when --text is missing', () => {
  const Write = plugin.commands.find((command) =>
    command.paths?.some((path) => path.join(' ') === SESSION_WRITE.join(' '))
  )
  if (Write === undefined) throw new Error('Missing Session CLI write')
  const cli = new Cli({ binaryName: 'macts' })
  cli.register(Write)
  expect(() => cli.process([...SESSION_WRITE, '--window-id', '7', 'c'])).toThrow()
})

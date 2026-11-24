/** Window-scoped Session identity survives tab drift without widening its Window scope. */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMcpAdapter } from '@macts/mcp'
import { plugin } from '@macts/iterm/cli'
import { createRuntime, createBearerCredential } from '@macts/runtime'
import { createApp } from '@macts/api/server'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  AppAuthorizationRequiredError,
  CollectionChangedError,
  Integer,
  InvalidSelectionError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
} from '@macts/contracts'
import { iTermContract } from '@macts/iterm/contract'
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
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-session-'))
  process.env['MACTS_HOME'] = home
  return { home }
})
setLogger(createLogger({ level: 'silent' }))
afterAll(async () => {
  closeKeyStore()
  const fs = await import('node:fs/promises')
  await fs.rm(home, { recursive: true, force: true })
})

/** Mutable membership is intentionally separate from the identifiers of the observed objects. */
interface IState {
  windows: { id: number; tabs: string[][] }[]
  reads: string[]
  failSessionRead?: boolean
  disappearedTab?: boolean
}
const int = (value: number): Integer => Integer.validate(value)
const permissions = [
  'iterm:sessions:list',
  'iterm:sessions:getWithinTab',
  'iterm:sessions:resolve',
  'iterm:windows:get',
  'iterm:tabs:get',
  'iterm:tabs:list',
]
/** Read fixture members without weakening their unknown value boundary. */
function memberOf(item: object, key: PropertyKey): unknown {
  const value: unknown = Reflect.get(item, key)
  return value
}
/** Invoke only declared getter functions, preserving their receiver and failures. */
function read(item: object, key: PropertyKey): unknown {
  const getter = memberOf(item, key)
  if (typeof getter !== 'function') throw new Error('Missing fixture getter')
  const result: unknown = Reflect.apply(getter, item, [])
  return result
}
/** Collection calls mirror only declared containment; the application has no Session collection. */
function fixture(state: IState): object {
  const missing = { exists: () => false }
  const collection = (items: () => object[]): object =>
    new Proxy(() => items(), {
      get(_target, key) {
        if (key === 'length') return items().length
        if (key === 'at') return (i: number) => items()[i] ?? missing
        if (key === 'byId')
          return (id: unknown) => items().find((item) => read(item, 'id') === id) ?? missing
        return () => items().map((item) => read(item, key))
      },
    })
  const row = (kind: string, values: Record<string, unknown>): object =>
    new Proxy(
      {},
      {
        get(_target, key) {
          if (key === 'exists') return () => !(kind === 'Tab' && state.disappearedTab)
          if (key === 'properties')
            return () => {
              state.reads.push(`${kind}.properties`)
              return values
            }
          return () => {
            state.reads.push(`${kind}.${String(key)}`)
            if (kind === 'Session' && key === 'columns' && state.failSessionRead)
              throw Object.assign(new Error('Access refused'), { errorNumber: -1743 })
            return values[String(key)] ?? null
          }
        },
      }
    )
  const session = (id: string): object =>
    row('Session', {
      id,
      uniqueID: id,
      name: `shell-${id}`,
      tty: `/dev/${id}`,
      columns: 80,
      rows: 24,
      profileName: 'Basic',
      backgroundColor: [10, 20, 30],
    })
  return {
    windows: collection(() =>
      state.windows.map((window) => {
        const tabs = collection(() =>
          window.tabs.map((ids, index) => {
            const tab = row('Tab', {
              index: index + 1,
              title: `tab-${String(index)}`,
              currentSession: ids[0] === undefined ? null : session(ids[0]),
            })
            return new Proxy(tab, {
              get(target, key) {
                return key === 'sessions'
                  ? collection(() => ids.map(session))
                  : memberOf(target, key)
              },
            })
          })
        )
        const item = row('Window', {
          id: window.id,
          name: `Window ${String(window.id)}`,
          currentSession: session(window.tabs[0]?.[0] ?? 'missing'),
        })
        return new Proxy(item, {
          get(target, key) {
            return key === 'tabs' ? tabs : memberOf(target, key)
          },
        })
      })
    ),
  }
}

/** Both localities run the actual generated operation contract and native script over the stand-in. */
async function setup(locality: 'local' | 'remote') {
  const state: IState = {
    windows: [
      { id: 7, tabs: [['a', 'b'], ['c']] },
      { id: 8, tabs: [['d'], ['e']] },
    ],
    reads: [],
  }
  const executor = createNativeExecutor({ transport: standInTransport(fixture(state)) })
  const key = await createApiKey({ name: 'Session fixture', permissions })
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
          url: 'http://sessions.test',
          fetch: (input, init) => Promise.resolve(app.fetch(new Request(input, init))),
        })
  return { state, client, app, token: key.token, executor, manifest }
}

describe.each(['local', 'remote'] as const)('Session identity via %s', (locality) => {
  it('offers the Window-scoped identity get without a Tab position', async () => {
    const { client } = await setup(locality)
    expect((await client.sessions.resolve(int(7), 'c')).id).toBe('c')
  })

  it('reads all supported fields while screen text has separate authority', async () => {
    const { state, client } = await setup(locality)
    const result = await client.sessions.get(int(7), int(0), 'b')
    expect(result).toMatchObject({
      id: 'b',
      name: 'shell-b',
      tty: '/dev/b',
      columns: 80,
      rows: 24,
      profileName: 'Basic',
      backgroundColor: { r: 10, g: 20, b: 30 },
    })
    expect(result).not.toHaveProperty('contents')
    expect(result).not.toHaveProperty('text')
    expect((await client.sessions.list(int(7), int(0))).items.map(({ id }) => id)).toEqual([
      'a',
      'b',
    ])
    expect(state.reads).not.toContain('Session.properties')
    expect(state.reads).not.toContain('Session.contents')
    expect(state.reads).not.toContain('Session.text')
  })

  it('captures Window identity and finds the same Session after reorder, close and in-Window move', async () => {
    const { state, client } = await setup(locality)
    const reference = (await client.windows.get(int(7))).currentSession
    expect(reference).toMatchObject({
      resource: 'Session',
      id: 'a',
      container: { resource: 'Window', id: 7 },
    })
    const window = state.windows[0]
    if (window === undefined || reference === null) throw new Error('Missing fixture')
    window.tabs = [['c'], ['a', 'b']]
    expect((await reference.resolve()).id).toBe('a')
    await expect(client.sessions.get(int(7), int(0), 'a')).rejects.toBeInstanceOf(
      TargetNotFoundError
    )
    window.tabs = [['a', 'b']]
    expect((await reference.resolve()).id).toBe('a')
    window.tabs = [['b'], ['a']]
    expect((await reference.resolve()).id).toBe('a')
    window.tabs = [['b'], []]
    state.windows[1]?.tabs[0]?.push('a')
    await expect(reference.resolve()).rejects.toBeInstanceOf(TargetNotFoundError)
  })

  it('hydrates a Tab currentSession with its Window rather than the positional Tab', async () => {
    const { client } = await setup(locality)
    const reference = (await client.tabs.get(int(7), int(1))).currentSession
    expect(reference).toMatchObject({ id: 'c', container: { resource: 'Window', id: 7 } })
    expect((await reference?.resolve())?.id).toBe('c')
  })

  it('preserves access failure and observed traversal inconsistency instead of returning partial results', async () => {
    const { state, client } = await setup(locality)
    const reference = (await client.windows.get(int(7))).currentSession
    state.failSessionRead = true
    await expect(client.sessions.get(int(7), int(0), 'a')).rejects.toBeInstanceOf(
      AppAuthorizationRequiredError
    )
    state.failSessionRead = false
    state.disappearedTab = true
    await expect(reference?.resolve()).rejects.toBeInstanceOf(CollectionChangedError)
  })

  it('distinguishes an empty tab from a missing window and missing Session', async () => {
    const { state, client } = await setup(locality)
    const window = state.windows[0]
    if (window === undefined) throw new Error('Missing fixture window')
    window.tabs = [[]]
    expect((await client.sessions.list(int(7), int(0))).items).toEqual([])
    await expect(client.sessions.get(int(7), int(0), 'a')).rejects.toBeInstanceOf(
      TargetNotFoundError
    )
  })

  it('rejects duplicate identity matches, missing ancestors, and out-of-range Tab positions canonically', async () => {
    const { state, client } = await setup(locality)
    const reference = (await client.windows.get(int(7))).currentSession
    state.windows[0]?.tabs[1]?.push('a')
    await expect(reference?.resolve()).rejects.toBeInstanceOf(UnexpectedValueError)
    await expect(client.sessions.get(int(8), int(0), 'a')).rejects.toMatchObject({
      details: { resource: 'Session' },
    })
    await expect(client.sessions.get(int(99), int(0), 'a')).rejects.toMatchObject({
      details: { resource: 'Window' },
    })
    await expect(client.sessions.get(int(7), int(9), 'a')).rejects.toBeInstanceOf(
      InvalidSelectionError
    )
    state.reads.length = 0
    await expect(client.sessions.get(int(7), int(-1), 'a')).rejects.toBeInstanceOf(ValidationError)
    expect(state.reads).toEqual([])
  })
})

it('uses the same Session address, output and permission checks through MCP', async () => {
  const { state, executor, manifest, token } = await setup('local')
  let allowed = true
  const runtime = createRuntime({
    executor,
    verifier: {
      verify: () =>
        Promise.resolve({ subject: 'session-reader', permissions: allowed ? permissions : [] }),
    },
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(iTermContract, manifest)
  const adapter = createMcpAdapter(runtime)
  const tool = adapter
    .listTools()
    .find(({ name }) => name === 'macts__iterm__sessions_get_within_tab')
  expect(tool?.inputSchema['required']).toEqual(['windowId', 'tabIndex', 'sessionId'])
  const context = { credential: createBearerCredential(token) }
  const input = { windowId: { integer: '7' }, tabIndex: { integer: '0' }, sessionId: 'b' }
  const result = await adapter.callTool('macts__iterm__sessions_get_within_tab', input, context)
  expect(result.isError).not.toBe(true)
  const content = result.content[0]
  if (content?.type !== 'text') throw new Error('Missing MCP text result')
  expect(JSON.parse(content.text)).toMatchObject({ result: { id: 'b', rows: { integer: '24' } } })
  const identity = await adapter.callTool(
    'macts__iterm__sessions_resolve',
    { windowId: { integer: '7' }, sessionId: 'c' },
    context
  )
  const identityContent = identity.content[0]
  if (identityContent?.type !== 'text') throw new Error('Missing identity get result')
  expect(JSON.parse(identityContent.text)).toMatchObject({ result: { id: 'c' } })
  state.reads.length = 0
  allowed = false
  expect(
    (await adapter.callTool('macts__iterm__sessions_get_within_tab', input, context)).isError
  ).toBe(true)
  expect(state.reads).toEqual([])
  allowed = true
  expect(
    (
      await adapter.callTool(
        'macts__iterm__sessions_get_within_tab',
        { ...input, tabIndex: { integer: '-1' } },
        context
      )
    ).isError
  ).toBe(true)
  expect(state.reads).toEqual([])
})

/**
 * The CLI path of each Session read: the get selects a Tab, so it sits under
 * the Tab; the resolve is addressed by its Window alone, so it sits under the
 * Window.
 */
const SESSION_READ_PATHS = {
  get: 'iterm windows tabs sessions get',
  resolve: 'iterm windows sessions resolve',
} as const

it.each(['get', 'resolve'] as const)(
  'reads the Session through the generated CLI %s operation',
  async (operation) => {
    const { app, token } = await setup('remote')
    const Get = plugin.commands.find((command) =>
      command.paths?.some((path) => path.join(' ') === SESSION_READ_PATHS[operation])
    )
    if (Get === undefined) throw new Error('Missing Session CLI get')
    const command = new Get()
    let stdout = ''
    let stderr = ''
    const sessionId = operation === 'get' ? 'b' : 'c'
    for (const [key, value] of Object.entries({
      windowId: '7',
      ...(operation === 'get' ? { tabIndex: '0' } : {}),
      sessionId,
      json: true,
    }))
      Reflect.set(command, key, value)
    Reflect.set(command, 'context', {
      stdout: {
        write: (value: string) => {
          stdout += value
        },
      },
      stderr: {
        write: (value: string) => {
          stderr += value
        },
      },
    })
    vi.stubEnv('MACTS_API_KEY', token)
    vi.stubEnv('MACTS_API_URL', 'http://sessions.test')
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      app.fetch(new Request(input, init))
    )
    try {
      expect(await command.execute()).toBe(0)
      expect(stderr).toBe('')
      expect(JSON.parse(stdout)).toMatchObject({
        data: { id: sessionId, name: `shell-${sessionId}`, rows: 24 },
      })
    } finally {
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    }
  }
)

it('rejects invalid address positions before governance is consulted', async () => {
  const { executor, manifest, token, state } = await setup('local')
  let governanceLoads = 0
  const runtime = createRuntime({
    executor,
    verifier: { verify: () => Promise.resolve({ subject: 'reader', permissions }) },
    governance: {
      policy: ALLOW_ALL_POLICY,
      keyPolicies: {
        // This fixture holds no cached policy entries.
        invalidate: () => undefined,
        resolve: () => {
          governanceLoads++
          return Promise.reject(new Error('Invalid input must not resolve policy'))
        },
      },
    },
  })
  runtime.registerContract(iTermContract, manifest)
  const result = await createMcpAdapter(runtime).callTool(
    'macts__iterm__sessions_get_within_tab',
    { windowId: { integer: '7' }, tabIndex: { integer: '-1' }, sessionId: 'a' },
    { credential: createBearerCredential(token) }
  )
  const content = result.content[0]
  if (content?.type !== 'text') throw new Error('Missing error envelope')
  expect(JSON.parse(content.text)).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
  expect(governanceLoads).toBe(0)
  expect(state.reads).toEqual([])
})

it('rejects malformed raw reference containers before any app read', async () => {
  const { app, token, state } = await setup('remote')
  const window = { resource: 'Window', form: 'identity', cardinality: 'one', id: { integer: '7' } }
  const session = { resource: 'Session', form: 'identity', cardinality: 'one', id: 'a' }
  for (const reference of [
    session,
    { ...session, container: { ...window, resource: 'Tab' } },
    { ...session, container: { ...window, id: '7' } },
    { ...session, container: { ...window, app: 'foreign' } },
  ]) {
    const response = await app.fetch(
      new Request('http://sessions.test/references/v1/resolve', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ app: 'iterm', reference }),
      })
    )
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    expect(state.reads).toEqual([])
  }
})

it.each(['local', 'remote'] as const)(
  'hydrates current-session references from a Tab list through %s',
  async (locality) => {
    const { client } = await setup(locality)
    const page = await client.tabs.list(int(7))
    expect(
      page.items.map(({ currentSession }) =>
        currentSession?.form === 'identity' ? currentSession.id : undefined
      )
    ).toEqual(['a', 'c'])
    expect((await page.items[0]?.currentSession?.resolve())?.id).toBe('a')
  }
)

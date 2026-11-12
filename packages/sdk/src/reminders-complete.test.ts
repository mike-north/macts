/** Completion is a property-backed convenience across the shipped surfaces. */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import { AppManifestSchema, createNativeExecutor } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { PermissionDeniedError, TargetNotFoundError } from '@macts/contracts'
import { remindersContract } from '@macts/reminders/contract'
import { plugin } from '@macts/reminders/cli'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createBearerCredential,
  createRuntime,
} from '@macts/runtime'
import { createMcpAdapter } from '@macts/mcp'
import { createClient as local } from './local-client.js'
import { createClient as remote } from './remote.js'

const { home } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-reminders-complete-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { home }
})
afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(home, { recursive: true, force: true })
})

/** Mutable records make both selected and untouched state observable. */
function fixture() {
  const rows = [
    { id: 'one', completed: false },
    { id: 'two', completed: false },
  ]
  const reminders = {
    byId(id: string) {
      const row = rows.find((entry) => entry.id === id)
      return row === undefined
        ? { exists: () => false }
        : {
            exists: () => true,
            get completed() {
              return row.completed
            },
            set completed(value: boolean) {
              row.completed = value
            },
          }
    },
  }
  return { rows, executor: createNativeExecutor({ transport: standInTransport({ reminders }) }) }
}

const permission = 'reminders:reminders:update'
async function setup(granted: boolean) {
  const state = fixture()
  const key = await createApiKey({
    name: 'completion fixture',
    permissions: granted ? [permission] : [],
  })
  const manifest = AppManifestSchema.parse(await remindersContract.loadManifest())
  const app = createApp([], {
    cors: false,
    prettyJson: false,
    executor: state.executor,
    governance: { policy: ALLOW_ALL_POLICY },
    register: (registrar) => {
      registrar.registerContract(remindersContract, manifest)
    },
  })
  const fetch: typeof globalThis.fetch = async (input, init) => app.fetch(new Request(input, init))
  return { ...state, key, manifest, app, fetch }
}

describe.each(['local', 'remote'] as const)('%s SDK completion', (kind) => {
  it('sets only the selected reminder', async () => {
    const s = await setup(true)
    const client =
      kind === 'local'
        ? local(remindersContract, {
            token: s.key.token,
            executor: s.executor,
            governance: { policy: ALLOW_ALL_POLICY },
          })
        : remote(remindersContract, {
            token: s.key.token,
            url: 'http://macts.test',
            fetch: s.fetch,
          })
    await client.reminders.complete('two')
    expect(s.rows).toEqual([
      { id: 'one', completed: false },
      { id: 'two', completed: true },
    ])
  })
  it('rejects missing targets with the canonical error', async () => {
    const s = await setup(true)
    const client =
      kind === 'local'
        ? local(remindersContract, {
            token: s.key.token,
            executor: s.executor,
            governance: { policy: ALLOW_ALL_POLICY },
          })
        : remote(remindersContract, {
            token: s.key.token,
            url: 'http://macts.test',
            fetch: s.fetch,
          })
    await expect(client.reminders.complete('missing')).rejects.toBeInstanceOf(TargetNotFoundError)
    expect(s.rows.every((row) => !row.completed)).toBe(true)
  })
  it('refuses a caller without update permission before mutation', async () => {
    const s = await setup(false)
    const client =
      kind === 'local'
        ? local(remindersContract, {
            token: s.key.token,
            executor: s.executor,
            governance: { policy: ALLOW_ALL_POLICY },
          })
        : remote(remindersContract, {
            token: s.key.token,
            url: 'http://macts.test',
            fetch: s.fetch,
          })
    await expect(client.reminders.complete('two')).rejects.toBeInstanceOf(PermissionDeniedError)
    expect(s.rows.every((row) => !row.completed)).toBe(true)
  })
})

it('the generated CLI completes the selected reminder', async () => {
  const s = await setup(true)
  const Command = plugin.commands.find((command) =>
    command.paths?.some((path) => path.join(' ') === 'reminders lists reminders complete')
  )
  if (Command === undefined) throw new Error('Missing completion command')
  let allowed = true
  const app = createApp([], {
    cors: false,
    prettyJson: false,
    executor: s.executor,
    verifier: {
      verify: () =>
        Promise.resolve({ subject: 'operator', permissions: allowed ? [permission] : [] }),
    },
    governance: { policy: ALLOW_ALL_POLICY },
    register: (registrar) => {
      registrar.registerContract(remindersContract, s.manifest)
    },
  })
  const command = new Command()
  let stderr = ''
  Reflect.set(command, 'json', true)
  Reflect.set(command, 'reminderId', 'missing')
  Reflect.set(command, 'context', {
    stdout: { write: () => undefined },
    stderr: {
      write: (value: string) => {
        stderr += value
      },
    },
  })
  vi.stubEnv('MACTS_API_KEY', s.key.token)
  vi.stubEnv('MACTS_API_URL', 'http://macts.test')
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) =>
    app.fetch(new Request(input, init))
  )
  try {
    expect(await command.execute()).toBe(1)
    expect(JSON.parse(stderr)).toMatchObject({ error: { code: 'TARGET_NOT_FOUND' } })
    expect(s.rows.every((row) => !row.completed)).toBe(true)
    Reflect.set(command, 'reminderId', 'two')
    stderr = ''
    allowed = false
    expect(await command.execute()).toBe(1)
    expect(JSON.parse(stderr)).toMatchObject({ error: { code: 'PERMISSION_DENIED' } })
    expect(s.rows.every((row) => !row.completed)).toBe(true)
    allowed = true
    expect(await command.execute()).toBe(0)
  } finally {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  }
  expect(s.rows).toEqual([
    { id: 'one', completed: false },
    { id: 'two', completed: true },
  ])
})

it('the MCP tool completes the selected reminder', async () => {
  const s = await setup(true)
  let allowed = true
  const runtime = createRuntime({
    executor: s.executor,
    verifier: {
      verify: () =>
        Promise.resolve({ subject: 'operator', permissions: allowed ? [permission] : [] }),
    },
    governance: { policy: ALLOW_ALL_POLICY },
  })
  runtime.registerContract(remindersContract, s.manifest)
  const adapter = createMcpAdapter(runtime)
  const context = { credential: createBearerCredential(s.key.token) }
  const missing = await adapter.callTool(
    'macts__reminders__reminders_complete',
    { id: 'missing' },
    context
  )
  expect(missing.isError).toBe(true)
  expect(missing.content[0]).toMatchObject({ type: 'text' })
  if (missing.content[0]?.type !== 'text') throw new Error('Expected structured error')
  expect(JSON.parse(missing.content[0].text)).toMatchObject({ error: { code: 'TARGET_NOT_FOUND' } })
  allowed = false
  const denied = await adapter.callTool(
    'macts__reminders__reminders_complete',
    { id: 'two' },
    context
  )
  expect(denied.isError).toBe(true)
  if (denied.content[0]?.type !== 'text') throw new Error('Expected structured error')
  expect(JSON.parse(denied.content[0].text)).toMatchObject({ error: { code: 'PERMISSION_DENIED' } })
  expect(s.rows.every((row) => !row.completed)).toBe(true)
  allowed = true
  const result = await adapter.callTool(
    'macts__reminders__reminders_complete',
    { id: 'two' },
    { credential: createBearerCredential(s.key.token) }
  )
  expect(result.isError).not.toBe(true)
  expect(s.rows).toEqual([
    { id: 'one', completed: false },
    { id: 'two', completed: true },
  ])
})

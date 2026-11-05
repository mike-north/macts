/**
 * iTerm windows and tabs, through both client factories, with the real
 * generated iTerm contract and the real native executor.
 *
 * iTerm's dictionary gives a tab no id: the app addresses a tab only by its
 * position within its window, and the manifest marks Tab positional, with
 * curated evidence (phases/13 D10, positional resources). Expected values are
 * written by hand from the manifest and from D7 ("Emitted forms") and D11:
 *
 * - a window is got by its integer id at the application; a tab is listed and
 *   got within its window, by its zero-based position there;
 * - a window's `currentTab` is an index selector within the window the record
 *   was read through, `{form: 'selector', cardinality: 'one', selector: {by:
 *   'index', index}, container: <the window, in identity form>}`, with the
 *   position the app's specifier for the tab gives, not the tab's dictionary
 *   `index` property;
 * - resolving it finds the window, then the tab at that position, as the tab
 *   get does;
 * - a position past the window's tabs is `InvalidSelectionError` naming Tab,
 *   and a missing window is `TargetNotFoundError` naming Window.
 *
 * Each native case runs with only the executor's transport replaced: it
 * evaluates the composed script against a stand-in iTerm in an isolated
 * context, whose tabs' dictionary `index` counts from 1 so that it would
 * mislead. The remote client reaches the real API app, with the contract
 * registered and the same executor behind it, so both localities run the same
 * pipeline (D5).
 *
 * @see ../../../manifests/iterm/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D5, D7, D10, D11)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@macts/api/server'
import { AppManifestSchema, createNativeExecutor, type AppManifest } from '@macts/core'
import {
  nativeReadKeys,
  standInPanes,
  standInTransport,
  type StandInPaneWindow,
} from '@macts/core/testing'
import { Integer, InvalidSelectionError, TargetNotFoundError } from '@macts/contracts'
import { iTermContract, type iTermClient } from '@macts/iterm/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient as createLocalClient } from './local-client.js'
import { createClient as createRemoteClient } from './remote.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-iterm-window-tabs-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** The iTerm manifest, validated as the runtime validates it. */
async function itermManifest(): Promise<AppManifest> {
  return AppManifestSchema.parse(await iTermContract.loadManifest())
}

/** Two windows, front to back. Window 8's current tab is its second, at position 1. */
const WINDOWS: readonly StandInPaneWindow[] = [
  { id: 7, name: 'Front', tabs: [{ title: 'Shell' }] },
  { id: 8, name: 'Back', tabs: [{ title: 'Build' }, { title: 'Tests' }], currentTab: 1 },
]

/** Every record key `keys` names that `known` does not, with no value. */
function nullFields(keys: readonly string[], known: readonly string[]): Record<string, null> {
  return Object.fromEntries(keys.filter((key) => !known.includes(key)).map((key) => [key, null]))
}

/** A native executor against a stand-in iTerm holding {@link WINDOWS}. */
async function standInExecutor(lookups: string[]) {
  const manifest = await itermManifest()
  const windowKeys = nativeReadKeys(manifest, 'Window', manifest.resources['Window'])
  const tabKeys = nativeReadKeys(manifest, 'Tab', manifest.resources['Tab'])
  const { app, automation } = standInPanes(WINDOWS, {
    lookups,
    display: (windowId, position) =>
      `Application("iTerm").windows.byId(${String(windowId)}).tabs.at(${String(position)})`,
    windowFields: nullFields(windowKeys.get, ['id', 'name', 'currentTab']),
    tabFields: nullFields(tabKeys.get, ['index', 'title']),
  })
  return createNativeExecutor({ transport: standInTransport(app, [], automation) })
}

/** The permissions of every window and tab read. */
const PERMISSIONS = [
  'iterm:windows:list',
  'iterm:windows:get',
  'iterm:tabs:list',
  'iterm:tabs:get',
] as const

/** A client of each locality, both over a stand-in iTerm that records its lookups. */
const FACTORIES: readonly {
  readonly name: string
  readonly build: (lookups: string[]) => Promise<iTermClient>
}[] = [
  {
    name: 'the local client',
    async build(lookups) {
      const key = await createApiKey({ name: 'iTerm stub test', permissions: [...PERMISSIONS] })
      return createLocalClient(iTermContract, {
        token: key.token,
        executor: await standInExecutor(lookups),
        governance: { policy: ALLOW_ALL_POLICY },
      })
    },
  },
  {
    name: 'the remote client',
    async build(lookups) {
      const key = await createApiKey({ name: 'iTerm stub test', permissions: [...PERMISSIONS] })
      const manifest = await itermManifest()
      const app = createApp([], {
        cors: false,
        prettyJson: false,
        executor: await standInExecutor(lookups),
        governance: { policy: ALLOW_ALL_POLICY },
        register: (registrar) => {
          registrar.registerContract(iTermContract, manifest)
        },
      })
      const fetch: typeof globalThis.fetch = async (input, init) =>
        app.fetch(new Request(input, init))
      return createRemoteClient(iTermContract, {
        token: key.token,
        url: 'http://macts.test',
        fetch,
      })
    },
  },
]

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

/** The `details` of an error of class `type`; fails for any other error. */
function detailsOf(
  error: unknown,
  type: typeof TargetNotFoundError | typeof InvalidSelectionError
) {
  expect(error).toBeInstanceOf(type)
  return error instanceof type ? error.details : undefined
}

/** The data of the index selector for the tab at `position` within the window `windowId`. */
function tabAt(windowId: number, position: number) {
  return {
    app: 'iterm',
    resource: 'Tab',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: position },
    container: {
      app: 'iterm',
      resource: 'Window',
      form: 'identity',
      cardinality: 'one',
      id: windowId,
    },
  }
}

const int = (value: number): Integer => Integer.validate(value)

/** The wire form of an identity reference to the window `id`. */
function window(id: number): object {
  return { resource: 'Window', form: 'identity', cardinality: 'one', id: { integer: String(id) } }
}

describe('the generated iTerm contract', () => {
  it('gets and lists windows at the application, and tabs within their window', () => {
    const { Window, Tab } = iTermContract.resources
    expect({ get: Window.get, list: Window.list }).toEqual({
      get: 'iterm.windows.get',
      list: 'iterm.windows.list',
    })
    expect({ get: Tab.get, list: Tab.list, parents: Tab.parents }).toEqual({
      get: 'iterm.tabs.get',
      list: 'iterm.tabs.list',
      parents: { get: 'Window', list: 'Window' },
    })
    // A tab has no identifier.
    expect('id' in Tab).toBe(false)
  })

  it('gets a tab by its window and its position', () => {
    const get = iTermContract.operations['iterm.tabs.get']
    expect(get?.target).toEqual({ command: 'getTab', resource: 'Tab' })
    expect(get?.inputJsonSchema?.['required']).toEqual(['windowId', 'index'])
  })

  it("plans a window's current tab as the index selector the codec emits", () => {
    const plan = iTermContract.resources.Window.record.plan
    const field = plan.kind === 'record' ? plan.fields['currentTab'] : undefined
    expect(field?.value).toEqual({
      kind: 'nullable',
      value: { kind: 'reference', resource: 'Tab', cardinality: 'one', form: 'index' },
    })
  })

  it("rejects a tab in identity form at a window's current tab (D11)", () => {
    const output = iTermContract.operations['iterm.windows.get']?.output
    const plan = iTermContract.resources.Window.record.plan
    const fields = plan.kind === 'record' ? Object.keys(plan.fields) : []
    // A window record with no value but its id and its current tab.
    const record = (currentTab: object) => ({
      ...nullFields(fields, []),
      id: { integer: '7' },
      currentTab: { reference: currentTab },
    })
    const container = window(7)
    const position = { by: 'index', index: { integer: '0' } }
    const selector = { resource: 'Tab', form: 'selector', cardinality: 'one', selector: position }
    expect(output?.wire.safeParse(record({ ...selector, container })).success).toBe(true)
    const identity = { resource: 'Tab', form: 'identity', cardinality: 'one', id: { integer: '0' } }
    expect(output?.wire.safeParse(record({ ...identity, container })).success).toBe(false)
    // Nor is a tab without its window.
    expect(output?.wire.safeParse(record(selector)).success).toBe(false)
  })
})

describe.each(FACTORIES)("a window's current tab, through $name", ({ build }) => {
  it('is an index selector within the window, at the position the specifier gives', async () => {
    const client = await build([])
    const window = await client.windows.get(int(8))
    // The tab's dictionary index is 2; its position in the window is 1.
    expect(window.currentTab).toMatchObject(tabAt(8, 1))
  })

  it('gives each listed window’s current tab its own window', async () => {
    const client = await build([])
    const page = await client.windows.list()
    expect(page.items.map(({ currentTab }) => currentTab)).toMatchObject([tabAt(7, 0), tabAt(8, 1)])
  })

  it('resolves within its window, to the tab at that position', async () => {
    const lookups: string[] = []
    const client = await build(lookups)
    const window = await client.windows.get(int(8))
    lookups.length = 0
    const tab = await window.currentTab?.resolve()
    expect(tab).toMatchObject({ index: 2, title: 'Tests' })
    expect(lookups).toEqual(['windows.byId(8)', 'windows.byId(8).tabs.at(1)'])
  })
})

describe.each(FACTORIES)('a tab get by position, through $name', ({ build }) => {
  it('reads the tab at the position within its window', async () => {
    const client = await build([])
    await expect(client.tabs.get(int(8), int(0))).resolves.toMatchObject({ title: 'Build' })
  })

  it('fails with InvalidSelectionError naming Tab for a position past the window’s tabs', async () => {
    const client = await build([])
    const error = await rejectionOf(client.tabs.get(int(8), int(2)))
    expect(detailsOf(error, InvalidSelectionError)).toEqual({ resource: 'Tab' })
  })

  it('fails with TargetNotFoundError naming Window when the window is missing', async () => {
    const lookups: string[] = []
    const client = await build(lookups)
    const error = await rejectionOf(client.tabs.get(int(9), int(0)))
    expect(detailsOf(error, TargetNotFoundError)).toEqual({ resource: 'Window' })
    expect(lookups).toEqual(['windows.byId(9)'])
  })
})

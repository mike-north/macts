/**
 * Google Chrome and Microsoft Edge window and tab reads, through the local
 * client, with the real generated contracts and the real native executor.
 *
 * Both apps share the Chromium scripting dictionary: the application has
 * `window` as an element, a `window` has `tab` as an element, and the
 * application has no `tab` element. So a tab is only ever reached through its
 * window, and the manifests record that: each tab list and get names Window
 * as its parent, carried by `windowId` (phases/13 D10, command parents). No
 * app-wide tab collection is addressed, and none is invented.
 *
 * The contract cases assert, by hand from the manifests, what the generated
 * contracts declare: the resource table, each operation's target and
 * required inputs, and the parent each tab command records.
 *
 * The native cases run each operation with only the executor's transport
 * replaced: it evaluates the composed script against a stand-in app in an
 * isolated context, so the body, input and output plans and the codec are the
 * shipped ones. The stand-in has no app-wide `tabs` member at all, so a body
 * that addressed one would fail, and it records every lookup it serves and
 * every tab it makes or adds to a window.
 *
 * Edge is not installed on the Mac these were written on; its cases rest on
 * the dictionary and the stand-in, not on a live run.
 *
 * @see ../../../manifests/google-chrome/app.yaml
 * @see ../../../manifests/microsoft-edge/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D6, D7, D10)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { AppManifestSchema, createNativeExecutor, type AppManifest } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import { TargetNotFoundError, type AppContract } from '@macts/contracts'
import { googleChromeContract } from '@macts/google-chrome/contract'
import { microsoftEdgeContract } from '@macts/microsoft-edge/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-chromium-window-tab-'))
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

/** A contract's manifest, validated as the runtime validates it. */
async function manifestOf<Client>(contract: AppContract<Client>): Promise<AppManifest> {
  return AppManifestSchema.parse(await contract.loadManifest())
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

/** The `details.resource` of a `TargetNotFoundError`; fails for any other error. */
function missingResourceOf(error: unknown): unknown {
  expect(error).toBeInstanceOf(TargetNotFoundError)
  return error instanceof TargetNotFoundError ? error.details : undefined
}

describe('the generated Google Chrome contract', () => {
  it('reads windows by get and list, and tabs by get and list', () => {
    const { Window, Tab } = googleChromeContract.resources
    expect({ get: Window.get, list: Window.list }).toEqual({
      get: 'google-chrome.windows.get',
      list: 'google-chrome.windows.list',
    })
    expect({ get: Tab.get, list: Tab.list }).toEqual({
      get: 'google-chrome.tabs.get',
      list: 'google-chrome.tabs.list',
    })
  })

  it('gets a window by its id, and lists windows with no input', () => {
    const get = googleChromeContract.operations['google-chrome.windows.get']
    expect(get?.target).toEqual({ command: 'getWindow', resource: 'Window' })
    expect(get?.permission).toBe('google-chrome:windows:get')
    expect(get?.inputJsonSchema?.['required']).toEqual(['id'])
    const list = googleChromeContract.operations['google-chrome.windows.list']
    expect(list?.target).toEqual({ command: 'listWindows', resource: 'Window' })
    expect(list?.inputJsonSchema?.['required']).toBeUndefined()
  })

  it('gets a tab by its window and its id, and lists the tabs of one window', () => {
    const get = googleChromeContract.operations['google-chrome.tabs.get']
    expect(get?.target).toEqual({ command: 'getTab', resource: 'Tab' })
    expect(get?.permission).toBe('google-chrome:tabs:get')
    expect(get?.inputJsonSchema?.['required']).toEqual(['windowId', 'id'])
    const list = googleChromeContract.operations['google-chrome.tabs.list']
    expect(list?.target).toEqual({ command: 'listTabs', resource: 'Tab' })
    expect(list?.inputJsonSchema?.['required']).toEqual(['windowId'])
  })

  it('records Window as the parent of both tab reads, carried by windowId', async () => {
    const { Window, Tab } = googleChromeContract.resources
    expect(Tab.parents).toEqual({ get: 'Window', list: 'Window' })
    expect('parents' in Window).toBe(false)
    const manifest = await manifestOf(googleChromeContract)
    const parent = { resource: 'Window', parameter: 'windowId' }
    expect(manifest.commands['getTab']?.parent).toEqual(parent)
    expect(manifest.commands['listTabs']?.parent).toEqual(parent)
    expect(manifest.commands['getWindow']?.parent).toBeUndefined()
    expect(manifest.commands['listWindows']?.parent).toBeUndefined()
  })

  it('claims window and tab ids unique on the dictionary, only within the running session', async () => {
    const manifest = await manifestOf(googleChromeContract)
    // The dictionary's own description of each id property is the basis; a
    // live sample of one window and one tab cannot show distinctness.
    const dictionaryText = {
      Window: 'The unique identifier of the window.',
      Tab: 'Unique ID of the tab.',
    }
    for (const [resource, text] of Object.entries(dictionaryText)) {
      const [identifier] = manifest.resources[resource]?.identifiers ?? []
      expect(identifier).toMatchObject({ property: 'id', primary: true, unique: true })
      expect(identifier?.evidence?.unique?.source).toBe('sdef')
      expect(identifier?.evidence?.unique?.note).toContain(`"${text}"`)
      expect(identifier?.evidence?.unique?.note).toContain('within the running Chrome session')
    }
  })

  it('rejects a tab get without its window before anything runs', () => {
    const get = googleChromeContract.operations['google-chrome.tabs.get']
    const encoded = get?.input.encode({ id: 'T1' })
    expect(encoded?.ok).toBe(false)
  })

  it("leaves a window's active tab out of its record until references carry their window", () => {
    const plan = googleChromeContract.resources.Window.record.plan
    expect(plan.kind).toBe('record')
    if (plan.kind === 'record') expect(Object.keys(plan.fields)).not.toContain('activeTab')
  })
})

describe('the generated Microsoft Edge contract', () => {
  it('gets a tab by its window and its id', async () => {
    const get = microsoftEdgeContract.operations['microsoft-edge.tabs.get']
    expect(get?.target).toEqual({ command: 'getTab', resource: 'Tab' })
    expect(get?.inputJsonSchema?.['required']).toEqual(['windowId', 'id'])
    expect(get?.input.encode({ id: 'T1' }).ok).toBe(false)
    expect(microsoftEdgeContract.resources.Tab.parents).toEqual({ get: 'Window', list: 'Window' })
    const manifest = await manifestOf(microsoftEdgeContract)
    const parent = { resource: 'Window', parameter: 'windowId' }
    expect(manifest.commands['getTab']?.parent).toEqual(parent)
    expect(manifest.commands['listTabs']?.parent).toEqual(parent)
  })

  it("leaves a window's active tab out of its record until references carry their window", () => {
    const plan = microsoftEdgeContract.resources.Window.record.plan
    expect(plan.kind).toBe('record')
    if (plan.kind === 'record') expect(Object.keys(plan.fields)).not.toContain('activeTab')
  })
})

// ---------------------------------------------------------------------------
// The stand-in Chromium app
// ---------------------------------------------------------------------------

/** One stand-in tab: its id and title. */
interface TabRow {
  readonly id: string
  readonly title: string
}

/** One stand-in window: its id, title and tabs. */
interface WindowRow {
  readonly id: string
  readonly name: string
  readonly tabs: readonly TabRow[]
}

/**
 * The native record of a stand-in window: every window property the contract
 * declares, keyed by the app's name for it, with no value for most.
 */
function windowRecord(row: WindowRow, index: number): Record<string, unknown> {
  return {
    givenName: null,
    name: row.name,
    id: row.id,
    index: index + 1,
    bounds: null,
    closeable: true,
    minimizable: true,
    minimized: false,
    resizable: true,
    visible: true,
    zoomable: true,
    zoomed: false,
    mode: 'normal',
    activeTabIndex: 1,
  }
}

/**
 * The native record of a stand-in tab, keyed by the app's name for each
 * property. Chrome's manifest records the app's spelling `url` for its `uRL`
 * property; Edge's records none, so its record carries `uRL`.
 */
function tabRecord(row: TabRow, urlKey: string): Record<string, unknown> {
  return { id: row.id, title: row.title, [urlKey]: `https://example.com/${row.id}`, loading: false }
}

/**
 * A stand-in element collection, as the automation bridge presents one:
 * calling it lists its item specifiers, reading a property of it reads that
 * property of every item in order, and `byId` finds one item, recorded in
 * `lookups` as `<label>.byId(<id>)`. An id it does not hold gives a
 * specifier that does not exist.
 */
function collection(
  label: string,
  items: readonly { readonly id: string; readonly specifier: object }[],
  records: readonly Record<string, unknown>[],
  lookups: string[]
): object {
  const list = (): object[] => items.map((item) => item.specifier)
  // Defined rather than assigned: a function's own `name` and `length` are
  // read-only, and a window has a `name` property.
  const column = (key: string) => ({ value: () => records.map((record) => record[key]) })
  for (const key of Object.keys(records[0] ?? { id: null })) {
    Object.defineProperty(list, key, column(key))
  }
  return Object.assign(list, {
    byId(id: unknown) {
      lookups.push(`${label}.byId(${String(id)})`)
      return items.find((item) => item.id === id)?.specifier ?? { exists: () => false }
    },
  })
}

/** The id the stand-in gives a tab it makes. */
const NEW_TAB_ID = 'T-new'

/**
 * A stand-in Chromium app holding `windows`, front to back. It has a
 * `windows` collection and a `Tab` maker, and no app-wide `tabs`. Each tab it
 * makes is recorded in `writes` as `make Tab`, and each tab added to a
 * window's tabs as `<label>.push`, so a test can tell whether anything was
 * created or placed under a window.
 */
function standInChromium(
  windows: readonly WindowRow[],
  urlKey: string,
  lookups: string[],
  writes: string[] = []
) {
  const windowRecords = windows.map(windowRecord)
  const windowItems = windows.map((row, index) => {
    const tabRecords = row.tabs.map((tab) => tabRecord(tab, urlKey))
    const tabItems = row.tabs.map((tab, tabIndex) => ({
      id: tab.id,
      specifier: { exists: () => true, properties: () => tabRecords[tabIndex] },
    }))
    const label = `windows.byId(${row.id}).tabs`
    const tabs = Object.assign(collection(label, tabItems, tabRecords, lookups), {
      push() {
        writes.push(`${label}.push`)
      },
    })
    return {
      id: row.id,
      specifier: { exists: () => true, properties: () => windowRecords[index], tabs },
    }
  })
  return {
    windows: collection('windows', windowItems, windowRecords, lookups),
    Tab(props: Readonly<Record<string, unknown>>) {
      writes.push('make Tab')
      const record = tabRecord({ id: NEW_TAB_ID, title: '' }, urlKey)
      return { properties: () => ({ ...record, ...props }) }
    },
  }
}

/** Two windows, front to back, each with its own tabs. */
const WINDOWS: readonly WindowRow[] = [
  {
    id: 'W1',
    name: 'Front',
    tabs: [
      { id: 'T11', title: 'One' },
      { id: 'T12', title: 'Two' },
    ],
  },
  { id: 'W2', name: 'Back', tabs: [{ id: 'T21', title: 'Three' }] },
]

/** A local Google Chrome client over a stand-in holding {@link WINDOWS}. */
async function chromeClient(lookups: string[]) {
  const key = await createApiKey({
    name: 'Chrome window and tab test',
    permissions: [
      'google-chrome:windows:list',
      'google-chrome:windows:get',
      'google-chrome:tabs:list',
      'google-chrome:tabs:get',
    ],
  })
  return createClient(googleChromeContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({
      transport: standInTransport(standInChromium(WINDOWS, 'url', lookups)),
    }),
  })
}

/**
 * A local Microsoft Edge client over a stand-in holding {@link WINDOWS}; the
 * stand-in records the tabs it makes and places in `writes`.
 */
async function edgeClient(lookups: string[], writes: string[] = []) {
  const key = await createApiKey({
    name: 'Edge tab test',
    permissions: [
      'microsoft-edge:tabs:get',
      'microsoft-edge:tabs:list',
      'microsoft-edge:tabs:create',
    ],
  })
  return createClient(microsoftEdgeContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({
      transport: standInTransport(standInChromium(WINDOWS, 'uRL', lookups, writes)),
    }),
  })
}

describe('Google Chrome windows, read through the local client', () => {
  it('lists every window, front to back', async () => {
    const client = await chromeClient([])
    const page = await client.windows.list()
    expect(page.items.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'W1', name: 'Front' },
      { id: 'W2', name: 'Back' },
    ])
    expect(page.nextCursor).toBeUndefined()
  })

  it('gets a window by its id', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const window = await client.windows.get('W2')
    expect(window).toMatchObject({ id: 'W2', name: 'Back', mode: 'normal', bounds: null })
    expect(lookups).toEqual(['windows.byId(W2)'])
  })

  it('fails with TargetNotFoundError naming Window for a window it does not have', async () => {
    const client = await chromeClient([])
    const error = await rejectionOf(client.windows.get('W9'))
    expect(missingResourceOf(error)).toEqual({ resource: 'Window' })
  })
})

describe('Google Chrome tabs, read within their window through the local client', () => {
  it('gets a tab by its id within its window', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const tab = await client.tabs.get('W2', 'T21')
    expect(tab).toEqual({
      id: 'T21',
      title: 'Three',
      uRL: 'https://example.com/T21',
      loading: false,
    })
    // The window first, then the tab within it: never an app-wide tab lookup.
    expect(lookups).toEqual(['windows.byId(W2)', 'windows.byId(W2).tabs.byId(T21)'])
  })

  it('lists the tabs of one window only, in order', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const page = await client.tabs.list('W1')
    expect(page.items.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'T11', title: 'One' },
      { id: 'T12', title: 'Two' },
    ])
    expect(page.nextCursor).toBeUndefined()
    expect(lookups).toEqual(['windows.byId(W1)'])
  })

  it('fails a tab get with TargetNotFoundError naming Window when the window is missing', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const error = await rejectionOf(client.tabs.get('W9', 'T21'))
    expect(missingResourceOf(error)).toEqual({ resource: 'Window' })
    // No tab is looked up in a window that does not exist.
    expect(lookups).toEqual(['windows.byId(W9)'])
  })

  it('fails a tab list with TargetNotFoundError naming Window when the window is missing', async () => {
    const client = await chromeClient([])
    const error = await rejectionOf(client.tabs.list('W9'))
    expect(missingResourceOf(error)).toEqual({ resource: 'Window' })
  })

  it('fails with TargetNotFoundError naming Tab for a tab its window does not have', async () => {
    const client = await chromeClient([])
    // T11 is a tab of W1, not of W2: a tab is found only within its own window.
    for (const id of ['T99', 'T11']) {
      const error = await rejectionOf(client.tabs.get('W2', id))
      expect(missingResourceOf(error)).toEqual({ resource: 'Tab' })
    }
  })
})

describe('Microsoft Edge tabs, read within their window through the local client', () => {
  it('gets a tab by its id within its window', async () => {
    const lookups: string[] = []
    const client = await edgeClient(lookups)
    const tab = await client.tabs.get('W2', 'T21')
    expect(tab).toMatchObject({ id: 'T21', title: 'Three', loading: false })
    expect(lookups).toEqual(['windows.byId(W2)', 'windows.byId(W2).tabs.byId(T21)'])
  })

  it('lists the tabs of one window only', async () => {
    const client = await edgeClient([])
    const page = await client.tabs.list('W2')
    expect(page.items.map(({ id }) => id)).toEqual(['T21'])
  })

  it('names Window for a missing window and Tab for a missing tab', async () => {
    const client = await edgeClient([])
    expect(missingResourceOf(await rejectionOf(client.tabs.get('W9', 'T21')))).toEqual({
      resource: 'Window',
    })
    expect(missingResourceOf(await rejectionOf(client.tabs.get('W2', 'T99')))).toEqual({
      resource: 'Tab',
    })
  })
})

// A tab is created within the window `windowId` names (the manifest's
// createTab records Window as its parent). When that window is missing, the
// failure names Window, not Tab (phases/13 D6, a missing parent), and no tab
// is made or added anywhere.
describe('Microsoft Edge tab creation, within its window through the local client', () => {
  it('creates a tab in the window it names', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await edgeClient(lookups, writes)
    const tab = await client.tabs.create({ windowId: 'W2', uRL: 'https://example.com/new' })
    expect(tab).toMatchObject({ id: NEW_TAB_ID, uRL: 'https://example.com/new' })
    expect(lookups).toEqual(['windows.byId(W2)'])
    expect(writes).toEqual(['make Tab', 'windows.byId(W2).tabs.push'])
  })

  it('fails with TargetNotFoundError naming Window when the window is missing, and makes no tab', async () => {
    const lookups: string[] = []
    const writes: string[] = []
    const client = await edgeClient(lookups, writes)
    const error = await rejectionOf(
      client.tabs.create({ windowId: 'W9', uRL: 'https://example.com/new' })
    )
    expect(missingResourceOf(error)).toEqual({ resource: 'Window' })
    expect(lookups).toEqual(['windows.byId(W9)'])
    expect(writes).toEqual([])
  })
})

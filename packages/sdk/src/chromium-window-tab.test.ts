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
 * A window's `activeTab` holds a reference to a tab, and a tab is identified
 * only within its window (phases/13 D7, container scoping). The reference is
 * read through the window's own record, so it carries that window as its
 * container: the window a get read, or each listed window for its own row.
 * Resolving it finds the window first, then the tab within it, as the tab
 * get does. Chrome and Edge window and tab ids identify them within the
 * running browser session only, so no global tab id is invented.
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
import {
  standInChromium,
  standInTransport,
  STAND_IN_NEW_TAB_ID as NEW_TAB_ID,
  type StandInWindow,
} from '@macts/core/testing'
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
import { bindReference, createClient } from './local.js'

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

  it("declares a window's active tab as a reference to a tab, which needs its window as container", () => {
    expectActiveTabNeedsItsWindow(googleChromeContract)
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

  it("declares a window's active tab as a reference to a tab, which needs its window as container", () => {
    expectActiveTabNeedsItsWindow(microsoftEdgeContract)
  })
})

/**
 * Asserts that `contract` declares a window's `activeTab` as a nullable
 * reference to Tab, and that its window record admits the reference only
 * with an identity reference to a window as its container: the tab table
 * entry records Window as the parent its get finds a tab within.
 */
function expectActiveTabNeedsItsWindow<Client>(contract: AppContract<Client>): void {
  const window = contract.resources['Window']
  const plan = window?.record.plan
  expect(plan?.kind).toBe('record')
  if (plan?.kind !== 'record') return
  expect(plan.fields['activeTab']).toEqual({
    presence: 'required',
    value: { kind: 'nullable', value: { kind: 'reference', resource: 'Tab', cardinality: 'one' } },
  })
  expect(contract.resources['Tab']?.parents).toEqual({ get: 'Window', list: 'Window' })
  const tab = { resource: 'Tab', form: 'identity', cardinality: 'one', id: 'T11' }
  const inWindow = { ...tab, container: { ...tab, resource: 'Window', id: 'W1' } }
  // Every other field of the record has no value but the window's id.
  const record = {
    ...Object.fromEntries(Object.keys(plan.fields).map((key) => [key, null])),
    id: 'W1',
  }
  const wire = window?.record.wire
  expect(wire?.safeParse({ ...record, activeTab: { reference: inWindow } }).success).toBe(true)
  expect(wire?.safeParse({ ...record, activeTab: { reference: tab } }).success).toBe(false)
  expect(wire?.safeParse({ ...record, activeTab: null }).success).toBe(true)
}

// ---------------------------------------------------------------------------
// The stand-in Chromium app
// ---------------------------------------------------------------------------

/** Two windows, front to back, each with its own tabs; the front one's second tab is active. */
const WINDOWS: readonly StandInWindow[] = [
  {
    id: 'W1',
    name: 'Front',
    tabs: [
      { id: 'T11', title: 'One' },
      { id: 'T12', title: 'Two' },
    ],
    activeTab: 'T12',
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
      transport: standInTransport(standInChromium(WINDOWS, { urlKey: 'url', lookups })),
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
      'microsoft-edge:windows:get',
      'microsoft-edge:tabs:get',
      'microsoft-edge:tabs:list',
      'microsoft-edge:tabs:create',
    ],
  })
  return createClient(microsoftEdgeContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({
      transport: standInTransport(standInChromium(WINDOWS, { urlKey: 'uRL', lookups, writes })),
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

/** A single identity reference to the tab `id` within the window `windowId`, as data. */
function tabIn<App extends string>(app: App, windowId: string, id: string) {
  return {
    app,
    resource: 'Tab',
    form: 'identity',
    cardinality: 'one',
    id,
    container: { app, resource: 'Window', form: 'identity', cardinality: 'one', id: windowId },
  } as const
}

describe("a window's active tab, read with its window through the local client", () => {
  it('carries the window a get read as the tab reference’s container', async () => {
    const client = await chromeClient([])
    const window = await client.windows.get('W1')
    expect(window.activeTab).toMatchObject({
      resource: 'Tab',
      form: 'identity',
      cardinality: 'one',
      id: 'T12',
      container: { resource: 'Window', form: 'identity', cardinality: 'one', id: 'W1' },
    })
  })

  it('gives each listed window’s active tab its own window', async () => {
    const client = await chromeClient([])
    const page = await client.windows.list()
    expect(
      page.items.map(({ activeTab }) => ({
        tab: activeTab?.form === 'identity' ? activeTab.id : undefined,
        window: activeTab?.container?.form === 'identity' ? activeTab.container.id : undefined,
      }))
    ).toEqual([
      { tab: 'T12', window: 'W1' },
      { tab: 'T21', window: 'W2' },
    ])
  })

  it('resolves the active tab within its window, through the tab get', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const window = await client.windows.get('W2')
    lookups.length = 0
    const tab = await window.activeTab?.resolve()
    expect(tab).toEqual({
      id: 'T21',
      title: 'Three',
      uRL: 'https://example.com/T21',
      loading: false,
    })
    expect(lookups).toEqual(['windows.byId(W2)', 'windows.byId(W2).tabs.byId(T21)'])
  })

  it('resolves a tab reference a caller builds with its window, and names what is missing', async () => {
    const lookups: string[] = []
    const client = await chromeClient(lookups)
    const resolve = (windowId: string, id: string) =>
      bindReference(client, tabIn('google-chrome', windowId, id)).resolve()
    await expect(resolve('W1', 'T11')).resolves.toMatchObject({ id: 'T11', title: 'One' })
    expect(lookups).toEqual(['windows.byId(W1)', 'windows.byId(W1).tabs.byId(T11)'])
    expect(missingResourceOf(await rejectionOf(resolve('W9', 'T11')))).toEqual({
      resource: 'Window',
    })
    // T21 is a tab of W2: within W1 it is not found, with no other check.
    expect(missingResourceOf(await rejectionOf(resolve('W1', 'T21')))).toEqual({
      resource: 'Tab',
    })
  })

  it('does the same for Microsoft Edge', async () => {
    const lookups: string[] = []
    const client = await edgeClient(lookups)
    const window = await client.windows.get('W1')
    expect(window.activeTab?.container).toMatchObject({ resource: 'Window', id: 'W1' })
    lookups.length = 0
    await expect(window.activeTab?.resolve()).resolves.toMatchObject({ id: 'T12', title: 'Two' })
    expect(lookups).toEqual(['windows.byId(W1)', 'windows.byId(W1).tabs.byId(T12)'])
    const missing = bindReference(client, tabIn('microsoft-edge', 'W9', 'T12')).resolve()
    expect(missingResourceOf(await rejectionOf(missing))).toEqual({ resource: 'Window' })
  })
})

/**
 * References that carry their container, through the native macOS executor,
 * proven on Google Chrome's windows and tabs.
 *
 * Chrome's scripting dictionary has `tab` only as an element of `window`, and
 * the manifest's tab get records Window as its parent, so a tab is identified
 * only within its window (phases/13 D7, container scoping). Expected outcomes
 * are written by hand from D7 and D9 and the manifest:
 *
 * - emission: a window's `activeTab` is read through the window's record, so
 *   the body hands the codec the tab together with that window, and the
 *   reference carries the window as its container, in identity form, with the
 *   id of the window the record was read through. Get, list and create emit it
 *   alike; a list gives each row its own window. The tab's id is read from
 *   the value the app returned, a property specifier of the window.
 * - a value at such a position that comes without its container is a macts
 *   defect, `InternalError`.
 * - decode and resolution address the container first, then the child within
 *   it, as the generated parent-scoped get does: a missing container is
 *   `TargetNotFoundError` naming Window, with no tab looked up; a missing
 *   child names Tab; in an identity collection, entry by entry.
 * - no membership check is made: a tab looked up within another window is
 *   not found, `TargetNotFoundError` naming Tab, from one lookup within the
 *   window the reference names.
 * - the executor resolves a container exactly when it is the one the
 *   target's get records; a container on a top-level target, or one of
 *   another resource, is refused before anything runs.
 *
 * Each case runs the real native executor on the real composed script, with
 * only the transport replaced: it evaluates the script in an isolated context
 * against a stand-in Chrome that records every lookup it serves.
 *
 * @see ../../../../manifests/google-chrome/app.yaml
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7, D9)
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  InternalError,
  TargetNotFoundError,
  type ReferenceWire,
  type ResourcePlanTable,
  type ValuePlan,
} from '@macts/contracts'
import type { ExecutionRequest, ResolutionRequest } from '../execution/executor.js'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { NativeScript } from './native-codec.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { referenceAddressing } from './native-scripts.js'
import { standInChromium, type StandInWindow } from './test-support/stand-in-chromium.js'
import { standInTransport } from './test-support/stand-in-app.js'

const CHROME_MANIFEST = fileURLToPath(
  new URL('../../../../manifests/google-chrome/app.yaml', import.meta.url)
)

let chrome: AppManifest
let edge: AppManifest
beforeAll(async () => {
  chrome = await loadManifest(CHROME_MANIFEST)
  edge = await loadManifest(CHROME_MANIFEST.replace('google-chrome', 'microsoft-edge'))
})

/** Chrome's window and tab identifiers are text, as its manifest says. */
const RESOURCE_PLANS: ResourcePlanTable = {
  Window: { id: { kind: 'string' } },
  Tab: { id: { kind: 'string' } },
  BookmarkFolder: { id: { kind: 'string' } },
}

const TAB_REFERENCE: ValuePlan = { kind: 'reference', resource: 'Tab', cardinality: 'one' }

/** A window record's plan, cut down to the fields these cases read. */
const WINDOW_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    id: { presence: 'required', value: { kind: 'string' } },
    activeTab: { presence: 'required', value: { kind: 'nullable', value: TAB_REFERENCE } },
  },
}

/** A tab record's plan, cut down to the fields these cases read. */
const TAB_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    id: { presence: 'required', value: { kind: 'string' } },
    title: { presence: 'required', value: { kind: 'string' } },
  },
}

/** Two windows, front to back; the back window's second tab is active. */
const WINDOWS: readonly StandInWindow[] = [
  {
    id: 'W1',
    name: 'Front',
    tabs: [
      { id: 'T11', title: 'One' },
      { id: 'T12', title: 'Two' },
    ],
  },
  {
    id: 'W2',
    name: 'Back',
    tabs: [
      { id: 'T21', title: 'Three' },
      { id: 'T22', title: 'Four' },
    ],
    activeTab: 'T22',
  },
]

/** A single identity reference to the window `id`. */
function window(id: string): ReferenceWire {
  return { resource: 'Window', form: 'identity', cardinality: 'one', id }
}

/** A single identity reference to the tab `id`, within the window `windowId`. */
function tab(windowId: string, id: string): ReferenceWire {
  return { resource: 'Tab', form: 'identity', cardinality: 'one', id, container: window(windowId) }
}

/** A stand-in Chrome holding {@link WINDOWS} and an executor running scripts against it. */
function chromeExecutor(lookups: string[] = [], scripts: NativeScript[] = []) {
  const app = standInChromium(WINDOWS, { urlKey: 'url', lookups })
  return createNativeExecutor({ transport: standInTransport(app, scripts) })
}

/** An operation request against Chrome, with no input. */
function operation(
  command: string,
  resource: string,
  outputPlan: ValuePlan,
  input: ExecutionRequest['input'] = {}
): ExecutionRequest {
  return {
    manifest: chrome,
    target: { command, resource },
    input,
    inputPlan: {
      kind: 'record',
      fields: Object.fromEntries(
        Object.keys(input).map((key) => [key, { presence: 'required', value: { kind: 'string' } }])
      ),
    },
    outputPlan,
    resourcePlans: RESOURCE_PLANS,
  }
}

/** A resolution request for `reference`, against Chrome. */
function resolution(reference: ReferenceWire, outputPlan = TAB_PLAN): ResolutionRequest {
  return { manifest: chrome, reference, outputPlan, resourcePlans: RESOURCE_PLANS }
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

/** The `details` of a `TargetNotFoundError`; fails for any other error. */
function notFoundDetails(error: unknown): unknown {
  expect(error).toBeInstanceOf(TargetNotFoundError)
  return error instanceof TargetNotFoundError ? error.details : undefined
}

describe('the addressing of a tab', () => {
  it('is found within its window, which is found at the application', () => {
    expect(referenceAddressing(chrome, 'Tab')).toEqual({
      collection: 'tabs',
      lookup: 'byId',
      property: 'id',
      within: 'Window',
    })
    expect(referenceAddressing(chrome, 'Window')).toEqual({
      collection: 'windows',
      lookup: 'byId',
      property: 'id',
    })
  })
})

describe('emitting a window’s active tab with its window', () => {
  it('carries the window a get read the record through as the tab reference’s container', async () => {
    const result = await chromeExecutor().execute(
      operation('getWindow', 'Window', WINDOW_PLAN, { id: 'W2' })
    )

    expect(result).toEqual({
      id: 'W2',
      activeTab: { reference: tab('W2', 'T22') },
    })
  })

  it('gives each listed window’s active tab its own window', async () => {
    const lookups: string[] = []
    const result = await chromeExecutor(lookups).execute(
      operation('listWindows', 'Window', { kind: 'array', items: WINDOW_PLAN })
    )

    expect(result).toEqual([
      { id: 'W1', activeTab: { reference: tab('W1', 'T11') } },
      { id: 'W2', activeTab: { reference: tab('W2', 'T22') } },
    ])
    // The container is the row's identifier the list already read: no window
    // is looked up again to encode it.
    expect(lookups).toEqual([])
  })

  it('carries the window Edge’s create made as its active tab’s container', async () => {
    const transport = standInTransport(standInChromium(WINDOWS, { urlKey: 'uRL' }))
    const request = { ...operation('createWindow', 'Window', WINDOW_PLAN), manifest: edge }
    const result = await createNativeExecutor({ transport }).execute(request)
    expect(result).toEqual({ id: 'W-new', activeTab: { reference: tab('W-new', 'T-new') } })
  })

  it('fails with InternalError when a value at such a position comes without its container', async () => {
    // A transport whose body returns the app's tab specifier bare, as a body
    // that did not hand over the record it read the field through would.
    const app = standInChromium(WINDOWS, { urlKey: 'url' })
    const standIn = standInTransport(app)
    const transport: NativeTransport = {
      run: (script, options) =>
        standIn.run(
          {
            ...script,
            body: 'var w = app.windows.byId("W1"); return { id: "W1", activeTab: w.properties().activeTab };',
          },
          options
        ),
    }

    const error = await rejectionOf(
      createNativeExecutor({ transport }).execute(
        operation('getWindow', 'Window', WINDOW_PLAN, { id: 'W1' })
      )
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe(
      'The Google Chrome operation "Window getWindow" returns a reference at `activeTab` that the macOS provider cannot convert yet.'
    )
  })
})

describe('resolving a tab within its window', () => {
  it('addresses the window, then the tab within it, and reads the tab', async () => {
    const lookups: string[] = []
    const scripts: NativeScript[] = []

    const result = await chromeExecutor(lookups, scripts).resolve(resolution(tab('W2', 'T21')))

    expect(result).toEqual({ id: 'T21', title: 'Three' })
    expect(lookups).toEqual(['windows.byId(W2)', 'windows.byId(W2).tabs.byId(T21)'])
    // The script's table carries the window, which the tab is found within.
    expect(scripts[0]?.references).toEqual({
      Tab: {
        id: { kind: 'string' },
        addressing: { collection: 'tabs', lookup: 'byId', property: 'id', within: 'Window' },
      },
      Window: {
        id: { kind: 'string' },
        addressing: { collection: 'windows', lookup: 'byId', property: 'id' },
      },
    })
  })

  it('fails with TargetNotFoundError naming Window when the window is missing, looking up no tab', async () => {
    const lookups: string[] = []

    const error = await rejectionOf(chromeExecutor(lookups).resolve(resolution(tab('W9', 'T21'))))

    expect(notFoundDetails(error)).toEqual({ resource: 'Window' })
    expect(lookups).toEqual(['windows.byId(W9)'])
  })

  it('resolves an identity collection entry by entry, each window before its tab', async () => {
    const lookups: string[] = []
    const tabs = (...entries: ReferenceWire[]) =>
      resolution(
        { resource: 'Tab', form: 'identity', cardinality: 'many', entries },
        { kind: 'array', items: TAB_PLAN }
      )

    const both = tabs(tab('W1', 'T11'), tab('W2', 'T22'))
    await expect(chromeExecutor(lookups).resolve(both)).resolves.toEqual([
      { id: 'T11', title: 'One' },
      { id: 'T22', title: 'Four' },
    ])
    expect(lookups).toEqual([
      'windows.byId(W1)',
      'windows.byId(W1).tabs.byId(T11)',
      'windows.byId(W2)',
      'windows.byId(W2).tabs.byId(T22)',
    ])
    const missing = await rejectionOf(
      chromeExecutor().resolve(tabs(tab('W1', 'T11'), tab('W9', 'T22')))
    )
    expect(notFoundDetails(missing)).toEqual({ resource: 'Window', entryIndex: 1 })
  })

  it('finds no tab within a window it is not in, with no membership check beyond that lookup', async () => {
    // T21 is a real tab, of W2; the reference names W1 as its container.
    const lookups: string[] = []

    const error = await rejectionOf(chromeExecutor(lookups).resolve(resolution(tab('W1', 'T21'))))

    expect(notFoundDetails(error)).toEqual({ resource: 'Tab' })
    expect(lookups).toEqual(['windows.byId(W1)', 'windows.byId(W1).tabs.byId(T21)'])
  })
})

describe('containers the executor refuses before anything runs', () => {
  it.each<[string, ReferenceWire, string]>([
    [
      'a container on a top-level target',
      {
        resource: 'Window',
        form: 'identity',
        cardinality: 'one',
        id: 'W1',
        container: window('W2'),
      },
      'The macOS provider cannot resolve a reference to the Google Chrome resource "Window" through that container: a reference carries a container only when Google Chrome finds its resource within another, and then as an identity reference to that resource.',
    ],
    [
      'a container of another resource than the target’s get records',
      {
        resource: 'Tab',
        form: 'identity',
        cardinality: 'one',
        id: 'T11',
        container: { resource: 'BookmarkFolder', form: 'identity', cardinality: 'one', id: 'F1' },
      },
      'The macOS provider cannot resolve a reference to the Google Chrome resource "Tab" through that container: a reference carries a container only when Google Chrome finds its resource within another, and then as an identity reference to that resource.',
    ],
    [
      'a selector container',
      {
        resource: 'Tab',
        form: 'identity',
        cardinality: 'one',
        id: 'T11',
        container: {
          resource: 'Window',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'name', name: 'Front' },
        },
      },
      'The macOS provider cannot resolve a reference to the Google Chrome resource "Tab" through that container: a reference carries a container only when Google Chrome finds its resource within another, and then as an identity reference to that resource.',
    ],
    [
      'a target got within a container, with none',
      { resource: 'Tab', form: 'identity', cardinality: 'one', id: 'T11' },
      'The macOS provider cannot resolve a reference to the Google Chrome resource "Tab" without its container: Google Chrome finds one only within its "Window".',
    ],
  ])('refuses %s with InternalError', async (_label, reference, message) => {
    const run = vi.fn<NativeTransport['run']>()

    const error = await rejectionOf(
      createNativeExecutor({ transport: { run } }).resolve(resolution(reference))
    )

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe(message)
    expect(run).not.toHaveBeenCalled()
  })
})

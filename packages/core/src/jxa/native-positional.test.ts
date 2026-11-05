/**
 * Positional resources through the native macOS executor, proven on the
 * Panes fixture: a tab has no identifier and is found by its zero-based
 * position within its window.
 *
 * Expected outcomes are written by hand from phases/13 D7 ("Emitted forms",
 * container scoping) and D9, and from the fixture manifest:
 *
 * - addressing: a tab is found `byIndex` in its window's `tabs`, which is
 *   found by id at the application.
 * - emission: a window's `currentTab` is emitted as an index selector,
 *   `{form: 'selector', cardinality: 'one', selector: {by: 'index', index},
 *   container}`, with the window the record was read through as an identity
 *   container. The index is the position the app's specifier for the tab
 *   gives in its final `.at(N)` step, never the tab's dictionary `index`
 *   property; a specifier that ends any other way, or that the bridge cannot
 *   display, is a reference the provider cannot convert, `InternalError`.
 * - a get addresses the window, then the tab at its position within it: a
 *   position past the window's tabs is `InvalidSelectionError` naming Tab,
 *   and a missing window is `TargetNotFoundError` naming Window.
 * - resolution of an index selector does the same, through the codec; any
 *   other reference to a tab, or an index selector to a resource that is not
 *   positional, is refused before anything runs.
 *
 * Each case runs the real native executor on the real composed script, with
 * only the transport replaced: it evaluates the script in an isolated context
 * against a stand-in Panes app that records every lookup it serves.
 *
 * @see ../manifest/test-support/panes-positional.ts
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D7, D9)
 */

import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import {
  InternalError,
  InvalidSelectionError,
  TargetNotFoundError,
  type ReferenceWire,
  type ResourcePlanTable,
  type ValuePlan,
} from '@macts/contracts'
import type { ExecutionRequest, ResolutionRequest } from '../execution/executor.js'
import { parseManifestYaml } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { PANES_MANIFEST_YAML, panesManifest } from '../manifest/test-support/panes-positional.js'
import { createNativeExecutor, type NativeTransport } from './native-executor.js'
import { NATIVE_POSITION_READER, specifierPosition } from './native-position.js'
import { referenceAddressing } from './native-scripts.js'
import { standInTransport } from './test-support/stand-in-app.js'
import {
  standInPanes,
  type StandInPaneWindow,
  type StandInPanesOptions,
} from './test-support/stand-in-panes.js'

const panes = panesManifest()

/** A window's identifier is an integer; a tab has none, so its entry is empty. */
const RESOURCE_PLANS: ResourcePlanTable = { Window: { id: { kind: 'integer' } }, Tab: {} }

const TAB_SELECTOR: ValuePlan = {
  kind: 'reference',
  resource: 'Tab',
  cardinality: 'one',
  form: 'index',
}

/** A window record's plan, cut down to the fields these cases read. */
const WINDOW_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    id: { presence: 'required', value: { kind: 'integer' } },
    currentTab: { presence: 'required', value: { kind: 'nullable', value: TAB_SELECTOR } },
  },
}

/** A tab record's plan. */
const TAB_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    index: { presence: 'required', value: { kind: 'integer' } },
    title: { presence: 'required', value: { kind: 'string' } },
  },
}

/**
 * Two windows, front to back. Window 2's current tab is its second, at
 * position 1, whose dictionary `index` is 2.
 */
const WINDOWS: readonly StandInPaneWindow[] = [
  { id: 1, name: 'Front', tabs: [{ title: 'Shell' }, { title: 'Logs' }] },
  { id: 2, name: 'Back', tabs: [{ title: 'Build' }, { title: 'Tests' }], currentTab: 1 },
]

/** The wire form of the integer `value`. */
function integer(value: number): { readonly integer: string } {
  return { integer: String(value) }
}

/** A single reference to one object, in identity form or by a selector. */
type IdentityWire = Extract<
  ReferenceWire,
  { readonly form: 'identity'; readonly cardinality: 'one' }
>
type SelectorWire = Extract<
  ReferenceWire,
  { readonly form: 'selector'; readonly cardinality: 'one' }
>

/** A single identity reference to the window `id`. */
function window(id: number): IdentityWire {
  return { resource: 'Window', form: 'identity', cardinality: 'one', id: integer(id) }
}

/** An index selector for the tab at `position` within the window `windowId`. */
function tabAt(windowId: number, position: number): SelectorWire {
  return {
    resource: 'Tab',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: integer(position) },
    container: window(windowId),
  }
}

/** An executor running scripts against a stand-in Panes app holding `windows`. */
function panesExecutor(
  options: StandInPanesOptions = {},
  windows: readonly StandInPaneWindow[] = WINDOWS
) {
  const { app, automation } = standInPanes(windows, options)
  return createNativeExecutor({ transport: standInTransport(app, [], automation) })
}

/** An operation request against Panes, with integer inputs. */
function operation(
  command: string,
  resource: string,
  outputPlan: ValuePlan,
  input: Readonly<Record<string, number>> = {}
): ExecutionRequest {
  return {
    manifest: panes,
    target: { command, resource },
    input: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, integer(value)])),
    inputPlan: {
      kind: 'record',
      fields: Object.fromEntries(
        Object.keys(input).map((key) => [key, { presence: 'required', value: { kind: 'integer' } }])
      ),
    },
    outputPlan,
    resourcePlans: RESOURCE_PLANS,
  }
}

/** A resolution request for `reference`, against Panes. */
function resolution(reference: ReferenceWire): ResolutionRequest {
  return { manifest: panes, reference, outputPlan: TAB_PLAN, resourcePlans: RESOURCE_PLANS }
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

/** The `details` of an error of class `type`; fails for any other error. */
function detailsOf(
  error: unknown,
  type: typeof TargetNotFoundError | typeof InvalidSelectionError
) {
  expect(error).toBeInstanceOf(type)
  return error instanceof type ? error.details : undefined
}

/** The message of an `InternalError`; fails for any other error. */
function internalMessage(error: unknown): string | undefined {
  expect(error).toBeInstanceOf(InternalError)
  return error instanceof InternalError ? error.message : undefined
}

describe('the position a specifier gives within a tab collection', () => {
  it.each(['Panes (Beta)', 'Panes ("quoted" \\ path)', 'Panes ).windows.byId(7) ('])(
    'distinguishes an application named %s from a real nested specifier in source and embedded readers',
    (name) => {
      const application = `Application(${JSON.stringify(name)})`
      for (const [display, expected] of [
        [`${application}.tabs.at(7)`, undefined],
        [`${application}.windows.byId(1).tabs.at(2)`, 2],
      ] as const) {
        expect(specifierPosition(display, 'tabs')).toBe(expected)
        expect(
          runInNewContext(`${NATIVE_POSITION_READER.prelude}\n__mactsPositionOf({}, 'tabs')`, {
            Automation: { getDisplayString: () => display },
          })
        ).toBe(expected)
      }
    }
  )

  it.each<[string, number]>([
    ['Application("iTerm2").windows.byId(7).tabs.at(0)', 0],
    ['Application("Panes").windows.byId(1).tabs.at(12)', 12],
  ])('reads the final .tabs.at(N) of %s', (display, position) => {
    expect(specifierPosition(display, 'tabs')).toBe(position)
  })

  it.each<[string, unknown]>([
    ['a property specifier', 'Application("Panes").windows.byId(1).currentTab'],
    ['a specifier by name', 'Application("Panes").windows.byId(1).tabs.byName("Build")'],
    ['a specifier by id', 'Application("Panes").windows.byId(1).tabs.byId(3)'],
    ['a position that is not the final step', 'Application("Panes").windows.at(0).currentTab'],
    ['a non-canonical position', 'Application("Panes").windows.byId(1).tabs.at(01)'],
    ['a negative position', 'Application("Panes").windows.byId(1).tabs.at(-1)'],
    [
      'a position past the safe integers',
      'Application("Panes").windows.byId(1).tabs.at(9007199254740993)',
    ],
    ['a position in another collection', 'Application("Panes").windows.byId(9).sessions.at(4)'],
    [
      'a collection whose name only ends in tabs',
      'Application("Panes").windows.byId(1).subtabs.at(0)',
    ],
    ['a position in the application’s own collection', 'Application("Panes").tabs.at(7)'],
    ['no display form', undefined],
  ])('gives no position for %s', (_label, display) => {
    expect(specifierPosition(display, 'tabs')).toBeUndefined()
  })
})

describe('the addressing of a tab', () => {
  it('is found by position within its window, which is found by id at the application', () => {
    expect(referenceAddressing(panes, 'Tab')).toEqual({
      collection: 'tabs',
      lookup: 'byIndex',
      within: 'Window',
    })
    expect(referenceAddressing(panes, 'Window')).toEqual({
      collection: 'windows',
      lookup: 'byId',
      property: 'id',
    })
  })
})

describe('emitting a window’s current tab as an index selector', () => {
  it('carries the tab’s position within the window a get read the record through', async () => {
    const result = await panesExecutor().execute(
      operation('getWindow', 'Window', WINDOW_PLAN, { id: 2 })
    )

    expect(result).toEqual({ id: integer(2), currentTab: { reference: tabAt(2, 1) } })
  })

  it('takes the position from the app’s specifier, not from the tab’s misleading index property', async () => {
    // The current tab is at position 0, but its dictionary index says 5.
    const windows: StandInPaneWindow[] = [
      { id: 3, name: 'Odd', tabs: [{ title: 'Only', index: 5 }] },
    ]

    const result = await panesExecutor({}, windows).execute(
      operation('getWindow', 'Window', WINDOW_PLAN, { id: 3 })
    )

    expect(result).toEqual({ id: integer(3), currentTab: { reference: tabAt(3, 0) } })
  })

  it('gives each listed window’s current tab its own window', async () => {
    const lookups: string[] = []
    const result = await panesExecutor({ lookups }).execute(
      operation('listWindows', 'Window', { kind: 'array', items: WINDOW_PLAN })
    )

    expect(result).toEqual([
      { id: integer(1), currentTab: { reference: tabAt(1, 0) } },
      { id: integer(2), currentTab: { reference: tabAt(2, 1) } },
    ])
    // The position comes from the specifier the list read: no tab is looked up.
    expect(lookups).toEqual([])
  })

  it.each<[string, NonNullable<StandInPanesOptions['display']>]>([
    [
      'a specifier whose final step is not a position',
      (id) => `Application("Panes").windows.byId(${String(id)}).currentTab`,
    ],
    ['a specifier by name', () => 'Application("Panes").windows.byId(2).tabs.byName("Tests")'],
    [
      'a position in another collection',
      () => 'Application("Panes").windows.byId(9).sessions.at(4)',
    ],
  ])(
    'fails with InternalError for %s, never falling back to the index property',
    async (_label, display) => {
      const error = await rejectionOf(
        panesExecutor({ display }).execute(operation('getWindow', 'Window', WINDOW_PLAN, { id: 2 }))
      )

      expect(internalMessage(error)).toBe(
        'The Panes operation "Window getWindow" returns a reference at `currentTab` that the macOS provider cannot convert yet.'
      )
    }
  )

  it('fails with InternalError when the bridge cannot display the specifier', async () => {
    const { app } = standInPanes(WINDOWS)
    // The default stand-in Automation displays nothing.
    const executor = createNativeExecutor({ transport: standInTransport(app) })

    const error = await rejectionOf(
      executor.execute(operation('getWindow', 'Window', WINDOW_PLAN, { id: 2 }))
    )

    expect(internalMessage(error)).toBe(
      'The Panes operation "Window getWindow" returns a reference at `currentTab` that the macOS provider cannot convert yet.'
    )
  })

  it('fails with InternalError for an identity plan, since a tab has no identifier', async () => {
    const identityPlan: ValuePlan = {
      kind: 'record',
      fields: {
        id: { presence: 'required', value: { kind: 'integer' } },
        currentTab: {
          presence: 'required',
          value: { kind: 'reference', resource: 'Tab', cardinality: 'one' },
        },
      },
    }

    const error = await rejectionOf(
      panesExecutor().execute(operation('getWindow', 'Window', identityPlan, { id: 2 }))
    )

    expect(internalMessage(error)).toBe(
      'The Panes operation "Window getWindow" returns a reference at `currentTab` that the macOS provider cannot convert yet.'
    )
  })
})

describe('getting a tab by its position within its window', () => {
  it('addresses the window, then the tab at that position, and reads the tab', async () => {
    const lookups: string[] = []

    const result = await panesExecutor({ lookups }).execute(
      operation('getTab', 'Tab', TAB_PLAN, { windowId: 2, index: 1 })
    )

    expect(result).toEqual({ index: integer(2), title: 'Tests' })
    expect(lookups).toEqual(['windows.byId(2)', 'windows.byId(2).tabs.at(1)'])
  })

  it('refuses a null position before constructing a tab specifier', async () => {
    const lookups: string[] = []
    const request = operation('getTab', 'Tab', TAB_PLAN, { windowId: 2, index: 0 })
    const error = await rejectionOf(
      panesExecutor({ lookups }).execute({
        ...request,
        input: { windowId: integer(2), index: null },
        inputPlan: {
          kind: 'record',
          fields: {
            windowId: { presence: 'required', value: { kind: 'integer' } },
            index: {
              presence: 'required',
              value: { kind: 'nullable', value: { kind: 'integer' } },
            },
          },
        },
      })
    )
    expect(error).toBeInstanceOf(InvalidSelectionError)
    expect(lookups).not.toContain('windows.byId(2).tabs.at(null)')
    expect(lookups.some((lookup) => lookup.includes('.tabs.at('))).toBe(false)
  })

  it('rejects null against the integer wire plan before any application lookup', async () => {
    const lookups: string[] = []
    const request = operation('getTab', 'Tab', TAB_PLAN, { windowId: 2, index: 0 })
    await rejectionOf(
      panesExecutor({ lookups }).execute({
        ...request,
        input: { windowId: integer(2), index: null },
      })
    )
    expect(lookups).toEqual([])
  })

  it('fails with InvalidSelectionError naming Tab for a position past the window’s tabs, looking up no tab', async () => {
    const lookups: string[] = []

    const error = await rejectionOf(
      panesExecutor({ lookups }).execute(
        operation('getTab', 'Tab', TAB_PLAN, { windowId: 2, index: 2 })
      )
    )

    expect(detailsOf(error, InvalidSelectionError)).toEqual({ resource: 'Tab' })
    expect(lookups).toEqual(['windows.byId(2)'])
  })

  it('fails with TargetNotFoundError naming Window when the window is missing', async () => {
    const error = await rejectionOf(
      panesExecutor().execute(operation('getTab', 'Tab', TAB_PLAN, { windowId: 9, index: 0 }))
    )

    expect(detailsOf(error, TargetNotFoundError)).toEqual({ resource: 'Window' })
  })
})

describe('resolving an index selector', () => {
  it('addresses the window, then the tab at the position within it, and reads the tab', async () => {
    const lookups: string[] = []

    const result = await panesExecutor({ lookups }).resolve(resolution(tabAt(1, 1)))

    expect(result).toEqual({ index: integer(2), title: 'Logs' })
    expect(lookups).toEqual(['windows.byId(1)', 'windows.byId(1).tabs.at(1)'])
  })

  it('fails with InvalidSelectionError naming Tab for a position past the window’s tabs', async () => {
    const lookups: string[] = []

    const error = await rejectionOf(panesExecutor({ lookups }).resolve(resolution(tabAt(1, 2))))

    expect(detailsOf(error, InvalidSelectionError)).toEqual({ resource: 'Tab' })
    expect(error instanceof InvalidSelectionError ? error.message : undefined).toBe(
      'The Tab collection in Panes has no item at the position the reference selects.'
    )
    expect(lookups).toEqual(['windows.byId(1)'])
  })

  it('fails with TargetNotFoundError naming Window when the window is missing, looking up no tab', async () => {
    const lookups: string[] = []

    const error = await rejectionOf(panesExecutor({ lookups }).resolve(resolution(tabAt(9, 0))))

    expect(detailsOf(error, TargetNotFoundError)).toEqual({ resource: 'Window' })
    expect(lookups).toEqual(['windows.byId(9)'])
  })
})

describe('references to a positional resource the executor refuses before anything runs', () => {
  const misplaced =
    'The macOS provider cannot resolve a reference to the Panes resource "Tab" through that container: a reference carries a container only when Panes finds its resource within another, and then as an identity reference to that resource.'

  it.each<[string, ReferenceWire, string]>([
    [
      'an index selector with no container',
      {
        resource: 'Tab',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: integer(0) },
      },
      'The macOS provider cannot resolve a reference to the Panes resource "Tab" without its container: Panes finds one only within its "Window".',
    ],
    [
      'an index selector within a selector container',
      {
        ...tabAt(1, 0),
        container: {
          resource: 'Window',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: integer(0) },
        },
      },
      misplaced,
    ],
    [
      'an index selector within a container of another resource',
      { ...tabAt(1, 0), container: { ...window(1), resource: 'Tab' } },
      misplaced,
    ],
    [
      'a name selector',
      {
        resource: 'Tab',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Logs' },
        container: window(1),
      },
      'The macOS provider cannot resolve a selector reference to the Panes resource "Tab" yet.',
    ],
    [
      'an identity reference, since a tab has no identifier',
      {
        resource: 'Tab',
        form: 'identity',
        cardinality: 'one',
        id: integer(0),
        container: window(1),
      },
      'The macOS provider cannot resolve references to the Panes resource "Tab" yet: Panes does not find one by its identifier alone.',
    ],
    [
      'an index selector to a resource that is not positional',
      {
        resource: 'Window',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: integer(0) },
      },
      'The macOS provider cannot resolve a selector reference to the Panes resource "Window" yet: Panes does not find one by its position.',
    ],
  ])('refuses %s with InternalError', async (_label, reference, message) => {
    const run = vi.fn<NativeTransport['run']>()

    const error = await rejectionOf(
      createNativeExecutor({ transport: { run } }).resolve(resolution(reference))
    )

    expect(internalMessage(error)).toBe(message)
    expect(run).not.toHaveBeenCalled()
  })
})

/**
 * Panes with a tab whose title can be set, and commands that select a tab:
 * an update and a delete, which find it as the get does, and an application
 * command that takes a tab, which the codec converts as an input position.
 */
const PANES_WITH_TAB_COMMANDS = parseManifestYaml(
  PANES_MANIFEST_YAML.replace(
    '      title:\n        access: r\n',
    '      title:\n        access: rw\n'
  ) +
    `  updateTab:
    name: update
    description: Rename a tab
    scope: resource
    resourceType: Tab
    parent: { resource: Window, parameter: windowId }
    parameters:
      - { name: windowId, type: integer, description: The window, required: true }
      - { name: index, type: integer, description: The tab, required: true }
      - { name: title, type: string, description: The new title, required: false }
  closeTab:
    name: delete
    description: Close a tab
    scope: resource
    resourceType: Tab
    parent: { resource: Window, parameter: windowId }
    parameters:
      - { name: windowId, type: integer, description: The window, required: true }
      - { name: index, type: integer, description: The tab, required: true }
  focusTab:
    name: focusTab
    description: Bring a tab to the front
    scope: application
    parameters:
      - { name: tab, type: { resource: Tab }, description: The tab, required: true }
`
)

/** A request against {@link PANES_WITH_TAB_COMMANDS}, or `manifest`, with wire inputs. */
function tabCommand(
  command: string,
  resource: string | undefined,
  input: Readonly<Record<string, unknown>>,
  inputPlan: Readonly<Record<string, ValuePlan>>,
  outputPlan: ValuePlan,
  manifest: AppManifest = PANES_WITH_TAB_COMMANDS
): ExecutionRequest {
  return {
    manifest,
    target: resource === undefined ? { command } : { command, resource },
    input: input as ExecutionRequest['input'],
    inputPlan: {
      kind: 'record',
      fields: Object.fromEntries(
        Object.entries(inputPlan).map(([key, value]) => [key, { presence: 'required', value }])
      ),
    },
    outputPlan,
    resourcePlans: { ...RESOURCE_PLANS, Session: { id: { kind: 'integer' } } },
  }
}

const INTEGER: ValuePlan = { kind: 'integer' }

/** A stand-in Panes app that also brings a tab to the front, reporting the tab's title. */
function focusingExecutor(lookups: string[]) {
  const { app, automation } = standInPanes(WINDOWS, { lookups })
  const focusTab = (params: { readonly tab: { readonly title: () => string } }) =>
    params.tab.title()
  return createNativeExecutor({
    transport: standInTransport({ ...app, focusTab }, [], automation),
  })
}

describe('an index selector at an input position', () => {
  const take = (reference: SelectorWire) =>
    tabCommand(
      'focusTab',
      undefined,
      { tab: { reference } },
      { tab: { kind: 'reference', resource: 'Tab', cardinality: 'one' } },
      { kind: 'string' }
    )

  it('hands the command the tab at that position within its window', async () => {
    const lookups: string[] = []

    await expect(focusingExecutor(lookups).execute(take(tabAt(2, 1)))).resolves.toBe('Tests')
    expect(lookups).toEqual(['windows.byId(2)', 'windows.byId(2).tabs.at(1)'])
  })

  it('fails with InvalidSelectionError naming Tab for a position past the window’s tabs', async () => {
    const lookups: string[] = []

    const error = await rejectionOf(focusingExecutor(lookups).execute(take(tabAt(2, 5))))

    expect(detailsOf(error, InvalidSelectionError)).toEqual({ resource: 'Tab' })
    expect(error instanceof InvalidSelectionError ? error.message : undefined).toBe(
      'The Tab collection in Panes has no item at the position the reference at `tab` selects.'
    )
    expect(lookups).toEqual(['windows.byId(2)'])
  })
})

describe('updating and deleting a tab by its position within its window', () => {
  const position = { windowId: { integer: '2' }, index: { integer: '1' } }

  it('updates the tab at that position, as the get finds it', async () => {
    const lookups: string[] = []

    const result = await panesExecutor({ lookups }).execute(
      tabCommand(
        'updateTab',
        'Tab',
        { ...position, title: 'Renamed' },
        { windowId: INTEGER, index: INTEGER, title: { kind: 'string' } },
        TAB_PLAN
      )
    )

    expect(result).toEqual({ index: integer(2), title: 'Renamed' })
    expect(lookups).toEqual([
      'windows.byId(2)',
      'windows.byId(2).tabs.at(1)',
      'windows.byId(2).tabs.at(1).title = Renamed',
    ])
  })

  it('deletes the tab at that position, as the get finds it', async () => {
    const lookups: string[] = []

    await panesExecutor({ lookups }).execute(
      tabCommand(
        'closeTab',
        'Tab',
        position,
        { windowId: INTEGER, index: INTEGER },
        {
          kind: 'none',
        }
      )
    )

    expect(lookups).toEqual([
      'windows.byId(2)',
      'windows.byId(2).tabs.at(1)',
      'windows.byId(2).tabs.at(1).delete()',
    ])
  })

  it.each<[string, Readonly<Record<string, ValuePlan>>]>([
    ['update', { windowId: INTEGER, index: INTEGER, title: { kind: 'string' } }],
    ['delete', { windowId: INTEGER, index: INTEGER }],
  ])(
    'fails the %s with InvalidSelectionError naming Tab past the window’s tabs, changing nothing',
    async (operationName, plan) => {
      const lookups: string[] = []
      const input = { windowId: { integer: '2' }, index: { integer: '2' }, title: 'Renamed' }
      const command = operationName === 'update' ? 'updateTab' : 'closeTab'

      const error = await rejectionOf(
        panesExecutor({ lookups }).execute(
          tabCommand(
            command,
            'Tab',
            Object.fromEntries(
              Object.keys(plan).map((key) => [key, input[key as keyof typeof input]])
            ),
            plan,
            operationName === 'update' ? TAB_PLAN : { kind: 'none' }
          )
        )
      )

      expect(detailsOf(error, InvalidSelectionError)).toEqual({ resource: 'Tab' })
      expect(lookups).toEqual(['windows.byId(2)'])
    }
  )
})

/**
 * Panes with an identified Session found within its Tab, and an application
 * command that takes a session. The manifest rule refuses a positional
 * parent, so this is built past the schema, as a caller may hand the
 * executor a manifest object; the codec must refuse it on its own (D7: a
 * selector never appears inside a container).
 */
function panesWithSessions(): AppManifest {
  const manifest = panesManifest()
  manifest.resources['Session'] = {
    name: 'Session',
    plural: 'Sessions',
    description: 'A session of a tab',
    properties: {
      id: {
        access: 'r',
        type: 'integer',
        description: "The session's id",
        code: 'ID  ',
        optional: false,
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  manifest.commands['getSession'] = {
    name: 'get',
    description: 'Get a session of a tab',
    scope: 'resource',
    resourceType: 'Session',
    parent: { resource: 'Tab', parameter: 'tab' },
    parameters: [
      { name: 'tab', type: 'integer', description: 'The tab', required: true },
      { name: 'id', type: 'integer', description: 'The session', required: true },
    ],
  }
  manifest.commands['focusSession'] = {
    name: 'focusSession',
    description: 'Bring a session to the front',
    scope: 'application',
    parameters: [
      {
        name: 'session',
        type: { resource: 'Session' },
        description: 'The session',
        required: true,
      },
    ],
  }
  return manifest
}

describe('an input reference whose container chain holds an index selector', () => {
  it('is refused as a reference the provider cannot convert, looking nothing up', async () => {
    const lookups: string[] = []
    const session = {
      resource: 'Session',
      form: 'identity',
      cardinality: 'one',
      id: integer(1),
      container: tabAt(1, 1),
    }

    const error = await rejectionOf(
      panesExecutor({ lookups }).execute(
        tabCommand(
          'focusSession',
          undefined,
          { session: { reference: session } },
          { session: { kind: 'reference', resource: 'Session', cardinality: 'one' } },
          { kind: 'none' },
          panesWithSessions()
        )
      )
    )

    expect(internalMessage(error)).toBe(
      // The failure names the level that cannot convert: the session's container.
      'The Panes operation "focusSession" takes a reference at `session.container` that the macOS provider cannot convert yet.'
    )
    expect(lookups).toEqual([])
  })
})

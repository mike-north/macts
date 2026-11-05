/**
 * Test-only stand-in for the "Panes" fixture app
 * (`../../manifest/test-support/panes-positional.ts`), as the automation
 * bridge presents it to a native script: windows found by id, each holding
 * tabs that have no identifier and are addressed only by position.
 *
 * A window's `tabs` collection has a `length` and serves `at(position)`,
 * zero-based; a position it does not reach gives a specifier that does not
 * exist. A tab's dictionary `index` property counts from 1, as some apps'
 * do, so it is never the tab's position. A window's `currentTab` is the
 * specifier of one of its tabs, which {@link StandInPanes.automation}
 * displays as the app's own specifier for it, `….tabs.at(N)`.
 *
 * Every lookup it serves is recorded in `lookups`, labelled by the path that
 * reached it (`windows.byId(1)`, `windows.byId(1).tabs.at(0)`).
 *
 * An app of the same shape, such as iTerm, is stood in for by adding the
 * further record fields its manifest declares ({@link StandInPanesOptions})
 * and its own display form.
 *
 * Reachable from other macts packages through `@macts/core/testing`, which is
 * not public API.
 */

import type { StandInAutomation } from './stand-in-app.js'

/** One stand-in tab: its title, and its dictionary `index` (its position plus 1 by default). */
export interface StandInPaneTab {
  readonly title: string
  readonly index?: number
}

/** One stand-in window: its id, title and tabs, and the position of its current tab. */
export interface StandInPaneWindow {
  readonly id: number
  readonly name: string
  readonly tabs: readonly StandInPaneTab[]
  /** The position of the current tab; the first tab when absent. */
  readonly currentTab?: number
}

/** How a stand-in Panes app is built and what it records. */
export interface StandInPanesOptions {
  /** Receives one entry per lookup the app serves. */
  readonly lookups?: string[]
  /**
   * The display form the bridge gives the tab at `position` of the window
   * `windowId`; by default the app's positional specifier,
   * `Application("Panes").windows.byId(<windowId>).tabs.at(<position>)`.
   */
  readonly display?: (windowId: number, position: number) => string
  /** Further fields of every window record, keyed by the app's name for each. */
  readonly windowFields?: Readonly<Record<string, unknown>>
  /** Further fields of every tab record, keyed by the app's name for each. */
  readonly tabFields?: Readonly<Record<string, unknown>>
}

/** A stand-in Panes application and the `Automation` that displays its specifiers. */
export interface StandInPanes {
  readonly app: object
  readonly automation: StandInAutomation
}

/** A specifier for an object that does not exist. */
const ABSENT = Object.freeze({ exists: () => false })

/**
 * A stand-in element collection: calling it lists its item specifiers, and
 * reading a property of it reads that property of every item in order.
 * `columns` are the record's keys when it holds no item.
 */
function collection(
  items: readonly object[],
  records: readonly Record<string, unknown>[],
  columns: readonly string[]
): () => object[] {
  const list = (): object[] => [...items]
  // Defined rather than assigned: a function's own `name` and `length` are
  // read-only.
  for (const key of records[0] === undefined ? columns : Object.keys(records[0])) {
    Object.defineProperty(list, key, { value: () => records.map((record) => record[key]) })
  }
  return list
}

/**
 * A stand-in Panes application holding `windows`, front to back.
 *
 * @param windows - The windows, front to back.
 * @param options - The display form of a tab specifier and the log to record into.
 */
export function standInPanes(
  windows: readonly StandInPaneWindow[],
  options: StandInPanesOptions = {}
): StandInPanes {
  const {
    lookups = [],
    windowFields = {},
    tabFields = {},
    display = (windowId, position) =>
      `Application("Panes").windows.byId(${String(windowId)}).tabs.at(${String(position)})`,
  } = options
  const displays = new WeakMap<object, string>()
  const windowItem = (row: StandInPaneWindow) => {
    const label = `windows.byId(${String(row.id)}).tabs`
    const tabRecords = row.tabs.map((tab, position) => ({
      ...tabFields,
      index: tab.index ?? position + 1,
      title: tab.title,
    }))
    const tabItems = tabRecords.map((record, position) => {
      const specifier = {
        exists: () => true,
        index: () => record.index,
        title: () => record.title,
        properties: () => record,
      }
      displays.set(specifier, display(row.id, position))
      return specifier
    })
    const tabs = collection(tabItems, tabRecords, ['index', 'title'])
    Object.defineProperty(tabs, 'length', { value: tabItems.length })
    Object.defineProperty(tabs, 'at', {
      value: (position: unknown) => {
        lookups.push(`${label}.at(${String(position)})`)
        return typeof position === 'number' ? (tabItems[position] ?? ABSENT) : ABSENT
      },
    })
    const record: Record<string, unknown> = {
      ...windowFields,
      id: row.id,
      name: row.name,
      currentTab: tabItems[row.currentTab ?? 0] ?? null,
    }
    return {
      id: row.id,
      record,
      specifier: { exists: () => true, id: () => row.id, properties: () => record, tabs },
    }
  }
  const windowItems = windows.map(windowItem)
  const windowList = collection(
    windowItems.map((item) => item.specifier),
    windowItems.map((item) => item.record),
    ['id', 'name', 'currentTab']
  )
  Object.defineProperty(windowList, 'byId', {
    value: (id: unknown) => {
      lookups.push(`windows.byId(${String(id)})`)
      return windowItems.find((item) => item.id === id)?.specifier ?? ABSENT
    },
  })
  return {
    app: { windows: windowList },
    automation: {
      getDisplayString(specifier) {
        const shown =
          typeof specifier === 'object' && specifier !== null ? displays.get(specifier) : undefined
        if (shown === undefined) throw new Error('The stand-in displays no such specifier.')
        return shown
      },
    },
  }
}

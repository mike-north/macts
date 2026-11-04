/**
 * Test-only stand-in for a Chromium browser's application object (Google
 * Chrome, Microsoft Edge), as the automation bridge presents one to a native
 * script.
 *
 * It follows the Chromium scripting dictionary: the application has `window`
 * as an element, a `window` has `tab` as an element, and the application has
 * no `tab` element. So the stand-in has a `windows` collection and no
 * app-wide `tabs` member at all, and a body or codec that addressed one would
 * fail. A window's `activeTab` is a property specifier of the window, not a
 * specifier by the tab's id, as the app hands it out: reading its `id` gives
 * the tab's id.
 *
 * Every lookup by id it serves is recorded in `lookups`, labelled by the path
 * that reached it (`windows.byId(W1)`, `windows.byId(W1).tabs.byId(T11)`), and
 * every tab it makes or adds to a window in `writes`, so a test can assert
 * exactly what was addressed and whether anything was created.
 *
 * Reachable from other macts packages through `@macts/core/testing`, which is
 * not public API.
 *
 * @see ../../../../../manifests/google-chrome/app.yaml
 * @see ../../../../../manifests/microsoft-edge/app.yaml
 */

/** One stand-in tab: its id and title. */
export interface StandInTab {
  readonly id: string
  readonly title: string
}

/** One stand-in window: its id, title and tabs, and which tab is active. */
export interface StandInWindow {
  readonly id: string
  readonly name: string
  readonly tabs: readonly StandInTab[]
  /** The id of the active tab; the first tab when absent. */
  readonly activeTab?: string
}

/** How a stand-in Chromium app is built and what it records. */
export interface StandInChromiumOptions {
  /**
   * The app's name for a tab's URL property in a tab record: `url` for a
   * manifest that records that spelling, `uRL` for one that records none.
   */
  readonly urlKey: string
  /** Receives one entry per lookup by id the app serves. */
  readonly lookups?: string[]
  /** Receives `make Tab` per tab made and `<label>.push` per tab added to a window. */
  readonly writes?: string[]
}

/** The id the stand-in gives a tab it makes. */
export const STAND_IN_NEW_TAB_ID = 'T-new'

/** A specifier for an object that does not exist. */
const ABSENT = Object.freeze({ exists: () => false })

/**
 * The native record of a stand-in tab, keyed by the app's name for each
 * property.
 */
function tabRecord(row: StandInTab, urlKey: string): Record<string, unknown> {
  return { id: row.id, title: row.title, [urlKey]: `https://example.com/${row.id}`, loading: false }
}

/**
 * A stand-in element collection: calling it lists its item specifiers,
 * reading a property of it reads that property of every item in order, and
 * `byId` finds one item, recorded in `lookups` as `<label>.byId(<id>)`. An id
 * it does not hold gives a specifier that does not exist.
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
      return items.find((item) => item.id === id)?.specifier ?? ABSENT
    },
  })
}

/**
 * A stand-in Chromium application holding `windows`, front to back. Each
 * window's record carries every window property the Chrome and Edge
 * contracts declare, keyed by the app's name for it, with no value for most,
 * and its `activeTab` property specifier.
 *
 * @param windows - The windows, front to back.
 * @param options - The URL spelling and the logs to record into.
 */
export function standInChromium(
  windows: readonly StandInWindow[],
  options: StandInChromiumOptions
): object {
  const { urlKey, lookups = [], writes = [] } = options
  const windowItem = (row: StandInWindow, index: number) => {
    const tabRecords = row.tabs.map((tab) => tabRecord(tab, urlKey))
    const tabItems = row.tabs.map((tab, tabIndex) => ({
      id: tab.id,
      specifier: { exists: () => true, id: () => tab.id, properties: () => tabRecords[tabIndex] },
    }))
    const label = `windows.byId(${row.id}).tabs`
    const tabs = Object.assign(collection(label, tabItems, tabRecords, lookups), {
      push() {
        writes.push(`${label}.push`)
      },
    })
    const active = tabItems.find((tab) => tab.id === (row.activeTab ?? row.tabs[0]?.id))
    // The window's own property specifier: its id is the active tab's, read
    // when it is used, as the app's is.
    const activeTab =
      active === undefined
        ? null
        : {
            exists: () => true,
            id: () => active.id,
            properties: () => active.specifier.properties(),
          }
    const record: Record<string, unknown> = {
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
      activeTab,
      mode: 'normal',
      activeTabIndex: active === undefined ? null : tabItems.indexOf(active) + 1,
    }
    return {
      id: row.id,
      record,
      specifier: { exists: () => true, id: () => row.id, properties: () => record, tabs },
    }
  }
  const windowItems = windows.map(windowItem)
  return {
    windows: collection(
      'windows',
      windowItems,
      windowItems.map((item) => item.record),
      lookups
    ),
    Tab(props: Readonly<Record<string, unknown>>) {
      writes.push('make Tab')
      const record = tabRecord({ id: STAND_IN_NEW_TAB_ID, title: '' }, urlKey)
      return { properties: () => ({ ...record, ...props }) }
    },
    // A made window, `W-new`, opens with one new tab, its active tab, as the app's does.
    Window: () => ({
      ...windowItem({ id: 'W-new', name: '', tabs: [{ id: STAND_IN_NEW_TAB_ID, title: '' }] }, 0)
        .specifier,
      make: () => undefined,
    }),
  }
}

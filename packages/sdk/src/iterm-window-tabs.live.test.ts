/**
 * LOCALLY-AUTOMATABLE live check that iTerm windows are got by id and tabs by
 * their position within their window, against the real app. NOT run in CI.
 *
 * ## What this tests
 *
 * iTerm gives a tab no id, so the manifest marks Tab positional: a tab is
 * got within its window by its zero-based position, and a window's
 * `currentTab` is emitted as an index selector within the window it was read
 * through, its position taken from the specifier iTerm returns for the tab
 * (phases/13 D7, "Emitted forms"; D10, positional resources). Through
 * `@macts/sdk/local`'s `createClient`, with the default native executor, the
 * suite checks:
 *
 *   1. every listed window's id round-trips through `windows.get`;
 *   2. the position reader the native script hands the codec parses the
 *      specifier iTerm returns for each window's current tab, which must end
 *      in `.tabs.at(N)`;
 *   3. each window's `currentTab`, from a get and from the list, is an index
 *      selector whose container is that window;
 *   4. resolving it gives the tab whose sessions are the current tab's, by
 *      session id, compared inside the automation process as a boolean;
 *   5. `tabs.get` at the position just past a window's last tab is
 *      `InvalidSelectionError` naming Tab;
 *   6. when a window holds 2 or more tabs, the second is got and resolved by
 *      position, and both find the same tab. Otherwise the case is skipped,
 *      with its reason.
 *
 * Every call is a read. No window or tab is opened, closed, focused, moved
 * or created, and no command that acts on one is called. The window and tab
 * reads return every declared property, titles included; the suite never
 * prints, logs or compares one. Session ids are compared only inside the
 * automation process, which returns booleans. Only counts and booleans are
 * logged.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with iTerm installed.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control iTerm. Until a person at the Mac answers the one-time prompt,
 *   calls fail with `-1743` or `-1712`; the suite stops there.
 * - The windows and tabs are the ones open on this Mac.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run. It leaves iTerm as it found it:
 * when iTerm was not running, the first read launches it and the suite quits
 * it with a plain quit afterwards. If iTerm is still running after that quit,
 * a confirmation may be showing; the suite leaves it untouched and says so.
 *
 * ## Local run procedure
 *
 * ```sh
 * cd packages/sdk && MACTS_LIVE_APPS=1 pnpm exec vitest run src/iterm-window-tabs.live.test.ts
 * ```
 *
 * @see /Applications/iTerm.app/Contents/Resources/iTerm2.sdef
 * @see ../../../manifests/iterm/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7 emitted forms, D10 positional resources)
 */

import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { runJxa } from '@macts/core'
import { NATIVE_POSITION_READER } from '@macts/core/testing'
import { Integer, InvalidSelectionError } from '@macts/contracts'
import { iTermContract, type iTermClient, type Window } from '@macts/iterm/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { bindReference, createClient } from './local.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** iTerm's bundle identifier. */
const ITERM = 'com.googlecode.iterm2'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, several times. */
const LIVE_TEST_TIMEOUT_MS = 180_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The suite mints its key there
// and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-iterm-live-'))
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

/** Whether iTerm is running now: `pgrep` exits 0 when a process is named exactly iTerm2. */
function itermIsRunning(): boolean {
  try {
    execFileSync('pgrep', ['-x', 'iTerm2'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * For each window id, whether the position reader gives a position for the
 * specifier iTerm returns for that window's current tab.
 */
async function currentTabsParse(windowIds: readonly number[]): Promise<boolean[]> {
  return runJxa<boolean[]>(
    `${NATIVE_POSITION_READER.prelude}
    var app = Application(${JSON.stringify(ITERM)});
    return ${JSON.stringify(windowIds)}.map(function (id) {
      var position = __mactsPositionOf(app.windows.byId(id).currentTab());
      return typeof position === 'number';
    });`,
    { timeout: 30_000 }
  )
}

/**
 * For each `[windowId, position]`, whether the tab at `position` within the
 * window has the same session ids as the window's current tab. The ids never
 * leave the automation process.
 */
async function holdsCurrentSessions(
  checks: readonly (readonly [number, number])[]
): Promise<boolean[]> {
  return runJxa<boolean[]>(
    `var app = Application(${JSON.stringify(ITERM)});
    function ids(tab) { return JSON.stringify(tab.sessions.id()); }
    return ${JSON.stringify(checks)}.map(function (check) {
      var window = app.windows.byId(check[0]);
      return ids(window.tabs.at(check[1])) === ids(window.currentTab());
    });`,
    { timeout: 30_000 }
  )
}

/**
 * Whether `window`'s current tab is an index selector whose container is
 * `window`. Its form was checked when the record decoded (D11); its
 * container's id is the window's own.
 */
function isIndexSelectorWithin(window: Window): boolean {
  const tab = window.currentTab
  return tab !== null && tab.container.resource === 'Window' && tab.container.id === window.id
}

describe.skipIf(!liveAppsEnabled)('iTerm windows and tabs (local only)', () => {
  let iterm: iTermClient
  let windows: readonly Window[] = []
  /** Whether iTerm was running before the suite's first call, so the suite did not launch it. */
  let wasRunning = true

  beforeAll(async () => {
    wasRunning = itermIsRunning()
    console.info(`iTerm was already running: ${String(wasRunning)}`)
    const key = await createApiKey({
      name: 'Live iTerm window and tab reads test',
      permissions: ['iterm:windows:list', 'iterm:windows:get', 'iterm:tabs:list', 'iterm:tabs:get'],
    })
    iterm = createClient(iTermContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  }, LIVE_TEST_TIMEOUT_MS)

  afterAll(async () => {
    // Leave iTerm as the suite found it: quit it only when the suite launched it.
    if (wasRunning) return
    try {
      execFileSync('osascript', ['-e', `tell application id "${ITERM}" to quit`], {
        stdio: 'ignore',
        timeout: 20_000,
      })
    } catch {
      // A quit that did not return is reported below, by whether iTerm still runs.
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000))
    if (itermIsRunning()) {
      console.warn(
        'iTerm is still running after the suite quit it: a confirmation may be showing. It was left untouched.'
      )
    }
  }, 60_000)

  it(
    'lists the windows and gets each by its id',
    async () => {
      windows = (await iterm.windows.list()).items
      console.info(`iTerm windows listed: ${String(windows.length)}`)
      expect(windows.length).toBeGreaterThan(0)
      const roundTrips: boolean[] = []
      for (const listed of windows) {
        roundTrips.push((await iterm.windows.get(listed.id)).id === listed.id)
      }
      console.info(`window ids that round-trip: ${String(roundTrips.filter(Boolean).length)}`)
      expect(roundTrips.every(Boolean)).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    "parses the specifier iTerm returns for each window's current tab",
    async () => {
      const parsed = await currentTabsParse(windows.map(({ id }) => id))
      console.info(
        `current-tab specifiers parsed: ${String(parsed.filter(Boolean).length)} of ${String(parsed.length)}`
      )
      expect(parsed.length).toBe(windows.length)
      expect(parsed.every(Boolean)).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    "reads each window's current tab as an index selector within that window, from a get and the list",
    async () => {
      const fromList = windows.map(isIndexSelectorWithin)
      const fromGet: boolean[] = []
      for (const { id } of windows) fromGet.push(isIndexSelectorWithin(await iterm.windows.get(id)))
      console.info(
        `index selectors within their window: list ${String(fromList.filter(Boolean).length)}, get ${String(fromGet.filter(Boolean).length)}`
      )
      expect(fromList.every(Boolean)).toBe(true)
      expect(fromGet.every(Boolean)).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    "resolves each window's current tab to the tab holding the current tab's sessions",
    async () => {
      const checks: [number, number][] = []
      for (const window of windows) {
        const tab = window.currentTab
        if (tab === null) continue
        await tab.resolve()
        checks.push([window.id, tab.selector.index])
      }
      const same = await holdsCurrentSessions(checks)
      console.info(
        `resolved to the current tab: ${String(same.filter(Boolean).length)} of ${String(same.length)}`
      )
      expect(same.length).toBe(windows.length)
      expect(same.every(Boolean)).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    "fails a tab get just past a window's last tab with InvalidSelectionError naming Tab",
    async () => {
      const [first] = windows
      if (first === undefined) throw new Error('no window was listed')
      const count = (await iterm.tabs.list(first.id)).items.length
      let resource: unknown
      try {
        await iterm.tabs.get(first.id, Integer.validate(count))
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidSelectionError)
        resource = error instanceof InvalidSelectionError ? error.details.resource : undefined
      }
      console.info(`past-the-end get named Tab: ${String(resource === 'Tab')}`)
      expect(resource).toBe('Tab')
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'gets and resolves a second tab by its position, when a window holds 2 or more',
    async (context) => {
      let holder: Window | undefined
      for (const window of windows) {
        if ((await iterm.tabs.list(window.id)).items.length >= 2) {
          holder = window
          break
        }
      }
      if (holder === undefined) {
        console.info('No window holds 2 or more tabs, so no second tab is checked.')
        context.skip()
        return
      }
      const second = Integer.validate(1)
      const got = await iterm.tabs.get(holder.id, second)
      const resolved = await bindReference(iterm, {
        app: 'iterm',
        resource: 'Tab',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: second },
        container: {
          app: 'iterm',
          resource: 'Window',
          form: 'identity',
          cardinality: 'one',
          id: holder.id,
        },
      }).resolve()
      // The get and the resolution find the same tab; its own index is
      // reported, not asserted, since 2+ tabs had not been observed before.
      const same = got.index === resolved.index
      console.info(
        `second tab: get and resolve agree ${String(same)}, its index is 1 ${String(got.index === 1)}`
      )
      expect(same).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})

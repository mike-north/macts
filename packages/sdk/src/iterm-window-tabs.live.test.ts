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
 *      position, and each is checked against the independently addressed tab. Otherwise the case is skipped,
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
 * it with one plain quit afterwards. iTerm asks to confirm a quit while
 * windows are open, by default, so before launching it the suite reads only
 * the quit-confirmation preferences ({@link QUIT_CONFIRMATIONS}). When either
 * is on, it does not launch iTerm, and skips, saying why; open iTerm before
 * the run to check it. If iTerm still runs after the quit, the suite fails,
 * leaving iTerm and any confirmation untouched.
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
import { AppManifestSchema, runJxa } from '@macts/core'
import { NATIVE_POSITION_READER } from '@macts/core/testing'
import { Integer, InvalidSelectionError, UnexpectedValueError } from '@macts/contracts'
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
 * The preferences under which iTerm asks to confirm a quit, with the value
 * iTerm takes when one is unset (`sources/Settings/iTermPreferences.m`, the
 * defaults table; `applicationShouldTerminate:` in
 * `sources/AppKit/iTermApplicationDelegate.m` asks when windows are open, or
 * when more than one session is).
 */
const QUIT_CONFIRMATIONS = [
  { key: 'PromptOnQuit', unset: true },
  { key: 'OnlyWhenMoreTabs', unset: true },
] as const

/**
 * The quit-confirmation preference that is on, if any, read key by key and
 * never the whole domain. A value that is not 0 or 1 counts as on.
 */
function quitConfirmationOn(): string | undefined {
  return QUIT_CONFIRMATIONS.find(({ key, unset }) => {
    try {
      return execFileSync('defaults', ['read', ITERM, key], { encoding: 'utf8' }).trim() !== '0'
    } catch {
      return unset
    }
  })?.key
}

/** Whether iTerm ran before the suite: if not, the suite's first read launches it. */
const wasRunning = !liveAppsEnabled || itermIsRunning()

/** Why the suite does not launch iTerm: it could not quit iTerm cleanly afterwards. */
const launchRefusal = (() => {
  const on = wasRunning ? undefined : quitConfirmationOn()
  return on === undefined
    ? undefined
    : `iTerm asks to confirm quit (${on}); the test would launch it and cannot close it cleanly, so it was not launched. Open iTerm before the run.`
})()
if (launchRefusal !== undefined) console.warn(launchRefusal)

/**
 * For each window id, whether the position reader gives a position within
 * the window's `tabs` for the specifier iTerm returns for its current tab.
 */
async function currentTabsParse(windowIds: readonly number[]): Promise<boolean[]> {
  return runJxa<boolean[]>(
    `${NATIVE_POSITION_READER.prelude}
    var app = Application(${JSON.stringify(ITERM)});
    return ${JSON.stringify(windowIds)}.map(function (id) {
      var position = __mactsPositionOf(app.windows.byId(id).currentTab(), 'tabs');
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

/** Compare uniquely identified dictionary indexes to the second tab without returning session ids. */
async function holdsSecondSessions(
  windowId: number,
  indexes: readonly (number | null)[]
): Promise<boolean[]> {
  return runJxa<boolean[]>(
    `var window = Application(${JSON.stringify(ITERM)}).windows.byId(${String(windowId)});
    var tabs = window.tabs();
    var expected = JSON.stringify(window.tabs.at(1).sessions.id());
    return ${JSON.stringify(indexes)}.map(function (index) {
      if (index === null) return false;
      var matches = tabs.filter(function (tab) { return tab.index() === index; });
      return matches.length === 1 && JSON.stringify(matches[0].sessions.id()) === expected;
    });`,
    { timeout: 30_000 }
  )
}

/**
 * The structure of the value iTerm gives for each declared Window field of
 * the window at `position` in its list, one line per field: the JS type, an
 * array's length and its elements' types, or an object's keys and their
 * values' types; or, when the read fails, its error number alone. Each read
 * runs in its own `try`, inside the automation process, which returns only
 * these descriptions: no value, text included, ever leaves it.
 */
async function windowFieldStructures(position: number): Promise<string[]> {
  const manifest = AppManifestSchema.parse(await iTermContract.loadManifest())
  const fields = Object.keys(manifest.resources['Window']?.properties ?? {})
  return runJxa<string[]>(
    `function shape(v, depth) {
      if (v === null || v === undefined) return String(v);
      var inner = function (e) { return depth > 0 ? shape(e, depth - 1) : typeof e; };
      if (Array.isArray(v)) return 'array(' + v.length + ')[' + v.map(inner).join(', ') + ']';
      if (typeof v === 'object') {
        return 'object{' + Object.keys(v).map(function (k) { return k + ': ' + inner(v[k]); }).join(', ') + '}';
      }
      return typeof v;
    }
    var window = Application(${JSON.stringify(ITERM)}).windows[${String(position)}];
    return ${JSON.stringify(fields)}.map(function (field) {
      try { return field + ': ' + shape(window[field](), 1); }
      catch (e) { return field + ': read failed (' + String(e && e.errorNumber) + ')'; }
    });`,
    { timeout: 30_000 }
  )
}

/**
 * Runs `read`; when iTerm's value does not match the contract, logs where, by
 * the issues' paths alone, then the structure of every field of the window
 * at that position ({@link windowFieldStructures}), then rethrows the
 * mismatch. A path names fields and list positions only; an issue's message
 * can quote the app's value, so it is never logged. A failure of the
 * structure read is logged as such and never replaces the mismatch.
 */
async function reportingContractPaths<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (error instanceof UnexpectedValueError) {
      const paths = error.details.issues.map(({ path }) => path)
      console.info(`contract mismatch at: ${paths.map((path) => path.join('.')).join(', ')}`)
      const position = paths[0]?.find((segment): segment is number => typeof segment === 'number')
      try {
        const structures = await windowFieldStructures(position ?? 0)
        console.info(`window ${String(position ?? 0)} fields:\n  ${structures.join('\n  ')}`)
      } catch {
        console.info('the window field structures could not be read')
      }
    }
    throw error
  }
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

describe.skipIf(!liveAppsEnabled || launchRefusal !== undefined)(
  'iTerm windows and tabs (local only)',
  () => {
    let iterm: iTermClient
    let windows: readonly Window[] = []

    /**
     * The windows the first case listed. A later case fails, rather than
     * passing over no windows, when none were listed.
     */
    function listedWindows(): readonly Window[] {
      if (windows.length === 0) throw new Error('no window was listed')
      return windows
    }

    beforeAll(async () => {
      console.info(`iTerm was already running: ${String(wasRunning)}`)
      const key = await createApiKey({
        name: 'Live iTerm window and tab reads test',
        permissions: [
          'iterm:windows:list',
          'iterm:windows:get',
          'iterm:tabs:list',
          'iterm:tabs:get',
        ],
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
      // Polled for a bounded time; the quit is never repeated.
      for (let waited = 0; waited < 15_000 && itermIsRunning(); waited += 1_000) {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }
      if (itermIsRunning()) {
        throw new Error(
          'iTerm asks to confirm quit; the test launched it and cannot close it cleanly. It was left untouched.'
        )
      }
    }, 60_000)

    it(
      'lists the windows and gets each by its id',
      async () => {
        windows = (await reportingContractPaths(() => iterm.windows.list())).items
        console.info(`iTerm windows listed: ${String(windows.length)}`)
        expect(windows.length).toBeGreaterThan(0)
        const roundTrips: boolean[] = []
        for (const listed of windows) {
          const got = await reportingContractPaths(() => iterm.windows.get(listed.id))
          roundTrips.push(got.id === listed.id)
        }
        console.info(`window ids that round-trip: ${String(roundTrips.filter(Boolean).length)}`)
        expect(roundTrips.every(Boolean)).toBe(true)
      },
      LIVE_TEST_TIMEOUT_MS
    )

    it(
      "parses the specifier iTerm returns for each window's current tab",
      async () => {
        const parsed = await currentTabsParse(listedWindows().map(({ id }) => id))
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
        const fromList = listedWindows().map(isIndexSelectorWithin)
        const fromGet: boolean[] = []
        for (const { id } of windows)
          fromGet.push(isIndexSelectorWithin(await iterm.windows.get(id)))
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
        for (const window of listedWindows()) {
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
        const [first] = listedWindows()
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
        for (const window of listedWindows()) {
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
        // Dictionary indexes identify the returned records for comparison;
        // they are not the zero-based position used to address the tab.
        const same = await holdsSecondSessions(holder.id, [got.index, resolved.index])
        console.info(`second tab: get ${String(same[0])}, resolve ${String(same[1])}`)
        expect(same).toEqual([true, true])
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)

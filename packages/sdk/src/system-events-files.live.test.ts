/**
 * LOCALLY-AUTOMATABLE live check of the System Events disk item, folder and
 * domain reads against the real app. NOT run in CI.
 *
 * ## What this tests
 *
 * Through `@macts/sdk/local`'s `createClient`, with the default native
 * executor and a real API key, end to end through the invocation pipeline
 * (verify, permission, governance, validate input, execute, validate output):
 *
 *   0. a direct read-only check, outside macts, of how each domain reads
 *      the Application Support, Applications and Library folders, the way
 *      the codec reads a folder: the folder, then its POSIX path
 *      (`./domain-folders-oracle.ts`, which reports only fixed tokens). It
 *      prints counts per folder, index booleans per domain, the observation
 *      time and the app and OS versions, as evidence for those folders. It
 *      runs first, so it is recorded even when the domain list fails;
 *   1. `domains.list`, then `domains.get` of each listed domain by its id,
 *      which must come back with the same id;
 *   2. `userDomainObjects.list` and `userDomainObjects.get('user')`, whose
 *      kind must be `user`; then the user domain's home folder, resolved
 *      through its reference and got again by `folders.get` of its POSIX
 *      path, both coming back with that path;
 *   3. the user domain's Sites folder, which must read as `null` exactly when
 *      a direct read-only existence check, outside macts, finds it does not
 *      exist (`./sites-folder-oracle.ts`, which reports only a boolean or an
 *      exit status): the folder exists only once the user creates one;
 *   4. `diskItems.get` of the home folder's path and of a system file's path,
 *      and the home folder's `container` resolved as a disk item;
 *   5. `folders.get` of the file's path, which must fail as a missing target:
 *      the folders' key finds only folders;
 *   6. `classicDomainObjects.list`, and, when it lists the Classic domain,
 *      `classicDomainObjects.get('classic')`, whose kind must be `classic`.
 *
 * A disk item and a folder are identified by their POSIX path, which names a
 * location: these reads find whatever is at the path when they run.
 *
 * Reading System Events launches it if it is not running. Apart from that the
 * suite is read-only: nothing is created, moved, renamed, changed or deleted.
 * It leaves System Events as it found it: it quits System Events afterwards
 * only when it was not running before the suite started. It prints only
 * counts and booleans, never a path, name or id: identifiers are compared as
 * booleans, so a failed comparison shows no value. Every process it starts
 * has its standard error discarded, so nothing a process writes there
 * reaches the terminal.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control System Events. The first run raises a one-time prompt that only a
 *   person at the Mac can answer; until it is answered, calls hang and then
 *   fail with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * Run vitest in the package directly, not through `pnpm --filter`, whose
 * failure output prints a path.
 *
 * ```sh
 * cd packages/sdk && MACTS_LIVE_APPS=1 pnpm exec vitest run src/system-events-files.live.test.ts
 * ```
 *
 * @see ../../../manifests/system-events/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D10 key targeting, singleton roots)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TargetNotFoundError } from '@macts/contracts'
import { systemEventsContract, type SystemEventsClient } from '@macts/system-events/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'
import { DOMAIN_FOLDERS, directDomainFoldersCheck, macosVersion } from './domain-folders-oracle.js'
import { directSitesFolderCheck } from './sites-folder-oracle.js'
import {
  runLiveCheck,
  stopSystemEvents,
  systemEventsIsRunning,
} from './system-events-live-boundary.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, for a few reads. */
const LIVE_TEST_TIMEOUT_MS = 120_000

/**
 * A file every macOS install has, outside any user's folders. Its path is
 * never printed.
 */
const SYSTEM_FILE = '/private/etc/hosts'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  let home: string
  try {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-system-events-live-'))
  } catch {
    throw new Error('System Events live setup failed')
  }
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(() =>
  runLiveCheck(async () => {
    closeKeyStore()
    const { rm } = await import('node:fs/promises')
    await rm(mactsHome, { recursive: true, force: true })
  })
)

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe.skipIf(!liveAppsEnabled)(
  'System Events disk items, folders and domains (local only)',
  () => {
    let systemEvents: SystemEventsClient
    /** Whether System Events was running before the suite's first call, so the suite did not launch it. */
    let wasRunning = true

    // prettier-ignore
    beforeAll(() => runLiveCheck(async () => {
      wasRunning = systemEventsIsRunning()
      const key = await createApiKey({
        name: 'Live System Events files test',
        permissions: [
          'system-events:diskItems:get',
          'system-events:folders:get',
          'system-events:domains:list',
          'system-events:domains:get',
          'system-events:userDomainObjects:list',
          'system-events:userDomainObjects:get',
          'system-events:classicDomainObjects:list',
          'system-events:classicDomainObjects:get',
        ],
      })
      systemEvents = createClient(systemEventsContract, {
        token: key.token,
        governance: { policy: ALLOW_ALL_POLICY },
      })
    }), LIVE_TEST_TIMEOUT_MS)

    afterAll(() => {
      // Leave System Events as the suite found it: quit it only when the suite launched it.
      if (wasRunning) return
      stopSystemEvents()
    })

    /** The POSIX path of the user's home folder, read through the user domain. */
    async function homeFolderPath(): Promise<string> {
      const user = await systemEvents.userDomainObjects.get('user')
      const home = user.homeFolder
      if (home?.form !== 'identity') throw new Error('the home folder did not read')
      return home.id
    }

    // Evidence for the domain folders that have none yet: before any macts
    // read, so it is recorded even when the domain list fails. Counts, index
    // booleans, the observation time and the app and OS versions only.
    // prettier-ignore
    it(
      'records how each domain reads the folders with no evidence of absence',
      () => runLiveCheck(() => {
        const observedAt = new Date().toISOString()
        const check = directDomainFoldersCheck()
        console.info(`System Events domain folder check observed at: ${observedAt}`)
        if (check.outcome !== 'checked') {
          console.info(
            `System Events domain folder check: ${check.outcome}${check.outcome === 'failed' ? `, exit status ${String(check.status)}` : ''}`
          )
        }
        expect(check.outcome).toBe('checked')
        if (check.outcome !== 'checked') return
        console.info(
          `System Events version: ${check.appVersion}; macOS version: ${macosVersion() ?? 'unknown'}`
        )
        const total = check.domains.length
        for (const folder of DOMAIN_FOLDERS) {
          const reads = check.domains.map((domain) => domain[folder].outcome)
          const count = (outcome: string): string =>
            String(reads.filter((read) => read === outcome).length)
          console.info(
            `System Events ${folder}: ok ${count('ok')}, missing ${count('missing')}, other ${count('other')} of ${String(total)} domains`
          )
        }
        check.domains.forEach((domain, index) => {
          for (const folder of DOMAIN_FOLDERS) {
            const read = domain[folder]
            const other =
              read.outcome === 'other' ? ` other=${String(read.errorNumber ?? 'none')}` : ''
            console.info(
              `domain ${String(index + 1)}: ${folder} ok=${String(read.outcome === 'ok')}${other}`
            )
          }
        })
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'lists the domains and gets each by its id',
      () => runLiveCheck(async () => {
        const domains = await systemEvents.domains.list()
        console.info(`System Events domains listed: ${String(domains.items.length)}`)
        expect(domains.items.length).toBeGreaterThan(0)
        let roundTrips = 0
        let notFound = 0
        for (const domain of domains.items) {
          // Each domain is tried, so a failure reports how many failed, by count.
          try {
            const got = await systemEvents.domains.get(domain.id)
            if (got.id === domain.id) roundTrips += 1
          } catch (error) {
            if (!(error instanceof TargetNotFoundError)) throw error
            notFound += 1
          }
        }
        console.info(
          `System Events domain ids that round-trip: ${String(roundTrips)}; not found: ${String(notFound)}`
        )
        expect(roundTrips === domains.items.length).toBe(true)
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'reads the user domain by its kind, and its home folder by reference and by path',
      () => runLiveCheck(async () => {
        const users = await systemEvents.userDomainObjects.list()
        console.info(`System Events user domains listed: ${String(users.items.length)}`)
        expect(users.items.length).toBe(1)
        const user = await systemEvents.userDomainObjects.get('user')
        expect(user.kind).toBe('user')

        const home = user.homeFolder
        expect(home !== null && home.form === 'identity').toBe(true)
        if (home === null) return
        const resolved = await home.resolve()
        const path = await homeFolderPath()
        const got = await systemEvents.folders.get(path)
        expect(resolved.posixPath === path, 'the home folder reference resolves at its path').toBe(
          true
        )
        expect(got.posixPath === path, 'the home folder path round-trips').toBe(true)
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'reads the Sites folder as null exactly when it does not exist',
      () => runLiveCheck(async () => {
        const user = await systemEvents.userDomainObjects.get('user')
        expect(user.kind).toBe('user')
        // The check reports only whether the folder exists, or an exit status.
        const check = directSitesFolderCheck()
        const status = check.outcome === 'failed' ? String(check.status) : 'none'
        expect(check.outcome, `the existence check ran (exit status ${status})`).toBe('checked')
        if (check.outcome !== 'checked') return
        console.info(`System Events Sites folder exists: ${String(check.exists)}`)
        expect(
          user.sitesFolder === null,
          'the Sites folder is null exactly when it does not exist'
        ).toBe(!check.exists)
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'gets disk items by path, and a folder container as a disk item',
      () => runLiveCheck(async () => {
        const path = await homeFolderPath()
        const home = await systemEvents.diskItems.get(path)
        expect(home.posixPath === path, 'the home folder is a disk item at its path').toBe(true)

        const file = await systemEvents.diskItems.get(SYSTEM_FILE)
        expect(file.posixPath === SYSTEM_FILE, 'the system file is a disk item at its path').toBe(
          true
        )

        const container = home.container
        expect(container !== null, 'the home folder has a container').toBe(true)
        if (container === null) return
        const parent = await container.resolve()
        expect(parent.posixPath.length > 0, 'the container reads as a disk item').toBe(true)
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'finds no folder at a file path',
      () => runLiveCheck(async () => {
        const error = await rejectionOf(systemEvents.folders.get(SYSTEM_FILE))
        expect(
          error instanceof TargetNotFoundError,
          'a folder get at a file path is a missing target'
        ).toBe(true)
      }),
      LIVE_TEST_TIMEOUT_MS
    )

    // prettier-ignore
    it(
      'reads the Classic domain by its kind when the app has one',
      async (context) => {
        const hasClassic = await runLiveCheck(async () => {
        const classics = await systemEvents.classicDomainObjects.list()
        console.info(`System Events Classic domains listed: ${String(classics.items.length)}`)
        if (classics.items.length === 0) {
          console.warn('SKIPPING the Classic domain get: this Mac has no Classic domain.')
          return false
        }
        const classic = await systemEvents.classicDomainObjects.get('classic')
        expect(classic.kind).toBe('classic')
        return true
        })
        if (!hasClassic) context.skip('this Mac has no Classic domain')
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)

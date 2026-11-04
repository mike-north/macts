/**
 * LOCALLY-AUTOMATABLE live check of the Xcode workspace reads against the
 * real app. NOT run in CI.
 *
 * ## What this tests
 *
 * Through `@macts/sdk/local`'s `createClient`, with the default native
 * executor and a real API key, end to end through the invocation pipeline
 * (verify, permission, governance, validate input, execute, validate output):
 *
 *   1. `workspaceDocuments.list`;
 *   2. for the first workspace document, `schemes.list`, then `schemes.get`
 *      of the first scheme by the workspace's name and the scheme's id, which
 *      must come back with the same id;
 *   3. the same for run destinations and for projects, when the workspace has
 *      any.
 *
 * Xcode's scripting dictionary has projects, schemes and run destinations
 * only as elements of a workspace document, so each is read only within its
 * workspace document.
 *
 * Run destination names are observed, not claimed: the run destination case
 * prints how many the first workspace lists and how many distinct names they
 * have. Nothing here asserts that run destination names are unique: they
 * likely repeat within one workspace (the same simulator name on two
 * runtimes), so a uniqueness claim needs a live check across two or more
 * runtimes first.
 *
 * Reading Xcode launches it if it is not running. Apart from that the suite
 * is read-only: no document is opened, closed or changed, nothing is built or
 * run, and Xcode is never quit. The test prints only counts, never a name, id
 * or path. Each child case finds the first workspace document itself, so a
 * case can run alone (`-t`). A case skips, and says why, when no workspace
 * document is open or the workspace lists none of its children.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Xcode installed and, for anything
 *   beyond the workspace list, a workspace or project open.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Xcode. The first run raises a one-time prompt that only a person
 *   at the Mac can answer; until it is answered, calls hang and then fail
 *   with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/xcode.live.test.ts
 * ```
 *
 * @see ../../../manifests/xcode/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D10 command parents)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { xcodeContract, type XcodeClient } from '@macts/xcode/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, for two reads. */
const LIVE_TEST_TIMEOUT_MS = 120_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-xcode-live-'))
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

/** A case's test context, as far as skipping goes. */
interface SkipContext {
  skip(note?: string): never
}

describe.skipIf(!liveAppsEnabled)('Xcode workspace reads (local only)', () => {
  let xcode: XcodeClient

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live Xcode reads test',
      permissions: [
        'xcode:workspaceDocuments:list',
        'xcode:projects:list',
        'xcode:projects:get',
        'xcode:schemes:list',
        'xcode:schemes:get',
        'xcode:runDestinations:list',
        'xcode:runDestinations:get',
      ],
    })
    xcode = createClient(xcodeContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  }, LIVE_TEST_TIMEOUT_MS)

  /**
   * The name of the first open workspace document. Each case looks it up
   * itself, so it does not depend on another case having run; with none open,
   * the case skips, saying so.
   */
  async function firstWorkspace(context: SkipContext): Promise<string> {
    const workspaces = await xcode.workspaceDocuments.list()
    const name = workspaces.items[0]?.name
    if (name === undefined) {
      console.warn('SKIPPING: no workspace document is open in Xcode.')
      return context.skip('no workspace document is open')
    }
    return name
  }

  /** Skips the case, saying why, when the first workspace lists no `what`. */
  function skipIfEmpty(context: SkipContext, count: number, what: string): void {
    if (count > 0) return
    console.warn(`SKIPPING: the first workspace document lists no ${what}.`)
    context.skip(`the first workspace document lists no ${what}`)
  }

  it(
    'lists workspace documents',
    async () => {
      const workspaces = await xcode.workspaceDocuments.list()
      console.info(`Xcode workspace documents listed: ${String(workspaces.items.length)}`)
      if (workspaces.items.length === 0) {
        console.warn(
          'SKIPPING the scheme, run destination and project reads: no workspace document is open in Xcode.'
        )
      }
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the schemes of the first workspace and gets the first by the workspace and its id',
    async (context) => {
      const workspaceName = await firstWorkspace(context)
      const schemes = await xcode.schemes.list(workspaceName)
      const ids = schemes.items.map((scheme) => scheme.id)
      console.info(`Xcode schemes listed in the first workspace: ${String(ids.length)}`)
      skipIfEmpty(context, ids.length, 'schemes')
      const [first] = ids
      if (first === undefined) throw new Error('no scheme was listed')
      const got = await xcode.schemes.get(workspaceName, first)
      expect(got.id === first).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the run destinations of the first workspace and gets the first by the workspace and its name',
    async (context) => {
      const workspaceName = await firstWorkspace(context)
      const destinations = await xcode.runDestinations.list(workspaceName)
      const names = destinations.items.map((destination) => destination.name)
      // Observation only: no claim is made that run destination names are unique.
      console.info(
        `Xcode run destinations listed in the first workspace: ${String(names.length)}, distinct names: ${String(new Set(names).size)}`
      )
      skipIfEmpty(context, names.length, 'run destinations')
      const [first] = names
      if (first === undefined) throw new Error('no run destination was listed')
      const got = await xcode.runDestinations.get(workspaceName, first)
      expect(got.name === first).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the projects of the first workspace and gets the first by the workspace and its id',
    async (context) => {
      const workspaceName = await firstWorkspace(context)
      const projects = await xcode.projects.list(workspaceName)
      const ids = projects.items.map((project) => project.id)
      console.info(`Xcode projects listed in the first workspace: ${String(ids.length)}`)
      skipIfEmpty(context, ids.length, 'projects')
      const [first] = ids
      if (first === undefined) throw new Error('no project was listed')
      const got = await xcode.projects.get(workspaceName, first)
      expect(got.id === first).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})

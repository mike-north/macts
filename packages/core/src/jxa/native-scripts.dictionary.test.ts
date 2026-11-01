/**
 * Checks the collection accessors that native bodies address against the
 * scripting dictionaries of the apps installed on this Mac.
 *
 * Bodies name a top-level collection as `app["<accessor>"]`. The automation
 * bridge resolves an accessor only when it is the app's own spelling of a
 * dictionary term. `Automation.getDisplayString` renders a resolved accessor
 * on the application object as a specifier (`Application("Photos").mediaItems`)
 * and an unknown one as a plain function, so each accessor can be checked
 * without sending the app an event. Checking needs no automation permission and
 * does not launch the app.
 *
 * Only top-level collections can be checked this way: under an element
 * specifier, the bridge echoes any name without consulting the dictionary.
 * Apps that are not installed are skipped; the suite fails if no accessor at
 * all could be checked.
 *
 * Runs on macOS only.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — D4 (native
 *   script bodies)
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { OperationTarget } from '@macts/contracts'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import { resolveCollectionAccessor } from '../manifest/native-accessor.js'
import { buildNativeBody } from './native-scripts.js'

const MANIFESTS_DIR = fileURLToPath(new URL('../../../../manifests/', import.meta.url))

/**
 * Accessors a shipped manifest declares that the app's dictionary does not
 * have, each with the issue tracking the manifest fix. The check expects
 * exactly these to fail: an entry that starts resolving, or that no body
 * addresses any more, must be removed here.
 */
const KNOWN_UNRESOLVED: Readonly<Record<string, string>> = {
  // Screen Sharing publishes no scripting dictionary at all.
  'screen-sharing: app["connections"]': 'https://github.com/mike-north/macts/issues/165',
}

/** The top-level collection accessors one app's bodies address, with an operation using each. */
interface AppAccessors {
  readonly app: string
  readonly bundleId: string
  readonly accessors: ReadonlyMap<string, string>
}

async function collectAccessors(): Promise<AppAccessors[]> {
  const apps = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`${MANIFESTS_DIR}${entry.name}/app.yaml`))
    .map((entry) => entry.name)
  const result: AppAccessors[] = []
  for (const app of apps) {
    const manifest = await loadManifest(`${MANIFESTS_DIR}${app}/app.yaml`)
    const accessors = new Map<string, string>()
    for (const route of resolveManifestRoutes(manifest)) {
      if (route.resourceType === undefined) continue
      const resource = manifest.resources[route.resourceType]
      if (resource === undefined) continue
      const target: OperationTarget = { command: route.commandKey, resource: route.resourceType }
      const accessor = resolveCollectionAccessor(resource)
      if (buildNativeBody(manifest, target).includes(`app[${JSON.stringify(accessor)}]`)) {
        accessors.set(accessor, route.route)
      }
    }
    if (accessors.size > 0) result.push({ app, bundleId: manifest.app.bundleId, accessors })
  }
  return result
}

/**
 * Resolve each accessor on the application object. Returns `undefined` when
 * the app is not installed, else whether each accessor resolved.
 */
function resolveInDictionary(
  bundleId: string,
  accessors: readonly string[]
): Record<string, boolean> | undefined {
  const script = [
    'var app;',
    `try { app = Application(${JSON.stringify(bundleId)}); } catch (e) { app = null; }`,
    'var out = null;',
    'if (app !== null) {',
    '  out = {};',
    `  ${JSON.stringify(accessors)}.forEach(function (name) {`,
    '    out[name] = Automation.getDisplayString(app[name]).indexOf("Application(") === 0;',
    '  });',
    '}',
    'JSON.stringify(out);',
  ].join('\n')
  const stdout = execFileSync('osascript', ['-l', 'JavaScript'], {
    input: script,
    encoding: 'utf8',
    timeout: 30000,
  })
  const parsed = JSON.parse(stdout) as Record<string, boolean> | null
  return parsed ?? undefined
}

describe.skipIf(process.platform !== 'darwin')(
  'collection accessors resolve in the installed apps’ dictionaries',
  () => {
    let apps: AppAccessors[]
    beforeAll(async () => {
      apps = await collectAccessors()
    })

    it('every top-level accessor a body addresses names a collection of the app', () => {
      let checked = 0
      const unresolved: string[] = []
      const expectedUnresolved: string[] = []
      const checkedApps = new Set<string>()
      for (const { app, bundleId, accessors } of apps) {
        const resolved = resolveInDictionary(bundleId, [...accessors.keys()])
        if (resolved === undefined) continue
        checkedApps.add(app)
        for (const [accessor, route] of accessors) {
          checked++
          const key = `${app}: app["${accessor}"]`
          if (key in KNOWN_UNRESOLVED) expectedUnresolved.push(key)
          if (resolved[accessor] !== true) unresolved.push(key)
          else expect(key in KNOWN_UNRESOLVED, `${key} (${route}) now resolves`).toBe(false)
        }
      }
      expect(checked, 'no installed app could be checked').toBeGreaterThan(0)
      expect(unresolved).toEqual(expectedUnresolved)
      // A known entry whose app was checked but whose accessor no body
      // addresses any more is stale, and must be removed.
      const stale = Object.keys(KNOWN_UNRESOLVED).filter(
        (key) =>
          checkedApps.has(key.slice(0, key.indexOf(':'))) && !expectedUnresolved.includes(key)
      )
      expect(stale).toEqual([])
    }, 300000)
  }
)

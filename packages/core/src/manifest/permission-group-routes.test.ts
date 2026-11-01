/**
 * Guard: a permission group lists only permissions some route requires.
 *
 * A manifest's `permissions` map bundles the app's permissions by resource and
 * access kind (`tabs.read`, `documents.write`), so a caller can ask for a
 * group instead of naming each operation. The bundle is macts's own
 * convenience, not a fact from the app's dictionary. An entry no route
 * requires names an operation the app does not publish: a grant of it
 * authorizes nothing, yet discovery and `api-key create` present it as real.
 * An operation that is planned but has no command is simply absent; adding
 * its command later adds its group entry in the same change.
 *
 * This suite fails when, in any shipped manifest, a group entry other than a
 * wildcard is not the permission (`ManifestRoute.permission`) of some route
 * the manifest resolves. Wildcard entries (`app:resource:*`) are not checked
 * here: they name a range, not an operation.
 *
 * Regression: Microsoft Edge listed `tabs.write: microsoft-edge:tabs:update`
 * with no update route, and Terminal listed `commands.execute:
 * terminal:commands:doScript`, a name no route has (its route permission is
 * `terminal:app:doScript`).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2
 * @see https://github.com/mike-north/macts/issues/168
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest, parseManifestYaml } from './loader.js'
import { resolveManifestRoutes } from './route.js'
import type { AppManifest } from './schemas/index.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** Whether a permission names a range of operations rather than one. */
function isWildcard(permission: string): boolean {
  return permission.includes('*')
}

/**
 * Every non-wildcard entry of `manifest`'s permission groups that no resolved
 * route requires, one line each, with how many entries were checked.
 */
function orphanEntries(dir: string, manifest: AppManifest): { checked: number; orphans: string[] } {
  const required = new Set(resolveManifestRoutes(manifest).map((route) => route.permission))
  const orphans: string[] = []
  let checked = 0
  for (const [group, operations] of Object.entries(manifest.permissions ?? {})) {
    for (const [operation, permissions] of Object.entries(operations)) {
      for (const permission of permissions) {
        if (isWildcard(permission)) continue
        checked++
        if (!required.has(permission)) {
          orphans.push(`${dir}: group ${group}.${operation} lists "${permission}"`)
        }
      }
    }
  }
  return { checked, orphans }
}

let manifests: { dir: string; manifest: AppManifest }[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

function shipped(dir: string): AppManifest {
  const found = manifests.find((entry) => entry.dir === dir)
  if (found === undefined) throw new Error(`no shipped manifest in ${dir}`)
  return found.manifest
}

/**
 * A notes app with one route, `jotter.notes.list` (permission
 * `jotter:notes:list`), and a group that lists it, a wildcard, and an entry
 * no route requires.
 */
const FIXTURE: AppManifest = parseManifestYaml(`
version: '1.0'
app:
  bundleId: com.example.jotter
  name: Jotter
  tccEntitlements: []
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties:
      title: { access: r, type: string, description: Title }
enums: {}
hierarchy:
  children:
    notes: { resource: Note, access: r }
commands:
  list:
    name: list
    description: List notes
    scope: resource
    resourceType: Note
    parameters: []
permissions:
  notes:
    read:
      - jotter:notes:list
      - jotter:notes:*
    write:
      - jotter:notes:update
`)

describe('the permission-group check', () => {
  it('flags an entry no route requires, and passes a route permission and a wildcard', () => {
    // The fixture's only route requires jotter:notes:list (app jotter,
    // resource notes, route name list); jotter:notes:update names no route,
    // and the wildcard is not checked.
    expect(orphanEntries('jotter', FIXTURE)).toEqual({
      checked: 2,
      orphans: ['jotter: group notes.write lists "jotter:notes:update"'],
    })
  })
})

describe('permission groups in the shipped manifests', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('lists only permissions some route requires', () => {
    const results = manifests.map(({ dir, manifest }) => orphanEntries(dir, manifest))
    expect(results.flatMap((result) => result.orphans)).toEqual([])
    // Guards against a vacuous pass: the groups list over two hundred route
    // permissions between them, in about twenty apps. Lower these floors only
    // in a change that removes group entries or manifests on purpose, to just
    // below the new totals this test reports.
    expect(results.reduce((sum, result) => sum + result.checked, 0)).toBeGreaterThan(200)
    expect(results.filter((result) => result.checked > 0).length).toBeGreaterThan(15)
  })

  // Regression: Edge `tabs.write: microsoft-edge:tabs:update` with no update
  // route, and Terminal `commands:doScript`.
  it('lists no Edge tab update and no Terminal commands:doScript', () => {
    const edge = shipped('microsoft-edge')
    expect(edge.permissions?.['tabs']?.['write'] ?? []).not.toContain('microsoft-edge:tabs:update')
    expect(resolveManifestRoutes(edge).map((route) => route.route)).not.toContain(
      'microsoft-edge.tabs.update'
    )
    const terminal = shipped('terminal')
    const listed = Object.values(terminal.permissions ?? {}).flatMap((operations) =>
      Object.values(operations).flat()
    )
    expect(listed).not.toContain('terminal:commands:doScript')
  })
})

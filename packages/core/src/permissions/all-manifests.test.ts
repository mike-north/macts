/**
 * Every route permission any shipped manifest derives must be a valid,
 * grantable permission. Before the grammar admitted camelCase segments, 129 of
 * these could never be granted by anyone.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 */
import { readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { hasPermission } from './matcher.js'
import { isValidPermission } from './parser.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

async function loadAllManifests(): Promise<AppManifest[]> {
  const apps = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(MANIFESTS_DIR, entry.name, 'app.yaml'))
    )
    .map((entry) => entry.name)
    .sort()
  return Promise.all(apps.map((app) => loadManifest(join(MANIFESTS_DIR, app, 'app.yaml'))))
}

describe('permissions derived from every shipped manifest', async () => {
  const manifests = await loadAllManifests()
  const permissions = manifests.flatMap((manifest) =>
    resolveManifestRoutes(manifest).map((route) => route.permission)
  )

  it('covers the 473 routes on current main across 35 manifests', () => {
    expect(manifests).toHaveLength(35)
    expect(permissions).toHaveLength(473)
  })

  it('is valid for every route permission', () => {
    expect(permissions.filter((p) => !isValidPermission(p))).toEqual([])
  })

  it('uses no dash or underscore in a resource or operation segment', () => {
    const offenders = permissions.filter((p) => /[-_]/.test(p.split(':').slice(1).join(':')))
    expect(offenders).toEqual([])
  })

  it('is granted by itself, by its resource wildcard, and by the app wildcard', () => {
    const failures: string[] = []
    for (const permission of permissions) {
      const [app = '', resource = ''] = permission.split(':')
      for (const grant of [permission, `${app}:${resource}:*`, `${app}:*:*`]) {
        if (!hasPermission([grant], permission).granted) {
          failures.push(`${grant} does not grant ${permission}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('is not granted by a grant that differs only in letter case', () => {
    const camel = permissions.filter((p) => p !== p.toLowerCase())
    expect(camel.length).toBeGreaterThan(0)
    const granted = camel.filter((p) => hasPermission([p.toLowerCase()], p).granted)
    expect(granted).toEqual([])
  })
})

/**
 * Permission parity between the canonical routes and the HTTP server.
 *
 * Generated app contracts take each operation's id and permission from
 * `resolveManifestRoutes` (`@macts/core`). The HTTP server serves every
 * operation through the shared runtime, which enforces the permission it
 * registered for that operation. This suite asserts, for every manifest in
 * the repository, that:
 *
 * - introspection lists exactly the canonical operation ids, each with its
 *   canonical permission; and
 * - a caller holding no permission is refused every operation with
 *   `PERMISSION_DENIED`, naming exactly the canonical permission as required.
 *
 * Together these mean a contract descriptor never states a permission the
 * server does not enforce. The executor records every request, and none may
 * reach it.
 *
 * A few operations also pin their permission to a value written by hand from
 * the manifest. The suite therefore fails if the canonical derivation itself
 * drifts, not only if the server stops following it.
 *
 * @see ../../../core/src/manifest/route.ts
 * @see ../../../../manifests/calendar/app.yaml
 * @see ../../../../manifests/notes/app.yaml
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest, resolveManifestRoutes, type AppManifest } from '@macts/core'
import { createApp } from './index.js'
import { createFakeVerifier, createRecordingExecutor } from './test-helpers.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/** A key whose authority holds no permission at all. */
const NO_PERMISSIONS_TOKEN = 'macts_sk_no-permissions-token-must-never-leak'

interface LoadedApp {
  readonly dir: string
  readonly manifest: AppManifest
}

interface IntrospectBody {
  readonly endpoints: readonly { readonly path: string; readonly permission: string }[]
}

interface ErrorBody {
  readonly error: { readonly code: string; readonly details: { readonly required?: string } }
}

let apps: LoadedApp[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  apps = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        dir: entry.name,
        manifest: await loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')),
      }))
  )
})

/** The server for one manifest, with a recording executor and a no-permission key. */
function serverFor(manifest: AppManifest) {
  const executor = createRecordingExecutor()
  const app = createApp([manifest], {
    cors: false,
    executor,
    verifier: createFakeVerifier({
      [NO_PERMISSIONS_TOKEN]: { subject: 'key_no_permissions', permissions: [] },
    }),
  })
  return { app, executor }
}

/** The canonical permission of every operation the manifest exposes, by id. */
function canonicalPermissions(manifest: AppManifest): Map<string, string> {
  return new Map(resolveManifestRoutes(manifest).map((route) => [route.route, route.permission]))
}

describe('the HTTP server enforces the canonical permission of every operation', () => {
  it('discovers app manifests', () => {
    expect(apps.length).toBeGreaterThan(0)
  })

  it('lists exactly the canonical operations, each with its canonical permission', async () => {
    const mismatches: string[] = []
    for (const { dir, manifest } of apps) {
      const expected = canonicalPermissions(manifest)
      const { app } = serverFor(manifest)
      const res = await app.request('/api/v1/introspect')
      expect(res.status).toBe(200)
      const listed = new Map(
        ((await res.json()) as IntrospectBody).endpoints.map((endpoint) => [
          endpoint.path.replace(/^\/rpc\//, ''),
          endpoint.permission,
        ])
      )
      for (const [id, permission] of expected) {
        if (!listed.has(id)) mismatches.push(`${dir}: ${id} is not listed`)
        else if (listed.get(id) !== permission) {
          mismatches.push(`${dir}: ${id} lists ${String(listed.get(id))}, expected ${permission}`)
        }
      }
      for (const id of listed.keys()) {
        if (!expected.has(id)) mismatches.push(`${dir}: ${id} is listed but not canonical`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('refuses a caller with no permissions, naming the canonical permission', async () => {
    const mismatches: string[] = []
    let checked = 0
    for (const { dir, manifest } of apps) {
      const { app, executor } = serverFor(manifest)
      for (const [id, permission] of canonicalPermissions(manifest)) {
        const res = await app.request(`/api/v1/rpc/${id}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NO_PERMISSIONS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
        checked++
        const body = (await res.json()) as ErrorBody
        if (res.status !== 403 || body.error.code !== 'PERMISSION_DENIED') {
          mismatches.push(`${dir}: ${id} answered ${String(res.status)} ${body.error.code}`)
        } else if (body.error.details.required !== permission) {
          mismatches.push(
            `${dir}: ${id} requires ${String(body.error.details.required)}, expected ${permission}`
          )
        }
      }
      expect(executor.requests, dir).toHaveLength(0)
    }
    expect(checked).toBeGreaterThan(400)
    expect(mismatches).toEqual([])
  })

  // Written by hand from the manifests: a declared `permission` wins, otherwise
  // the permission is `<app>:<resource plural>:<route name>`, and the route name
  // defaults to the command key.
  it.each([
    ['calendar', 'calendar.events.create', 'calendar:events:create'],
    ['notes', 'notes.notes.get', 'notes:notes:get'],
    ['notes', 'notes.attachments.list', 'notes:attachments:list'],
    ['notes', 'notes.attachments.get', 'notes:attachments:get'],
  ])('%s: %s requires %s', (dir, id, permission) => {
    const loaded = apps.find((app) => app.dir === dir)
    if (loaded === undefined) throw new Error(`${dir} manifest not found`)
    expect(canonicalPermissions(loaded.manifest).get(id)).toBe(permission)
  })
})

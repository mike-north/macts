/**
 * Server-side route-coherence tests.
 *
 * Asserts that the routes the HTTP adapter registers — surfaced via the
 * `/introspect` endpoint — exactly match the canonical routes derived by
 * `resolveManifestRoutes` (`@macts/core`), for every app manifest in the repo.
 *
 * The generated client SDK is verified against the same canonical source in
 * `@macts/core` (`generator/route-coherence.test.ts`); together these two suites
 * prove client route == server route for every operation. This guards the
 * regression where the server exposed `calendar.events.createEvent` while the
 * client posted to `calendar.events.create`.
 *
 * @see ../../../core/src/manifest/route.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { AppManifest } from '@macts/core'
import { loadManifest, resolveManifestRoutes } from '@macts/core'
import { createApp } from './index.js'
import { createRecordingExecutor } from './test-helpers.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

interface IntrospectBody {
  endpoints: { path: string }[]
}

interface LoadedApp {
  dir: string
  manifest: AppManifest
}

let apps: LoadedApp[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  apps = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      manifest: await loadManifest(resolve(MANIFESTS_DIR, dir, 'app.yaml')),
    }))
  )
})

describe('server route registration matches the canonical routes', () => {
  it('discovers app manifests', () => {
    expect(apps.length).toBeGreaterThan(0)
  })

  it('introspect exposes exactly the canonical routes for every app', async () => {
    const mismatches: string[] = []

    for (const { dir, manifest } of apps) {
      const expected = new Set(resolveManifestRoutes(manifest).map((r) => `/rpc/${r.route}`))

      const app = createApp([manifest], { cors: false, executor: createRecordingExecutor() })
      const res = await app.request('/api/v1/introspect')
      expect(res.status).toBe(200)
      const body = (await res.json()) as IntrospectBody
      const actual = new Set(body.endpoints.map((e) => e.path))

      for (const route of expected) {
        if (!actual.has(route)) {
          mismatches.push(`${dir}: server is missing canonical route "${route}"`)
        }
      }
      for (const route of actual) {
        if (!expected.has(route)) {
          mismatches.push(`${dir}: server exposes non-canonical route "${route}"`)
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('exposes the calendar event create under its operation name, not its command key', async () => {
    const calendar = apps.find((a) => a.dir === 'calendar')
    if (!calendar) throw new Error('calendar manifest not found')

    const app = createApp([calendar.manifest], { cors: false, executor: createRecordingExecutor() })
    const res = await app.request('/api/v1/introspect')
    const body = (await res.json()) as IntrospectBody
    const paths = body.endpoints.map((e) => e.path)

    // The command key is `createEvent`; its routeName publishes `create`.
    expect(paths).toContain('/rpc/calendar.events.create')
    expect(paths).not.toContain('/rpc/calendar.events.createEvent')
  })
})

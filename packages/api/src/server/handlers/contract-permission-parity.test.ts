/**
 * Permission parity between the canonical routes and the HTTP router.
 *
 * Generated app contracts take each operation's id and permission from
 * `resolveManifestRoutes` (`@macts/core`). The HTTP router derives the same
 * two facts itself: once to guard each route (`requirePermission`) and once
 * for introspection. This suite asserts, for every manifest in the
 * repository, that all three agree on the exact set of operation ids and on
 * each operation's permission, so a contract descriptor never states a
 * permission the server does not enforce.
 *
 * The router is exercised through its public surface. The permission
 * middleware is replaced by a probe that answers with the permission it was
 * constructed for, so posting to a route reports the guard's permission
 * before any later middleware or handler runs; `GET /introspect` reports the
 * listed permissions. The suite asserts that the app runner is never called
 * and that every route the router registers was exercised. Both mocks are
 * module mocks of this test file only (vitest isolates each test file).
 *
 * @see ../../../../core/src/manifest/route.ts
 * @see ./rpc.ts
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MiddlewareHandler } from 'hono'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadManifest, resolveManifestRoutes, type AppManifest } from '@macts/core'
import { createRpcRouter } from './rpc.js'

const probe = vi.hoisted(() => ({
  /** The path of every request the permission probe answered. */
  answered: [] as string[],
  /**
   * Stands in for the app runner, the only way the RPC handlers run a
   * command. It must never be reached, and throws if it is.
   */
  runWithApp: vi.fn(() => {
    throw new Error('the permission probe let a request through to execution')
  }),
}))

vi.mock('@macts/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@macts/core')>()),
  runWithApp: probe.runWithApp,
}))

vi.mock('../middleware/permission.js', () => ({
  requirePermission:
    (permission: string): MiddlewareHandler =>
    (c) => {
      probe.answered.push(c.req.path)
      return Promise.resolve(c.json({ permission }))
    },
}))

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

interface LoadedApp {
  readonly dir: string
  readonly manifest: AppManifest
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

/** The operation id of an RPC path: the path without its `/rpc/` prefix. */
function routeId(path: string): string {
  return path.replace(/^\/rpc\//, '')
}

/** Whether a body is exactly the probe's answer, `{permission}`, and nothing else. */
function isProbeAnswer(body: unknown): body is { permission: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    Object.keys(body).length === 1 &&
    'permission' in body &&
    typeof body.permission === 'string'
  )
}

function isIntrospectBody(
  body: unknown
): body is { endpoints: { path: string; permission: string }[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'endpoints' in body &&
    Array.isArray(body.endpoints)
  )
}

/** What probing one manifest's router found. */
interface RouterProbe {
  /** Operation id to the permission the guard of its route requires. */
  readonly guarded: Map<string, string>
  /** Operation id to the permission introspection lists. */
  readonly listed: Map<string, string>
  /** Every `METHOD path` the router registers. */
  readonly registered: ReadonlySet<string>
  /** Every `METHOD path` this probe requested. */
  readonly exercised: ReadonlySet<string>
  /**
   * Every RPC route whose request was not answered by the permission probe
   * alone: another status or body, or a call to the app runner.
   */
  readonly fellThrough: readonly string[]
}

/**
 * Request every route one manifest's router registers: each RPC route, whose
 * guard answers with its permission, and introspection. A route of any other
 * kind is left unexercised, which the suite reports.
 */
async function probeRouter(manifest: AppManifest): Promise<RouterProbe> {
  const router = createRpcRouter(manifest)
  // Hono lists one entry per handler, so a route with middleware repeats.
  const registered = new Set(router.routes.map((route) => `${route.method} ${route.path}`))
  const exercised = new Set<string>()
  const guarded = new Map<string, string>()
  const listed = new Map<string, string>()
  const fellThrough: string[] = []
  for (const route of registered) {
    const [method = '', path = ''] = route.split(' ')
    if (method === 'POST' && path.startsWith('/rpc/')) {
      const answered = probe.answered.length
      const response = await router.request(path, { method: 'POST' })
      const body: unknown = await response.json()
      exercised.add(route)
      if (
        response.status !== 200 ||
        !isProbeAnswer(body) ||
        probe.answered.length !== answered + 1 ||
        probe.answered.at(-1) !== path ||
        probe.runWithApp.mock.calls.length !== 0
      ) {
        fellThrough.push(`${path}: ${String(response.status)} ${JSON.stringify(body)}`)
        continue
      }
      guarded.set(routeId(path), body.permission)
    } else if (method === 'GET' && path === '/introspect') {
      const body: unknown = await (await router.request(path)).json()
      if (!isIntrospectBody(body)) throw new Error('introspection returned no endpoints')
      for (const endpoint of body.endpoints) listed.set(routeId(endpoint.path), endpoint.permission)
      exercised.add(route)
    }
  }
  return { guarded, listed, registered, exercised, fellThrough }
}

/** Every disagreement between the canonical operations and one router derivation. */
function mismatches(
  dir: string,
  label: string,
  canonical: ReadonlyMap<string, string>,
  http: ReadonlyMap<string, string>
): string[] {
  const found: string[] = []
  for (const [id, permission] of canonical) {
    const other = http.get(id)
    if (other === undefined) {
      found.push(`${dir}: the ${label} has no operation "${id}"`)
    } else if (other !== permission) {
      found.push(
        `${dir}: "${id}" requires "${permission}" in the contract but "${other}" in the ${label}`
      )
    }
  }
  for (const id of http.keys()) {
    if (!canonical.has(id))
      found.push(`${dir}: the ${label} exposes "${id}", which no route declares`)
  }
  return found
}

describe('generated contract permissions match the HTTP router', () => {
  it('discovers every repository manifest', () => {
    expect(apps.length).toBeGreaterThan(30)
  })

  it('agrees on the operations and each permission, for every manifest', async () => {
    const found: string[] = []
    let compared = 0
    let guardRequests = 0
    probe.answered.length = 0
    probe.runWithApp.mockClear()

    for (const { dir, manifest } of apps) {
      const canonical = new Map(
        resolveManifestRoutes(manifest).map((route) => [route.route, route.permission])
      )
      compared += canonical.size
      const router = await probeRouter(manifest)
      guardRequests += router.guarded.size
      for (const route of router.registered) {
        if (!router.exercised.has(route)) found.push(`${dir}: the route ${route} was not exercised`)
      }
      for (const route of router.fellThrough) {
        found.push(`${dir}: the permission probe did not answer ${route} by itself`)
      }
      found.push(
        ...mismatches(dir, 'route guard', canonical, router.guarded),
        ...mismatches(dir, 'introspection', canonical, router.listed)
      )
    }

    expect(found).toEqual([])
    // Guards against a vacuous pass: hundreds of operations were compared.
    expect(compared).toBeGreaterThan(400)
    // The probe answered every guarded request, so nothing after the guard ran,
    // and nothing reached the app runner.
    expect(probe.answered).toHaveLength(guardRequests)
    expect(probe.runWithApp).not.toHaveBeenCalled()
  })

  it('detects a permission the router does not enforce', () => {
    // The comparison itself must catch a disagreement, a missing operation,
    // and an extra one, or the parity assertion above proves nothing.
    expect(
      mismatches(
        'app',
        'route guard',
        new Map([
          ['app.notes.get', 'app:notes:get'],
          ['app.notes.list', 'app:notes:list'],
        ]),
        new Map([
          ['app.notes.get', 'app:notes:read'],
          ['app.notes.delete', 'app:notes:delete'],
        ])
      )
    ).toEqual([
      'app: "app.notes.get" requires "app:notes:get" in the contract but "app:notes:read" in the route guard',
      'app: the route guard has no operation "app.notes.list"',
      'app: the route guard exposes "app.notes.delete", which no route declares',
    ])
  })
})

/**
 * Permission parity between the HTTP router and the shared runtime.
 *
 * The permission an operation requires is derived in two places: the RPC
 * router (`getCommandEndpoints`, which guards each route, and `getAllEndpoints`,
 * which introspection lists) and the runtime's operation registry
 * (`operationsFromManifest`). Until a single derivation backs both, this suite
 * asserts, for every manifest in the repository, that the three agree on the
 * exact set of operations and on each operation's permission. That way HTTP and
 * the runtime cannot enforce different permissions for the same operation.
 *
 * @see ../../../../core/src/manifest/route.ts
 * @see ../../../../runtime/src/operations/registry.ts
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest, type AppManifest } from '@macts/core'
import { operationsFromManifest } from '@macts/runtime'
import { getAllEndpoints, getCommandEndpoints } from './rpc.js'

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

/** Operation id (the route without its `/rpc/` prefix) to permission. */
function byId(entries: readonly { readonly id: string; readonly permission: string }[]) {
  return new Map(entries.map((entry) => [entry.id, entry.permission]))
}

function routeId(path: string): string {
  return path.replace(/^\/rpc\//, '')
}

describe('HTTP router and runtime registry derive identical permissions', () => {
  it('discovers every repository manifest', () => {
    expect(apps.length).toBeGreaterThan(30)
  })

  it('agrees per operation for every manifest', () => {
    const mismatches: string[] = []
    let compared = 0

    for (const { dir, manifest } of apps) {
      const runtime = byId(
        operationsFromManifest(manifest).map(({ descriptor }) => ({
          id: descriptor.id,
          permission: descriptor.permission,
        }))
      )
      const guarded = byId(
        Object.entries(manifest.commands).flatMap(([key, command]) =>
          getCommandEndpoints(key, command, manifest).map((endpoint) => ({
            id: routeId(endpoint.path),
            permission: endpoint.permission,
          }))
        )
      )
      const listed = byId(
        getAllEndpoints(manifest).map((endpoint) => ({
          id: routeId(endpoint.path),
          permission: endpoint.permission,
        }))
      )

      compared += runtime.size
      for (const [label, http] of [
        ['route guard', guarded],
        ['introspection', listed],
      ] as const) {
        for (const [id, permission] of runtime) {
          const other = http.get(id)
          if (other === undefined) {
            mismatches.push(`${dir}: ${label} has no operation "${id}"`)
          } else if (other !== permission) {
            mismatches.push(
              `${dir}: "${id}" requires "${permission}" in the runtime but "${other}" in the ${label}`
            )
          }
        }
        for (const id of http.keys()) {
          if (!runtime.has(id)) {
            mismatches.push(`${dir}: ${label} exposes "${id}", which the runtime does not register`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
    // Guards against a vacuous pass: hundreds of operations were compared.
    expect(compared).toBeGreaterThan(400)
  })
})

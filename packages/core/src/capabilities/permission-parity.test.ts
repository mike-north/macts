/**
 * Capability permissions match the permissions the server enforces, for every
 * shipped manifest.
 *
 * Discovery (the capability registry and each generated `capabilities.ts`)
 * tells a caller which permission an operation needs. The HTTP router and the
 * runtime operation registry enforce `ManifestRoute.permission` from
 * `resolveManifestRoutes`: the command's explicit `permission`, else the one
 * derived from its route. `packages/api/src/server/handlers/contract-permission-parity.test.ts`
 * proves the router's guards equal those route permissions, so this suite
 * closes the loop by proving every capability reports the same permission as
 * its route. A capability that reports less than the server enforces leads an
 * agent planning a grant from discovery to ask for too little.
 *
 * A capability carries no route string, so the suite joins each route to its
 * capability by what both identify: the resource (`app` for application
 * commands) and the operation name. It checks the join is one to one, over the
 * routes of operations that can be called: an operation whose required input
 * admits no value has no capability (see `../generator/input-satisfiability.ts`).
 *
 * @see ../manifest/route.ts
 * @see https://github.com/mike-north/macts/issues/148
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { generateCapabilitiesModule } from '../generator/capabilities/index.js'
import { loadManifest } from '../manifest/loader.js'
import { normalizeResourceRouteSegment, resolveManifestRoutes } from '../manifest/route.js'
import type { ManifestRoute } from '../manifest/route.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { deriveCapabilities } from './registry.js'
import { isOperationAvailable } from '../generator/input-satisfiability.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

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

/** The routes of a manifest's operations that can be called, which discovery lists. */
function availableRoutes(manifest: AppManifest): ManifestRoute[] {
  return resolveManifestRoutes(manifest).filter((route) =>
    isOperationAvailable(manifest, route.command, route.resourceType)
  )
}

/** The fields of one capability this suite compares, from either source. */
interface CapabilityPermission {
  readonly name: string
  readonly resource: string
  readonly operation: string
  readonly permission: string | null | undefined
}

/**
 * The capability join key of a route: its resource segment (`app` for an
 * application command) and its operation name.
 */
function routeJoinKey(route: ManifestRoute): string {
  const scope =
    route.resource === undefined ? 'app' : normalizeResourceRouteSegment(route.resource.plural)
  return `${scope}.${route.command.name}`
}

function isCapabilityPermission(value: unknown): value is CapabilityPermission {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'resource' in value &&
    typeof value.resource === 'string' &&
    'operation' in value &&
    typeof value.operation === 'string' &&
    'permission' in value &&
    (value.permission === null || typeof value.permission === 'string')
  )
}

/** The capability entries embedded in a generated `capabilities.ts` module. */
function generatedCapabilities(manifest: AppManifest): CapabilityPermission[] {
  const source = generateCapabilitiesModule(manifest)
  const marker = 'export const capabilities: readonly CapabilityMetadata[] = '
  const start = source.indexOf(marker)
  if (start < 0) throw new Error('the generated module has no capabilities literal')
  const literal = source
    .slice(start + marker.length)
    .trim()
    .replace(/;$/, '')
  const data: unknown = JSON.parse(literal)
  if (!Array.isArray(data) || !data.every(isCapabilityPermission)) {
    throw new Error('the generated capabilities literal has an unexpected shape')
  }
  return data
}

/**
 * Every disagreement between one manifest's routes and one capability source:
 * a route with no capability or more than one, a capability with no route, and
 * a capability whose permission differs from its route's.
 */
function permissionMismatches(
  dir: string,
  label: string,
  routes: readonly ManifestRoute[],
  capabilities: readonly CapabilityPermission[]
): string[] {
  const found: string[] = []
  const byKey = new Map<string, CapabilityPermission[]>()
  for (const capability of capabilities) {
    const key = `${capability.resource}.${capability.operation}`
    byKey.set(key, [...(byKey.get(key) ?? []), capability])
  }
  /** The join keys some route declares. */
  const joined = new Set<string>()
  for (const route of routes) {
    const key = routeJoinKey(route)
    joined.add(key)
    const matches = byKey.get(key) ?? []
    if (matches.length !== 1) {
      found.push(`${dir}: ${route.route} has ${String(matches.length)} ${label} entries`)
      continue
    }
    const [capability] = matches
    if (capability?.permission !== route.permission) {
      found.push(
        `${dir}: ${route.route} requires "${route.permission}" but the ${label} reports ${JSON.stringify(
          capability?.permission ?? null
        )}`
      )
    }
  }
  for (const key of byKey.keys()) {
    if (!joined.has(key)) found.push(`${dir}: the ${label} lists "${key}", which no route declares`)
  }
  return found
}

describe('capability permissions match the enforced route permissions', () => {
  it('discovers the shipped manifests', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(manifests.length).toBeGreaterThan(30)
  })

  it('reports each route permission in the capability registry, for every manifest', () => {
    const found: string[] = []
    let compared = 0
    for (const { dir, manifest } of manifests) {
      const routes = availableRoutes(manifest)
      compared += routes.length
      found.push(...permissionMismatches(dir, 'registry', routes, deriveCapabilities(manifest)))
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass: the manifests expose hundreds of routes.
    expect(compared).toBeGreaterThan(400)
  })

  it('embeds each route permission in the generated capabilities module, for every manifest', () => {
    const found: string[] = []
    let compared = 0
    for (const { dir, manifest } of manifests) {
      const routes = availableRoutes(manifest)
      compared += routes.length
      found.push(
        ...permissionMismatches(dir, 'generated module', routes, generatedCapabilities(manifest))
      )
    }
    expect(found).toEqual([])
    expect(compared).toBeGreaterThan(400)
  })

  it('detects a missing, extra, duplicated, or differing capability', () => {
    // The comparison must catch each kind of disagreement, or the parity
    // assertions above prove nothing.
    const notes = manifests.find((entry) => entry.dir === 'notes')?.manifest
    if (notes === undefined) throw new Error('the Notes manifest is missing')
    const route = (id: string): ManifestRoute => {
      const found = resolveManifestRoutes(notes).find((candidate) => candidate.route === id)
      if (found === undefined) throw new Error(`Notes has no route ${id}`)
      return found
    }
    const attachmentsGet = route('notes.attachments.get')
    const accountsList = route('notes.accounts.list')
    expect(
      permissionMismatches(
        'notes',
        'registry',
        [attachmentsGet, accountsList],
        [
          {
            name: 'notes.attachments.get',
            resource: 'attachments',
            operation: 'get',
            permission: null,
          },
          {
            name: 'notes.notes.frobnicate',
            resource: 'notes',
            operation: 'frobnicate',
            permission: 'x',
          },
        ]
      )
    ).toEqual([
      'notes: notes.attachments.get requires "notes:attachments:get" but the registry reports null',
      'notes: notes.accounts.list has 0 registry entries',
      'notes: the registry lists "notes.frobnicate", which no route declares',
    ])
    expect(
      permissionMismatches(
        'notes',
        'registry',
        [accountsList],
        [
          { name: 'a', resource: 'accounts', operation: 'list', permission: 'notes:accounts:list' },
          { name: 'b', resource: 'accounts', operation: 'list', permission: 'notes:accounts:list' },
        ]
      )
    ).toEqual(['notes: notes.accounts.list has 2 registry entries'])
  })
})

describe('capability permissions of shipped operations (issue #148 regression)', () => {
  /** The registry capability with this name in the shipped manifest of `dir`. */
  function shippedCapability(dir: string, name: string): CapabilityPermission | undefined {
    const manifest = manifests.find((entry) => entry.dir === dir)?.manifest
    if (manifest === undefined) throw new Error(`the ${dir} manifest is missing`)
    return deriveCapabilities(manifest).find((capability) => capability.name === name)
  }

  it('reports notes:attachments:get for notes.attachments.get, which declares no permission', () => {
    // Before the fix, discovery reported no permission here while the router
    // required `notes:attachments:get` (app : resource plural : route name).
    expect(shippedCapability('notes', 'notes.attachments.get')?.permission).toBe(
      'notes:attachments:get'
    )
  })

  it('reports notes:accounts:list for notes.accounts.list, which declares no permission', () => {
    expect(shippedCapability('notes', 'notes.accounts.list')?.permission).toBe(
      'notes:accounts:list'
    )
  })

  it('reports microsoft-edge:tabs:get for microsoft-edge.tabs.get, under the route app segment', () => {
    // Microsoft Edge used to declare `edge:tabs:get`, an app segment no route
    // has (issue #166). It now declares no permission, so the capability
    // reports the derived one: app segment `microsoft-edge` (from the app name
    // "Microsoft Edge"), resource `tabs`, route name `get`.
    expect(shippedCapability('microsoft-edge', 'microsoft-edge.tabs.get')?.permission).toBe(
      'microsoft-edge:tabs:get'
    )
  })

  it('keeps an explicitly declared permission that differs from the derived one', () => {
    // Microsoft Word's saveAs declares `microsoft-word:documents:save`, so
    // one grant covers save and save-as; the derived default would be
    // `microsoft-word:documents:saveAs`. The explicit declaration wins, under
    // the same app segment as the route.
    expect(shippedCapability('microsoft-word', 'microsoft-word.documents.saveAs')?.permission).toBe(
      'microsoft-word:documents:save'
    )
  })

  it('reports a permission for every capability of every shipped manifest', () => {
    // No resolved route requires no permission, so no capability reports none.
    const without = manifests.flatMap(({ manifest }) =>
      deriveCapabilities(manifest)
        .filter((capability) => capability.permission === undefined)
        .map((capability) => capability.name)
    )
    expect(without).toEqual([])
  })
})

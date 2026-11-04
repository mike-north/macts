/**
 * Integration: every shipped contract's resource table names, for each route
 * that resolves references to a resource, the parent that route's command
 * finds the resource's objects within, and that parent can stand as the
 * container a reference resolved through the route needs.
 *
 * A route records a parent when the manifest command behind the `get` or
 * `list` its table entry records has a `parent` (D10, command parents). The
 * entry's `parents` must then name the same resource under the same route,
 * and that parent must be in the table with a `get` and an identifier, since
 * the container is an identity reference resolved through that `get`
 * (phases/13 D7, "Parent-scoped targets"). An entry whose routes record no
 * parent has no `parents`.
 *
 * Each contract is read at its app package's `/contract` subpath, and each
 * manifest from `manifests/<app>/app.yaml`; the parent is read from the
 * manifest command independently of the generator. The parents are pinned by
 * hand, per route, so a route gaining or losing a parent is reviewed.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  BOTH_ROUTE_PINS as both,
  LIST_ONLY_PINS as listOnly,
  type Pin,
} from '../src/parent-scoped-pins.js'
import { APP_NAMES, loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

const ROUTES = ['get', 'list'] as const

/** The parent the manifest records on the command behind a resource's recorded `route`. */
function manifestParent(
  { manifest, contract }: RealApp,
  resource: string,
  route: (typeof ROUTES)[number]
): string | undefined {
  const id = contract.resources[resource]?.[route]
  if (id === undefined) return undefined
  const operation = contract.operations[id]
  if (operation === undefined) throw new Error(`${contract.app}: ${id} is not an operation`)
  return manifest.commands[operation.target.command]?.parent?.resource
}

/** Every `[app, resource, route, parent]` the tables record. */
function tableParents(): [RealApp, string, (typeof ROUTES)[number], string][] {
  return apps.flatMap((app) =>
    Object.entries(app.contract.resources).flatMap(([resource, { parents }]) =>
      ROUTES.flatMap((route): [RealApp, string, (typeof ROUTES)[number], string][] => {
        const parent = parents?.[route]
        return parent === undefined ? [] : [[app, resource, route, parent]]
      })
    )
  )
}

describe('the parents of resolving routes in every real contract', () => {
  it('loads every app', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(apps.length).toBe(APP_NAMES.length)
    expect(apps.length).toBeGreaterThan(30)
  })

  it('name in the table, per route, exactly the parent its command records', () => {
    const mismatched: string[] = []
    for (const app of apps) {
      for (const [resource, { parents }] of Object.entries(app.contract.resources)) {
        // An empty `parents` is never emitted: absent means neither route records one.
        if (parents !== undefined && Object.keys(parents).length === 0) {
          mismatched.push(`${app.name} ${resource}: empty parents`)
        }
        for (const route of ROUTES) {
          const expected = manifestParent(app, resource, route)
          const recorded = parents?.[route]
          if (recorded !== expected) {
            mismatched.push(
              `${app.name} ${resource} ${route}: table ${String(recorded)}, command ${String(expected)}`
            )
          }
        }
      }
    }
    expect(mismatched).toEqual([])
  })

  it('name only parents a reference can name by identifier and resolve', () => {
    const unusable = tableParents().flatMap(([app, resource, route, parent]) => {
      const entry = app.contract.resources[parent]
      return entry?.get === undefined || entry.id === undefined
        ? [`${app.name} ${resource} ${route} → ${parent}`]
        : []
    })
    expect(unusable).toEqual([])
  })

  it('are exactly the hand-audited parents, by route', () => {
    // Pinned in ../src/parent-scoped-pins.ts.
    const found = tableParents().map(
      ([app, resource, route, parent]) => `${app.name} ${resource} ${route} → ${parent}`
    )
    expect(both.length + listOnly.length).toBe(20)
    const byRoute = ([app, resource, parent]: Pin, routes: readonly string[]) =>
      routes.map((route) => `${app} ${resource} ${route} → ${parent}`)
    expect(found.sort()).toEqual(
      [
        ...both.flatMap((pin) => byRoute(pin, ROUTES)),
        ...listOnly.flatMap((pin) => byRoute(pin, ['list'])),
      ].sort()
    )
  })
})

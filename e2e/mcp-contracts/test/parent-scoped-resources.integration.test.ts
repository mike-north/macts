/**
 * Integration: every shipped contract's resource table names the parent of
 * each resource the app finds only within another, and that parent can stand
 * as the container a reference to it needs.
 *
 * A resource is parent-scoped when the manifest command behind the `get` its
 * table entry records has a `parent` (D10, command parents). Its entry must
 * then name the same `parent`, and that parent must be in the table with a
 * `get` and an identifier, since the container is an identity reference
 * resolved through that `get` (phases/13 D7, "Resolvable targets"). An entry
 * of a resource found at the application names none.
 *
 * Each contract is read at its app package's `/contract` subpath, and each
 * manifest from `manifests/<app>/app.yaml`; the parent is read from the
 * manifest command independently of the generator. The parent-scoped
 * resources are pinned by hand, so a resource gaining or losing a parent is
 * reviewed.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { APP_NAMES, loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

/** The parent the manifest records on the command behind a resource's recorded `get`. */
function manifestParent({ manifest, contract }: RealApp, resource: string): string | undefined {
  const get = contract.resources[resource]?.get
  if (get === undefined) return undefined
  const operation = contract.operations[get]
  if (operation === undefined) throw new Error(`${contract.app}: ${get} is not an operation`)
  return manifest.commands[operation.target.command]?.parent?.resource
}

describe('parent-scoped resources in every real contract', () => {
  it('loads every app', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(apps.length).toBe(APP_NAMES.length)
    expect(apps.length).toBeGreaterThan(30)
  })

  it('name in the table exactly the parent the get records', () => {
    const mismatched: string[] = []
    for (const app of apps) {
      for (const [resource, descriptor] of Object.entries(app.contract.resources)) {
        const expected = manifestParent(app, resource)
        if (descriptor.parent !== expected) {
          mismatched.push(
            `${app.name} ${resource}: table ${String(descriptor.parent)}, get ${String(expected)}`
          )
        }
      }
    }
    expect(mismatched).toEqual([])
  })

  it('name only parents a reference can name by identifier and resolve', () => {
    const unusable: string[] = []
    for (const app of apps) {
      for (const [resource, { parent }] of Object.entries(app.contract.resources)) {
        if (parent === undefined) continue
        const entry = app.contract.resources[parent]
        if (entry?.get === undefined || entry.id === undefined) {
          unusable.push(`${app.name} ${resource} → ${parent}`)
        }
      }
    }
    expect(unusable).toEqual([])
  })

  it('are exactly the hand-audited parent-scoped resources', () => {
    // Audited by hand against the manifests: each resource's get command
    // records the parent (calendar `getEvent`; contacts `getAddress`,
    // `getEmail` and `getPhone`; music `getTrack`).
    const found = apps.flatMap((app) =>
      Object.entries(app.contract.resources).flatMap(([resource, { parent }]) =>
        parent === undefined ? [] : [`${app.name} ${resource} → ${parent}`]
      )
    )
    expect(found.sort()).toEqual(
      [
        'calendar Event → Calendar',
        'contacts Address → Person',
        'contacts Email → Person',
        'contacts Phone → Person',
        'music Track → Playlist',
      ].sort()
    )
  })
})

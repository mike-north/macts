/**
 * Integration: no shipped contract declares an output position holding a
 * reference macts cannot yet resolve. This is an interim truth guard; the
 * positions it keeps out are coverage gaps (#219), recorded in the coverage
 * ledger in `packages/core/src/generator/contract/index.test.ts`.
 *
 * Each app package's generated contract is read at its `/contract` subpath,
 * and its manifest from `manifests/<app>/app.yaml`. Every reference in every
 * resource record and every operation's output plan, at any depth (record
 * fields, array items, nullable values), must name a resource that a
 * reference read from the app can be resolved to (phases/13 D7, "Resolvable
 * targets", "Container scoping", "Name-keyed resources"):
 *
 * - its descriptor records a `get` operation;
 * - that operation's manifest command records no parent, since references
 *   read from the app do not carry their container yet (#242);
 * - and it is not identified by a name its primary identifier does not claim
 *   unique, since such a reference does not pin the object the app returned.
 *
 * The output positions that remain are pinned by hand, so a field returning
 * to output is reviewed. The positions the generator leaves out are the
 * coverage ledger in `packages/core/src/generator/contract/index.test.ts`
 * ("real app manifests").
 *
 * Only the records a contract carries at run time can be walked: those of
 * its resource table, which lists only resources with a get or a list, and
 * those its operations return. A resource with neither, such as Music's
 * browser and playlist windows, Photos' Container or Xcode's Target, has a
 * record type but no record value, and no operation returns it, so no caller
 * receives a reference from one.
 *
 * A failure means a regenerated contract is stale or the generator's output
 * rule regressed.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md §D7
 * @see https://github.com/mike-north/macts/issues/219
 */

import { resolveIdentifierTargeting, type AppManifest, type Identifier } from '@macts/core'
import type { ValuePlan } from '@macts/contracts'
import { beforeAll, describe, expect, it } from 'vitest'
import { APP_NAMES, loadRealApps, type RealApp } from '../src/real-contracts.js'

let apps: RealApp[] = []

beforeAll(async () => {
  apps = await loadRealApps()
})

/** A resource's primary identifier entry: the one flagged primary, else the first. */
function primaryIdentifier(manifest: AppManifest, resource: string): Identifier | undefined {
  const identifiers = manifest.resources[resource]?.identifiers ?? []
  return identifiers.find((entry) => entry.primary) ?? identifiers[0]
}

/** What macts does not provide yet for a reference to `resource` read from the app, if anything. */
function problem({ manifest, contract }: RealApp, resource: string): string | undefined {
  const descriptor = contract.resources[resource]
  if (descriptor?.get === undefined) return 'no get'
  const get = contract.operations[descriptor.get]
  if (get === undefined) return `get ${descriptor.get} is not an operation`
  if (manifest.commands[get.target.command]?.parent !== undefined) return 'parent-scoped get'
  if (
    resolveIdentifierTargeting(manifest.resources[resource])?.property === 'name' &&
    primaryIdentifier(manifest, resource)?.unique !== true
  ) {
    return 'name not claimed unique'
  }
  return undefined
}

/** The resource keys of every reference a plan holds, at any depth. */
function referencedResources(plan: ValuePlan): string[] {
  switch (plan.kind) {
    case 'reference':
      return [plan.resource]
    case 'array':
      return referencedResources(plan.items)
    case 'nullable':
      return referencedResources(plan.value)
    case 'record':
      return Object.values(plan.fields).flatMap((field) => referencedResources(field.value))
    default:
      return []
  }
}

describe('output references in every real contract', () => {
  it('loads every app', () => {
    // Guards against a vacuous pass if the manifests directory moves.
    expect(apps.length).toBe(APP_NAMES.length)
    expect(apps.length).toBeGreaterThan(30)
  })

  it('declare resource-table record fields only to resources a reference read from the app can use', () => {
    const found: string[] = []
    const positions: string[] = []
    for (const app of apps) {
      for (const [resource, descriptor] of Object.entries(app.contract.resources)) {
        const plan = descriptor.record.plan
        if (plan.kind !== 'record') throw new Error(`${app.name}: ${resource} has no record`)
        for (const [field, { value }] of Object.entries(plan.fields)) {
          for (const target of referencedResources(value)) {
            positions.push(`${app.name} ${resource}.${field} → ${target}`)
            const why = problem(app, target)
            if (why !== undefined)
              found.push(`${app.name} ${resource}.${field} → ${target}: ${why}`)
          }
        }
      }
    }
    expect(found).toEqual([])
    // Every field of a resource-table record that still holds a reference,
    // audited by hand against the manifests: each target has a get with no
    // parent, and none is identified by its name. Music BrowserWindow and
    // PlaylistWindow `view`, Photos Container `parent` and Xcode Target
    // `project` also stay in output, but their resources have neither a get
    // nor a list, so the table carries no record for them.
    expect(positions.sort()).toEqual(
      [
        'photos Album.parent → Folder',
        'photos Folder.parent → Folder',
        'xcode WorkspaceDocument.activeScheme → Scheme',
      ].sort()
    )
  })

  it('return only references a caller can use', () => {
    const found: string[] = []
    const checked = new Set<string>()
    for (const app of apps) {
      for (const operation of Object.values(app.contract.operations)) {
        for (const resource of referencedResources(operation.output.plan)) {
          checked.add(`${operation.id} → ${resource}`)
          const why = problem(app, resource)
          if (why !== undefined) found.push(`${app.name}: ${operation.id} → ${resource}: ${why}`)
        }
      }
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass: the references above, each on a record
    // that some operation returns.
    expect([...checked].sort()).toEqual(
      [
        'photos.albums.get → Folder',
        'photos.albums.list → Folder',
        'photos.folders.get → Folder',
        'photos.folders.list → Folder',
        'xcode.workspaceDocuments.get → Scheme',
        'xcode.workspaceDocuments.list → Scheme',
      ].sort()
    )
  })
})

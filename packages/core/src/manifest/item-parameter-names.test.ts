/**
 * Shipped-manifest guard: every resource command selects its item by the
 * parameter its resource's get selects it by.
 *
 * A command's item parameter is chosen by position: its first required
 * parameter other than its parent's (`itemIdentifierParameter`). A command
 * other than a get, update or delete also declares the dictionary's own
 * parameters, so a manifest that lists one of those first would select the
 * item by it. Music's `move`, whose dictionary parameter `to` is required,
 * would look the playlist up by the new location, and never send it. The
 * shipped manifests are right because they list the identifier first; this
 * test pins it. Wherever a resource has a get, every other command that acts
 * on one of its items must name its item parameter as the get does.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D5
 * @see https://github.com/mike-north/macts/issues/287
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { itemIdentifierParameter, selectsOneItem } from './item-selection.js'
import { loadManifest } from './loader.js'
import { resolveManifestRoutes } from './route.js'
import type { AppManifest } from './schemas/app.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

let manifests: AppManifest[] = []
beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')))
  )
})

/** The shipped manifest of the app with `bundleId`. */
function shipped(bundleId: string): AppManifest {
  const found = manifests.find((manifest) => manifest.app.bundleId === bundleId)
  if (found === undefined) throw new Error(`no shipped manifest for ${bundleId}`)
  return found
}

/** One routed command that selects an item of a resource that has a get. */
interface ItemCommandAgainstGet {
  /** `<app>: <command key> on <resource>`, for failure messages. */
  readonly label: string
  /** The command's item parameter name. */
  readonly item: string
  /** The item parameter names of the resource's gets, in declaration order. */
  readonly get: readonly string[]
}

/**
 * Every routed resource command of `manifest` that acts on one item of a
 * resource with a resource-scoped get, gets included, paired with the item
 * parameter names of that resource's gets. A command that declares no item
 * parameter (a known gap) has none to compare and is skipped.
 */
function itemCommandsAgainstGets(manifest: AppManifest): ItemCommandAgainstGet[] {
  const routes = resolveManifestRoutes(manifest)
  const getsByResource = new Map<string, string[]>()
  for (const { command, resourceType } of routes) {
    if (resourceType === undefined || command.scope !== 'resource' || command.name !== 'get') {
      continue
    }
    const name = itemIdentifierParameter(command)?.name
    if (name === undefined) continue
    getsByResource.set(resourceType, [...(getsByResource.get(resourceType) ?? []), name])
  }
  const seen = new Set<string>()
  const result: ItemCommandAgainstGet[] = []
  for (const { commandKey, command, resourceType } of routes) {
    if (resourceType === undefined || command.scope !== 'resource') continue
    if (!selectsOneItem(command)) continue
    const get = getsByResource.get(resourceType)
    const item = itemIdentifierParameter(command)?.name
    const label = `${manifest.app.name}: ${commandKey} on ${resourceType}`
    if (get === undefined || item === undefined || seen.has(label)) continue
    seen.add(label)
    result.push({ label, item, get })
  }
  return result
}

/** The commands of `manifest` whose item parameter is not named as their resource's get's. */
function itemParameterMismatches(manifest: AppManifest): string[] {
  return itemCommandsAgainstGets(manifest)
    .filter(({ item, get }) => !get.includes(item))
    .map(
      ({ label, item, get }) => `${label}: selects by "${item}", its get by "${get.join('", "')}"`
    )
}

describe('the shipped resource commands', () => {
  it('select their item by the parameter their resource get selects it by', () => {
    expect(manifests.flatMap(itemParameterMismatches)).toEqual([])
  })

  // The guard is not vacuous: it checks the non-CRUD commands the item rule
  // was written for, each against its resource's get.
  it.each([
    ['com.apple.Music', 'Music: move on Playlist'],
    ['com.apple.dt.Xcode', 'Xcode: build on WorkspaceDocument'],
    ['com.apple.Notes', 'Notes: show on Note'],
  ])('checks %s %s', (bundleId, label) => {
    const checked = itemCommandsAgainstGets(shipped(bundleId)).map((entry) => entry.label)
    expect(checked).toContain(label)
  })

  // A manifest that lists a dictionary parameter before the identifier selects
  // the item by it. Here Music's `move` would look the playlist up by `to`.
  it('fail when a command lists a dictionary parameter before its identifier', () => {
    const music = shipped('com.apple.Music')
    const move = music.commands.move
    if (move === undefined) throw new Error('Music declares no move')
    const reordered: AppManifest = {
      ...music,
      commands: {
        ...music.commands,
        move: { ...move, parameters: [...move.parameters].reverse() },
      },
    }
    expect(itemParameterMismatches(reordered)).toEqual([
      'Music: move on Playlist: selects by "to", its get by "persistentID"',
    ])
  })
})

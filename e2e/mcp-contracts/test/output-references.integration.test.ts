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
 * - that operation's manifest command records no parent, or the position is
 *   a field of that parent's own record and the parent is a valid container:
 *   a reference read from the app carries, as its container, the record it
 *   was read through, so only there does it carry the container its get
 *   needs. A valid container is itself such a target, with no parent of its
 *   own;
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

/**
 * What macts does not provide yet for a reference to `resource` read from the
 * app, if anything, at a field of `source`'s record, or at an operation's
 * result when `source` is absent.
 */
function problem(app: RealApp, resource: string, source?: string): string | undefined {
  const { manifest, contract } = app
  const descriptor = contract.resources[resource]
  if (descriptor?.get === undefined) return 'no get'
  const get = contract.operations[descriptor.get]
  if (get === undefined) return `get ${descriptor.get} is not an operation`
  const parent = manifest.commands[get.target.command]?.parent?.resource
  if (parent !== undefined) {
    if (parent !== source) return 'parent-scoped get, not read through its parent'
    const why = problem(app, parent)
    if (why !== undefined) return `parent-scoped get, within a parent that is no container: ${why}`
  }
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

/**
 * The references an operation's output plan holds, each with the resource
 * whose record holds it: inside a record, the operation's own resource,
 * whose record a get, list, create or update returns (a list's page holds
 * those records); bare in the result, none.
 */
function outputReferences(
  plan: ValuePlan,
  record: string | undefined,
  inRecord = false
): { readonly target: string; readonly source: string | undefined }[] {
  switch (plan.kind) {
    case 'reference':
      return [{ target: plan.resource, source: inRecord ? record : undefined }]
    case 'array':
      return outputReferences(plan.items, record, inRecord)
    case 'nullable':
      return outputReferences(plan.value, record, inRecord)
    case 'record':
      return Object.values(plan.fields).flatMap((field) =>
        outputReferences(field.value, record, true)
      )
    default:
      return []
  }
}

/**
 * The System Events folder fields that hold a folder reference, written from
 * the dictionary's `domain`, `user domain object` and `Classic domain object`
 * classes (System Events 1.3.6). The Classic list leaves out the folders the
 * manifest marks unsupported.
 */
const DOMAIN_FOLDERS = [
  'applicationSupportFolder',
  'applicationsFolder',
  'desktopPicturesFolder',
  'folderActionScriptsFolder',
  'fontsFolder',
  'libraryFolder',
  'preferencesFolder',
  'scriptingAdditionsFolder',
  'scriptsFolder',
  'sharedDocumentsFolder',
  'speakableItemsFolder',
  'utilitiesFolder',
  'workflowsFolder',
]
const USER_FOLDERS = [
  'applicationSupportFolder',
  'applicationsFolder',
  'desktopFolder',
  'desktopPicturesFolder',
  'documentsFolder',
  'downloadsFolder',
  'favoritesFolder',
  'folderActionScriptsFolder',
  'fontsFolder',
  'homeFolder',
  'libraryFolder',
  'moviesFolder',
  'musicFolder',
  'picturesFolder',
  'preferencesFolder',
  'publicFolder',
  'scriptingAdditionsFolder',
  'scriptsFolder',
  'sharedDocumentsFolder',
  'sitesFolder',
  'speakableItemsFolder',
  'temporaryItemsFolder',
  'utilitiesFolder',
  'workflowsFolder',
]
const CLASSIC_FOLDERS = [
  'applicationSupportFolder',
  'applicationsFolder',
  'libraryFolder',
  'preferencesFolder',
  'scriptsFolder',
  'workflowsFolder',
]

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
            const why = problem(app, target, resource)
            if (why !== undefined)
              found.push(`${app.name} ${resource}.${field} → ${target}: ${why}`)
          }
        }
      }
    }
    expect(found).toEqual([])
    // Every field of a resource-table record that still holds a reference,
    // audited by hand against the manifests: a Photos folder has a get with no
    // parent and is not identified by its name, and a Chrome or Edge tab is
    // got within its window and read through the window's own record, a
    // top-level window that claims its id unique. An iTerm tab has no id and
    // is got within its window by its position, so a window's current tab is
    // an index selector within the window it was read through. Music BrowserWindow and
    // PlaylistWindow `view` and Photos Container `parent` also stay in output,
    // but their resources have neither a get nor a list, so the table carries
    // no record for them. Xcode's WorkspaceDocument `activeScheme` is left
    // out: a scheme is got within its workspace document, which is identified
    // by its name with no claim, so it is no valid container. System Events
    // folders and disk items are got by POSIX path: every domain folder
    // (13), the user domain's 11 own and 13 inherited folders, the Classic
    // domain's own Preferences folder and the 5 inherited folders current
    // macOS has, and a disk item's and a folder's `container`. A TV
    // playlist's source is a top-level Source identity read through container.
    expect(positions.sort()).toEqual(
      [
        'google-chrome Window.activeTab → Tab',
        'iterm Window.currentTab → Tab',
        'microsoft-edge Window.activeTab → Tab',
        'photos Album.parent → Folder',
        'photos Folder.parent → Folder',
        'tv Playlist.source → Source',
        ...CLASSIC_FOLDERS.map((field) => `system-events ClassicDomainObject.${field} → Folder`),
        'system-events DiskItem.container → DiskItem',
        ...DOMAIN_FOLDERS.map((field) => `system-events Domain.${field} → Folder`),
        'system-events Folder.container → DiskItem',
        ...USER_FOLDERS.map((field) => `system-events UserDomainObject.${field} → Folder`),
      ].sort()
    )
  })

  it('return only references a caller can use', () => {
    const found: string[] = []
    const checked = new Set<string>()
    for (const app of apps) {
      for (const operation of Object.values(app.contract.operations)) {
        const references = outputReferences(operation.output.plan, operation.target.resource)
        for (const { target, source } of references) {
          checked.add(`${operation.id} → ${target}`)
          const why = problem(app, target, source)
          if (why !== undefined) found.push(`${app.name}: ${operation.id} → ${target}: ${why}`)
        }
      }
    }
    expect(found).toEqual([])
    // Guards against a vacuous pass: the references above, each on a record
    // that some operation returns. Chrome and iTerm get and list windows; Edge
    // also creates one, and returns its record. The current-window getter returns
    // a top-level Window identity, without requiring a containing record.
    expect([...checked].sort()).toEqual(
      [
        'google-chrome.windows.get → Tab',
        'google-chrome.windows.list → Tab',
        'iterm.app.currentWindow → Window',
        'iterm.windows.get → Tab',
        'iterm.windows.list → Tab',
        'microsoft-edge.windows.create → Tab',
        'microsoft-edge.windows.get → Tab',
        'microsoft-edge.windows.list → Tab',
        'photos.albums.get → Folder',
        'photos.albums.list → Folder',
        'photos.folders.get → Folder',
        'photos.folders.list → Folder',
        'tv.playlists.get → Source',
        'tv.playlists.list → Source',
        'system-events.classicDomainObjects.get → Folder',
        'system-events.classicDomainObjects.list → Folder',
        'system-events.diskItems.get → DiskItem',
        'system-events.domains.get → Folder',
        'system-events.domains.list → Folder',
        'system-events.folders.get → DiskItem',
        'system-events.userDomainObjects.get → Folder',
        'system-events.userDomainObjects.list → Folder',
      ].sort()
    )
  })
})

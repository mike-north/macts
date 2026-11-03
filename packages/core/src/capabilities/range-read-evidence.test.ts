/**
 * Paging rests on live evidence, for every shipped manifest.
 *
 * A list pages only when its app was observed, read-only, to read a range of
 * the resource's collection (phases/13 D9, _Bounded list pages_): every page
 * is read as such a range, and an app that rejects it fails every page. This
 * suite takes the lists that page from the capability listing, the surface an
 * agent discovers them on, and checks that each one's resource records a
 * supported range read with probe evidence of the same app. It also pins the
 * set of lists that page, so a list that starts or stops paging is a visible,
 * reviewed change.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md
 * @see ../manifest/schemas/resource.ts (ResourceRangeReadSchema)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { normalizeResourceRouteSegment } from '../manifest/route.js'
import type { AppManifest, Resource } from '../manifest/schemas/index.js'
import { deriveCapabilities } from './registry.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

/**
 * Every list that pages: those whose identifier is claimed unique and whose
 * range reads passed the live read-only observation.
 */
const PAGED_LISTS = [
  'contacts.addresses.list',
  'contacts.emails.list',
  'contacts.groups.list',
  'contacts.people.list',
  'contacts.phones.list',
  'notes.attachments.list',
  'photos.albums.list',
  'photos.folders.list',
  'reminders.accounts.list',
  'reminders.lists.list',
  'reminders.reminders.list',
  'shortcuts.folders.list',
]

let manifests: AppManifest[] = []

beforeAll(async () => {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadManifest(resolve(MANIFESTS_DIR, entry.name, 'app.yaml')))
  )
})

/** A list the capability listing shows with paging inputs, and its resource. */
interface PagedList {
  readonly name: string
  readonly manifest: AppManifest
  readonly resource: Resource | undefined
}

/** Every list the capability listings of the shipped manifests show as paging. */
function pagedLists(): PagedList[] {
  return manifests.flatMap((manifest) =>
    deriveCapabilities(manifest)
      .filter((capability) => 'pageSize' in (capability.inputSchema.properties ?? {}))
      .map((capability) => ({
        name: capability.name,
        manifest,
        resource: Object.values(manifest.resources).find(
          (resource) => normalizeResourceRouteSegment(resource.plural) === capability.resource
        ),
      }))
  )
}

describe('paging on shipped manifests rests on live range-read evidence', () => {
  it('pages exactly the lists whose range reads passed live', () => {
    expect(
      pagedLists()
        .map((list) => list.name)
        .sort()
    ).toEqual(PAGED_LISTS)
  })

  it('records, for every list that pages, a supported range read observed on the same app', () => {
    for (const list of pagedLists()) {
      expect(list.resource, `${list.name}: its resource`).toBeDefined()
      expect(list.resource?.rangeRead, list.name).toMatchObject({
        supported: true,
        evidence: { source: 'probe', bundleId: list.manifest.app.bundleId },
      })
      expect(list.resource?.rangeRead?.evidence.errorNumbers, list.name).toBeUndefined()
    }
  })

  it('does not page Music playlists, whose range reads fail', () => {
    // Regression: Music 1.7.2 answers every range read of its playlists with
    // -1708, so a paged playlists list failed on every page.
    const music = manifests.find((manifest) => manifest.app.bundleId === 'com.apple.Music')
    if (music === undefined) throw new Error('no Music manifest')
    const capability = deriveCapabilities(music).find((c) => c.name === 'music.playlists.list')

    expect(capability).toBeDefined()
    expect(capability?.inputSchema.properties).not.toHaveProperty('pageSize')
    expect(capability?.inputSchema.properties).not.toHaveProperty('cursor')
    expect(music.resources['Playlist']?.rangeRead).toMatchObject({
      supported: false,
      evidence: { source: 'probe', errorNumbers: [-1708] },
    })
  })
})

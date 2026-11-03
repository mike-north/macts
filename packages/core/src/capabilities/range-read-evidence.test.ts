/**
 * Paging rests on live evidence, for every shipped manifest.
 *
 * A list pages only when its app was observed, read-only, to read a range of
 * the resource's collection (phases/13 D9, _Bounded list pages_): every page
 * is read as such a range, and an app that rejects it fails every page. This
 * suite takes the lists that page from the capability listing, the surface an
 * agent discovers them on, and checks that each one's resource records a
 * supported range read with probe evidence of the same app, and how a page is
 * read (`read`) with the measured page costs it was chosen from. It also pins
 * the set of lists that page and the page read of each, so a list that starts
 * or stops paging, or changes how its pages are read, is a visible, reviewed
 * change.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md
 * @see ../manifest/schemas/resource.ts (ResourceRangeReadSchema)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { normalizeResourceRouteSegment } from '../manifest/route.js'
import type { AppManifest, PageRead, Resource } from '../manifest/schemas/index.js'
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

/**
 * How each list that pages reads a page, as chosen from the live cost sweep:
 * `column` where a page read over the whole collection took at most three
 * quarters of a page read over its own items, `range` everywhere else.
 */
const PAGE_READ_BY_LIST: Readonly<Record<string, PageRead>> = {
  'contacts.addresses.list': 'range',
  'contacts.emails.list': 'range',
  'contacts.groups.list': 'range',
  'contacts.people.list': 'column',
  'contacts.phones.list': 'range',
  'notes.attachments.list': 'column',
  'photos.albums.list': 'column',
  'photos.folders.list': 'range',
  'reminders.accounts.list': 'range',
  'reminders.lists.list': 'column',
  'reminders.reminders.list': 'range',
  'shortcuts.folders.list': 'range',
}

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

  it('records, for every list that pages, its page read and the measured costs it was chosen from', () => {
    const reads: Record<string, PageRead | undefined> = {}
    for (const list of pagedLists()) {
      const marker = list.resource?.rangeRead
      if (marker?.supported !== true) throw new Error(`${list.name}: no supported range read`)
      const { pageMs, columnMs, items } = marker.evidence
      expect(pageMs, `${list.name}: pageMs`).toBeTypeOf('number')
      expect(columnMs, `${list.name}: columnMs`).toBeTypeOf('number')
      expect(items, `${list.name}: items`).toBeTypeOf('number')
      reads[list.name] = marker.read
    }
    expect(reads).toEqual(PAGE_READ_BY_LIST)
  })

  it('reads Contacts people by column and Reminders reminders by range, each the read its measured costs choose', () => {
    // Regression: Contacts answers a range read item by item, so a page of
    // 25 people read by range took about 1 s per person and hit the 30 s
    // limit, while a read over all its people takes about as long as one
    // page. Reminders is the reverse: a whole-list read costs seconds per
    // property, and a range read of the page is the cheap one.
    const people = manifests.find((m) => m.app.bundleId === 'com.apple.AddressBook')?.resources[
      'Person'
    ]?.rangeRead
    const reminders = manifests.find((m) => m.app.bundleId === 'com.apple.reminders')?.resources[
      'Reminder'
    ]?.rangeRead
    expect(people).toMatchObject({ supported: true, read: 'column' })
    expect(reminders).toMatchObject({ supported: true, read: 'range' })
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

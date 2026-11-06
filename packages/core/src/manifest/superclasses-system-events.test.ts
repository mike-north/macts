/**
 * Tests for the superclasses the shipped System Events manifest records:
 * `folder` inherits `disk item`, and `user domain object` and `Classic domain
 * object` inherit `domain`, so each resource is read with what its superclass
 * declares (phases/13 D10, "Superclasses").
 *
 * The expected properties are copied by hand from the System Events
 * dictionary (`sdef "/System/Library/CoreServices/System Events.app"`,
 * version 1.3.6 on macOS 27.2), not from the manifest, under the manifest's
 * keys: the dictionary's `POSIX path` is the key `posixPath`. Identity follows
 * D10 "Key targeting" (a disk item and a folder by POSIX path, each through
 * its own collection's key) and "Singleton roots" (the user and Classic
 * domains by kind). The Classic folders current macOS lacks are marked
 * unsupported from read-only probes (2026-11-04T01:22:55.365Z for the 10 the
 * class declares, 2026-11-04T04:51:11Z for the 6 it inherits).
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 * @see `man 5 sdef`, the `inherits` attribute of a class
 */

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AppManifest } from './schemas/app.js'
import { loadManifest } from './loader.js'

/** Resource `key` of a parsed manifest. */
function resourceOf(manifest: AppManifest, key: string): AppManifest['resources'][string] {
  const resource = manifest.resources[key]
  if (resource === undefined) throw new Error(`no resource ${key}`)
  return resource
}

describe('the System Events superclasses (shipped manifest)', () => {
  const load = (): Promise<AppManifest> =>
    loadManifest(resolve(process.cwd(), '../../manifests/system-events/app.yaml'))

  // The dictionary's `disk item` properties, in its order.
  const DISK_ITEM = [
    'busyStatus',
    'container',
    'creationDate',
    'displayedName',
    'id',
    'modificationDate',
    'name',
    'nameExtension',
    'packageFolder',
    'path',
    'physicalSize',
    'posixPath',
    'size',
    'uRL',
    'visible',
    'volume',
  ]
  // The dictionary's `domain` properties: thirteen folders, `id` and `name`.
  const DOMAIN = [
    'applicationSupportFolder',
    'applicationsFolder',
    'desktopPicturesFolder',
    'folderActionScriptsFolder',
    'fontsFolder',
    'id',
    'libraryFolder',
    'name',
    'preferencesFolder',
    'scriptingAdditionsFolder',
    'scriptsFolder',
    'sharedDocumentsFolder',
    'speakableItemsFolder',
    'utilitiesFolder',
    'workflowsFolder',
  ]
  const USER_DOMAIN = [
    'desktopFolder',
    'documentsFolder',
    'downloadsFolder',
    'favoritesFolder',
    'homeFolder',
    'moviesFolder',
    'musicFolder',
    'picturesFolder',
    'publicFolder',
    'sitesFolder',
    'temporaryItemsFolder',
  ]
  // `fontsFolder` and `preferencesFolder` are declared by the Classic class
  // itself as well as by `domain`.
  const CLASSIC_DOMAIN = [
    'appleMenuFolder',
    'controlPanelsFolder',
    'controlStripModulesFolder',
    'desktopFolder',
    'extensionsFolder',
    'fontsFolder',
    'launcherItemsFolder',
    'preferencesFolder',
    'shutdownFolder',
    'startupItemsFolder',
    'systemFolder',
  ]
  const sorted = (keys: readonly string[]): string[] => [...keys].sort()

  /** The identifier of a disk item and a folder: its POSIX path, by key. */
  const BY_POSIX_PATH = { property: 'posixPath', primary: true, targeting: 'byKey', unique: true }

  it('gives a folder exactly the properties of a disk item, identified by its POSIX path', async () => {
    const manifest = await load()
    const folder = resourceOf(manifest, 'Folder')
    expect(Object.keys(folder.properties)).toEqual(DISK_ITEM)
    // Found through the folders' own key, so it states its own uniqueness
    // evidence rather than inheriting the disk items'.
    expect(folder.identifiers).toMatchObject([BY_POSIX_PATH])
    expect(folder.identifiers?.[0]?.evidence?.unique?.note).toContain("folders' key")
    expect(resourceOf(manifest, 'DiskItem').identifiers).toMatchObject([BY_POSIX_PATH])
    expect(folder.properties['posixPath']?.code).toBe('posx')
    // The key is the app's own spelling, so no native spelling is recorded.
    expect(folder.properties['posixPath']?.native).toBeUndefined()
    expect(folder.properties['uRL']?.native?.name).toBe('url')
  })

  it("gives the user domain its own 11 folders, the domain's 15 properties and its kind", async () => {
    const user = resourceOf(await load(), 'UserDomainObject')
    expect(sorted(Object.keys(user.properties))).toEqual(
      sorted([...USER_DOMAIN, 'kind', ...DOMAIN])
    )
    expect(Object.keys(user.properties)).toHaveLength(27)
    expect(user.roots).toMatchObject({ user: { property: 'userDomain' } })
    expect(user.identifiers).toMatchObject([{ property: 'kind', targeting: 'byRoot' }])
    expect(Object.values(user.properties).some((property) => property.unsupported)).toBe(false)
  })

  it("gives the Classic domain its own 11 folders, 13 more of the domain's and its kind", async () => {
    const classic = resourceOf(await load(), 'ClassicDomainObject')
    expect(sorted(Object.keys(classic.properties))).toEqual(
      sorted([...new Set([...CLASSIC_DOMAIN, 'kind', ...DOMAIN])])
    )
    expect(Object.keys(classic.properties)).toHaveLength(25)
    expect(classic.roots).toMatchObject({ classic: { property: 'classicDomain' } })
    expect(classic.identifiers).toMatchObject([{ property: 'kind', targeting: 'byRoot' }])
    // 16 folders current macOS lacks: 10 of its own 11 (all but the
    // Preferences folder), and 6 of the 11 domain folders it inherits.
    const unsupported = Object.entries(classic.properties)
      .filter(([, property]) => property.unsupported !== undefined)
      .map(([key]) => key)
    expect(sorted(unsupported)).toEqual(
      sorted([
        ...CLASSIC_DOMAIN.filter((key) => key !== 'preferencesFolder'),
        'desktopPicturesFolder',
        'folderActionScriptsFolder',
        'scriptingAdditionsFolder',
        'sharedDocumentsFolder',
        'speakableItemsFolder',
        'utilitiesFolder',
      ])
    )
    expect(unsupported).toHaveLength(16)
    // Its own declaration, not the domain's "The Preferences folder".
    expect(classic.properties['preferencesFolder']?.description).toBe(
      'The Classic Preferences folder'
    )
  })

  it('leaves the superclasses and the other domain kinds as declared', async () => {
    const manifest = await load()
    expect(Object.keys(resourceOf(manifest, 'DiskItem').properties)).toEqual(DISK_ITEM)
    expect(sorted(Object.keys(resourceOf(manifest, 'Domain').properties))).toEqual(sorted(DOMAIN))
    // Not opted in yet: still only the id the manifest gives them.
    for (const key of ['File', 'LocalDomainObject', 'FilePackage']) {
      expect(resourceOf(manifest, key).inherits).toBeUndefined()
    }
  })
})

/**
 * Tests for the superclasses the shipped System Events manifest records:
 * `folder` inherits `disk item`, and `user domain object` and `Classic domain
 * object` inherit `domain`, so each resource is read with what its superclass
 * declares (phases/13 D10, "Superclasses").
 *
 * The expected properties are copied by hand from the System Events
 * dictionary (`sdef "/System/Library/CoreServices/System Events.app"`,
 * version 1.3.6 on macOS 27.2), not from the manifest.
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
    'pOSIXPath',
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

  it('gives a folder exactly the properties of a disk item, identified by its id', async () => {
    const folder = resourceOf(await load(), 'Folder')
    expect(Object.keys(folder.properties)).toEqual(DISK_ITEM)
    expect(folder.identifiers).toEqual([{ property: 'id', primary: true }])
    expect(folder.properties['pOSIXPath']?.code).toBe('posx')
    expect(folder.properties['pOSIXPath']?.native?.name).toBe('posixPath')
    expect(folder.properties['uRL']?.native?.name).toBe('url')
  })

  it("gives the user domain its own 11 folders and the domain's 15 properties", async () => {
    const user = resourceOf(await load(), 'UserDomainObject')
    expect(sorted(Object.keys(user.properties))).toEqual(sorted([...USER_DOMAIN, ...DOMAIN]))
    expect(Object.keys(user.properties)).toHaveLength(26)
    expect(user.identifiers).toEqual([{ property: 'id', primary: true }])
  })

  it("gives the Classic domain its own 11 folders and 13 more of the domain's", async () => {
    const classic = resourceOf(await load(), 'ClassicDomainObject')
    expect(sorted(Object.keys(classic.properties))).toEqual(
      sorted([...new Set([...CLASSIC_DOMAIN, ...DOMAIN])])
    )
    expect(Object.keys(classic.properties)).toHaveLength(24)
    expect(classic.identifiers).toEqual([{ property: 'id', primary: true }])
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

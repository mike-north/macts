/**
 * The app's spelling of the collection a hierarchy entry names, for the
 * generated class SDK's collection getters.
 *
 * A hierarchy entry's key is the public name of the getter (`client.events`),
 * while the specifier that getter builds must address the app's own spelling
 * of the collection, which the manifest resolves for the entry's resource
 * (`resolveCollectionAccessor`: the recorded native spelling, else the
 * plural's lower camel case). The two coincide for most apps; where an app's
 * term cannot be derived from the plural ("AirPlay devices" is
 * `airplayDevices`), only the resolved accessor reaches the app.
 */

import type { AppManifest, HierarchyChild } from '../manifest/index.js'
import { resolveCollectionAccessor } from '../manifest/native-accessor.js'

/**
 * The accessor that addresses a hierarchy entry's collection in the app: the
 * entry's resource's collection accessor, or the entry's key when the
 * manifest does not declare that resource.
 *
 * @param manifest - The app manifest the hierarchy belongs to.
 * @param key - The entry's key, the public name of its getter.
 * @param child - The hierarchy entry.
 * @returns The accessor to put in the generated specifier.
 *
 * @internal Used within this package only (the class SDK generators).
 */
export function hierarchyChildAccessor(
  manifest: Pick<AppManifest, 'resources'>,
  key: string,
  child: Pick<HierarchyChild, 'resource'>
): string {
  const resource = Object.hasOwn(manifest.resources, child.resource)
    ? manifest.resources[child.resource]
    : undefined
  return resource === undefined ? key : resolveCollectionAccessor(resource)
}

/**
 * The app's own spelling of a resource's element collection: the name the
 * automation bridge resolves on the application object or on a parent item.
 *
 * This spelling belongs to the app and is distinct from the public spelling of
 * routes, SDK accessors, tools, and permissions. Everything that addresses an
 * app's collection natively (the native executor's bodies, and checks of those
 * bodies against an app's dictionary) resolves it through
 * {@link resolveCollectionAccessor}, so the spelling is decided in one place.
 *
 * The bridge spells a dictionary term by lowercasing its first word whole and
 * appending each later word with its first letter capitalized ("media items"
 * is `mediaItems`, "URL tracks" is `urlTracks`). Any other spelling, including
 * all lowercase, names no collection, and reading it fails.
 */

import { lowerCamel } from './lower-camel.js'
import type { Resource } from './schemas/resource.js'

/**
 * The bridge's spelling of a collection, derived from a resource's Pascal case
 * plural.
 *
 * The bridge's rule, first word lowercased whole and the rest as written, is
 * the manifest's acronym-aware lower camel case ({@link lowerCamel}): a run of
 * capitals is one word, so `URLTracks` gives `urlTracks` and `URLs` gives
 * `urls`. Today this coincides with the resource's public segment; the two are
 * kept as separate functions because they answer different questions, and an
 * app's own spelling can be recorded where it differs.
 *
 * A first word with an inner capital cannot be recovered from the plural:
 * "AirPlay devices" is `airplayDevices` in the app, but its plural
 * `AirPlayDevices` gives `airPlayDevices`. Only the dictionary term itself
 * settles that case.
 *
 * @param plural - The resource's Pascal case plural, e.g. `MediaItems`.
 * @returns The derived accessor, e.g. `mediaItems`.
 *
 * @internal Used within this package only.
 */
export function defaultCollectionAccessor(plural: string): string {
  return lowerCamel(plural)
}

/**
 * The accessor that addresses a resource's collection in the app. Today this
 * is always {@link defaultCollectionAccessor} of the resource's plural.
 *
 * @param resource - The resource definition from the manifest.
 * @returns The accessor to use in native bodies.
 *
 * @internal Used within this package only.
 */
export function resolveCollectionAccessor(resource: Pick<Resource, 'plural'>): string {
  return defaultCollectionAccessor(resource.plural)
}

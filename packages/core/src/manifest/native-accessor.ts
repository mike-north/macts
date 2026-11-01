/**
 * The app's own spelling of a resource's collection and of its properties:
 * the names the automation bridge resolves on the application object, on a
 * parent item, or on an item.
 *
 * This spelling belongs to the app and is distinct from the public spelling of
 * routes, SDK accessors, tools, permissions and returned records, which macts
 * derives from the manifest's own names. The bridge spells a dictionary term
 * by lowercasing its first word whole and appending each later word with its
 * first letter capitalized ("media items" is `mediaItems`, "URL tracks" is
 * `urlTracks`). Any other spelling, including all lowercase, names nothing,
 * and reading it fails.
 *
 * The default native spelling is derived: a collection's from the resource's
 * plural, a property's from its manifest key. Where the app's term cannot be
 * derived that way ("AirPlay devices" is `airplayDevices`, "ANSI black color"
 * is `ansiBlackColor`), the manifest records the app's spelling, with
 * dictionary evidence, and only where it differs from the default
 * (`resource.native.collection`, `property.native.name`). Everything that
 * addresses an app natively (the native executor's bodies, and checks of those
 * bodies against an app's dictionary) resolves names through
 * {@link resolveCollectionAccessor} and {@link resolvePropertyAccessor}, so
 * the native spelling is decided in one place.
 *
 * The recorded native spelling is a manifest fact, like the dictionary
 * evidence it carries, so the resolvers live with the manifest: the manifest
 * schemas check a recorded spelling against the default here, and the native
 * executor imports from here, so dependencies run from the executor to the
 * manifest only.
 */

import { lowerCamel } from './lower-camel.js'
import type { Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'

/**
 * The bridge's spelling of a collection, derived from a plural: a resource's
 * Pascal case plural, or a plural formed from an identifier parameter's stem
 * (`mediaItem` + `s`).
 *
 * The bridge's rule, first word lowercased whole and the rest as written, is
 * the manifest's acronym-aware lower camel case ({@link lowerCamel}): a run of
 * capitals is one word, so `URLTracks` gives `urlTracks` and `URLs` gives
 * `urls`. It coincides with the resource's public segment; the two are kept as
 * separate functions because they answer different questions, and an app's
 * own spelling is recorded where it differs.
 *
 * A first word with an inner capital cannot be recovered from the plural:
 * "AirPlay devices" is `airplayDevices` in the app, but its plural
 * `AirPlayDevices` gives `airPlayDevices`. Only the dictionary term itself
 * settles that case, so the manifest records it.
 *
 * @param plural - The plural in Pascal or lower camel case, e.g. `MediaItems`
 *   or `mediaItems`.
 * @returns The derived accessor, e.g. `mediaItems`.
 *
 * @internal Used within this package only.
 */
export function defaultCollectionAccessor(plural: string): string {
  return lowerCamel(plural)
}

/**
 * The accessor that addresses a resource's collection in the app: the
 * spelling the manifest records (`native.collection`), else
 * {@link defaultCollectionAccessor} of the resource's plural.
 *
 * @param resource - The resource definition from the manifest.
 * @returns The accessor to use in native bodies.
 *
 * @internal Used within this package only.
 */
export function resolveCollectionAccessor(resource: Pick<Resource, 'plural' | 'native'>): string {
  return resource.native?.collection ?? defaultCollectionAccessor(resource.plural)
}

/**
 * The name that addresses a property in the app: the spelling the manifest
 * records (`native.name`), else the property's manifest key, which is also its
 * public name in every returned record.
 *
 * @param key - The property's key in the resource's `properties`.
 * @param property - The property definition, or `undefined` for a name the
 *   resource does not declare as a property (an identifier declared only under
 *   `identifiers`, say), which is addressed by its key.
 * @returns The name to use in native bodies.
 *
 * @internal Used within this package only.
 */
export function resolvePropertyAccessor(
  key: string,
  property: Pick<Property, 'native'> | undefined
): string {
  return property?.native?.name ?? key
}

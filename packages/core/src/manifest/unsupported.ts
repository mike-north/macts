/**
 * The usable properties of a resource: the single point at which properties
 * marked `unsupported` leave the generated surfaces.
 *
 * A manifest keeps every property the app's dictionary declares, including
 * ones the app cannot provide at runtime; those carry an evidence-backed
 * `unsupported` marker (see `./schemas/evidence.ts`). Every generated public
 * surface (the contract, the SDKs, tool schemas, the CLI plugin) and the
 * nullability probe read a resource's properties through this module, so a
 * marked property is omitted everywhere at once and the omission stays
 * auditable in the manifest.
 *
 * Lookups that address a resource by its identifier stay on the declared
 * properties: a resource's primary identifier cannot be marked unsupported.
 */

import type { Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'

/**
 * Whether a property is marked unsupported: declared by the app's dictionary
 * but not providable at runtime, so left out of every generated surface.
 *
 * @param property - A property definition from the manifest.
 * @returns `true` when the property carries an `unsupported` marker.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function isUnsupportedProperty(property: Property): boolean {
  return property.unsupported !== undefined
}

/**
 * A resource's usable properties, in declaration order, as name and
 * definition pairs: every declared property except those marked unsupported.
 *
 * @param resource - The resource definition from the manifest.
 * @returns The `[name, property]` pairs the generated surfaces expose.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function usableProperties(resource: Pick<Resource, 'properties'>): [string, Property][] {
  return Object.entries(resource.properties).filter(
    ([, property]) => !isUnsupportedProperty(property)
  )
}

/**
 * Whether a resource has a usable property of the given name: one it declares
 * and that is not marked unsupported.
 *
 * @param resource - The resource definition from the manifest.
 * @param name - The property name.
 * @returns `true` when the generated surfaces expose the property.
 *
 * @internal Used within this package only (the generators, the manifest
 * schemas, and the nullability probe).
 */
export function hasUsableProperty(resource: Pick<Resource, 'properties'>, name: string): boolean {
  if (!Object.hasOwn(resource.properties, name)) return false
  const property = resource.properties[name]
  return property !== undefined && !isUnsupportedProperty(property)
}

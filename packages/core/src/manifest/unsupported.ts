/**
 * The usable resources of a manifest and the usable properties of a resource:
 * the single point at which resources and properties marked `unsupported`
 * leave the generated surfaces.
 *
 * A manifest keeps every property the app's dictionary declares, including
 * ones the app cannot provide at runtime; those carry an evidence-backed
 * `unsupported` marker (see `./schemas/evidence.ts`). Every generated public
 * surface (the contract, the SDKs, tool schemas, the CLI plugin) and the
 * nullability probe read a resource's properties through this module, so a
 * marked property is omitted everywhere at once and the omission stays
 * auditable in the manifest.
 *
 * Likewise a manifest keeps a resource the app cannot provide (its dictionary
 * has no collection for it, or every read of it fails), marked `unsupported`
 * with the evidence (see `./schemas/resource.ts`), and a command the running
 * app cannot carry out, marked `unsupported` with live evidence (see
 * `./schemas/command.ts`). Route resolution and every generator read a
 * manifest's resources, hierarchy and commands through this module, so a
 * marked resource, its hierarchy entries and everything nested under them,
 * and a marked command, leave every surface at once.
 *
 * Lookups that address a resource by its identifier stay on the declared
 * properties: a resource's primary identifier cannot be marked unsupported.
 */

import type { AppManifest } from './schemas/app.js'
import type { Command } from './schemas/command.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import { PrimitiveTypeSchema, type Property } from './schemas/property.js'
import type { Resource } from './schemas/resource.js'
import { normalizeTypeName } from './type-names.js'

/**
 * Whether a resource is marked unsupported: declared by the manifest, but not
 * providable by the app (no collection in its dictionary, or no read of it
 * succeeds), so left out of every generated surface.
 *
 * @param resource - A resource definition from the manifest.
 * @returns `true` when the resource carries an `unsupported` marker.
 *
 * @internal Used within this package only (route resolution and the
 * generators).
 */
export function isResourceUnsupported(resource: Pick<Resource, 'unsupported'>): boolean {
  return resource.unsupported !== undefined
}

/**
 * Whether a manifest declares a resource of the given key and marks it
 * unsupported. A key the manifest does not declare is not marked.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - A key of `manifest.resources`.
 * @returns `true` when the resource is declared and marked unsupported.
 *
 * @internal Used within this package only (route resolution and the
 * generators).
 */
export function isUnsupportedResourceKey(
  manifest: Pick<AppManifest, 'resources'>,
  resourceKey: string
): boolean {
  if (!Object.hasOwn(manifest.resources, resourceKey)) return false
  const resource = manifest.resources[resourceKey]
  return resource !== undefined && isResourceUnsupported(resource)
}

/**
 * A manifest's usable resources, in declaration order, as key and definition
 * pairs: every declared resource except those marked unsupported.
 *
 * @param manifest - The app manifest.
 * @returns The `[key, resource]` pairs the generated surfaces expose.
 *
 * @internal Used within this package only (route resolution and the
 * generators).
 */
export function usableResources(manifest: Pick<AppManifest, 'resources'>): [string, Resource][] {
  return Object.entries(manifest.resources).filter(
    ([, resource]) => !isResourceUnsupported(resource)
  )
}

/**
 * The usable entries of one level of a manifest's hierarchy, in declaration
 * order: every entry except those whose resource is marked unsupported. An
 * omitted entry takes its nested entries with it, since a walker only
 * descends through the entries it is given.
 *
 * @param manifest - The app manifest the hierarchy belongs to.
 * @param children - One level of the hierarchy: `manifest.hierarchy.children`
 *   or an entry's `children`.
 * @returns The `[key, child]` pairs the generated surfaces expose.
 *
 * @internal Used within this package only (the generators).
 */
export function usableHierarchyChildren(
  manifest: Pick<AppManifest, 'resources'>,
  children: Readonly<Record<string, HierarchyChild>>
): [string, HierarchyChild][] {
  return Object.entries(children).filter(
    ([, child]) => !isUnsupportedResourceKey(manifest, child.resource)
  )
}

/**
 * Whether a command is marked unsupported: declared by the manifest, but not
 * carried out by the running app, so without a route and left out of every
 * generated surface.
 *
 * @param command - A command definition from the manifest.
 * @returns `true` when the command carries an `unsupported` marker.
 *
 * @internal Used within this package only (route resolution and the
 * generators).
 */
export function isCommandUnsupported(command: Pick<Command, 'unsupported'>): boolean {
  return command.unsupported !== undefined
}

/**
 * A manifest's usable commands, in declaration order, as key and definition
 * pairs: every declared command except those marked unsupported.
 *
 * @param manifest - The app manifest.
 * @returns The `[key, command]` pairs the generated surfaces expose.
 *
 * @internal Used within this package only (route resolution and the
 * generators).
 */
export function usableCommands(manifest: Pick<AppManifest, 'commands'>): [string, Command][] {
  return Object.entries(manifest.commands).filter(([, command]) => !isCommandUnsupported(command))
}

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

/**
 * A place where a usable declaration's type names a resource marked
 * unsupported: a usable property of a usable resource, or a parameter or the
 * result of a usable command. No generated surface declares a marked
 * resource, so the type would refer to nothing.
 */
export interface UnsupportedTypeReference {
  /** The declaration, as a dotted manifest path, e.g. `commands.open.returns`. */
  readonly site: string
  /** Where the type is in the manifest, for a schema issue. */
  readonly path: readonly (string | number)[]
  /** The key of the unsupported resource the type names. */
  readonly resourceKey: string
}

/** The primitive type names, which never name a resource. */
const PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set(PrimitiveTypeSchema.options)

/**
 * The unsupported resources a declared type names, matched as the contract
 * generator matches type names (`./type-names.ts`): a bare name or an
 * `{ enum }` that names an enum is an enum; a name that names a usable
 * resource refers to it, even when an unsupported one shares the name; and an
 * `{ array }` names what its item names.
 */
function unsupportedResourcesNamedBy(
  type: unknown,
  usable: ReadonlySet<string>,
  unsupported: ReadonlyMap<string, string>,
  enums: ReadonlySet<string>
): string[] {
  const byName = (name: string, enumFirst: boolean): string[] => {
    const normalized = normalizeTypeName(name)
    if (enumFirst && enums.has(normalized)) return []
    if (usable.has(normalized)) return []
    const key = unsupported.get(normalized)
    return key === undefined ? [] : [key]
  }
  if (typeof type === 'string') {
    return PRIMITIVE_TYPE_NAMES.has(type) ? [] : byName(type, true)
  }
  if (typeof type !== 'object' || type === null || Array.isArray(type)) return []
  if (Object.keys(type).length !== 1) return []
  if ('array' in type) return unsupportedResourcesNamedBy(type.array, usable, unsupported, enums)
  if ('resource' in type && typeof type.resource === 'string') return byName(type.resource, false)
  if ('enum' in type && typeof type.enum === 'string') return byName(type.enum, true)
  return []
}

/**
 * Every usable declaration whose type names a resource marked unsupported, in
 * manifest order: usable properties of usable resources, then the parameters
 * and results of usable commands. Declarations no surface exposes (on a
 * marked resource, a marked property or a marked command) are not checked.
 *
 * @param manifest - The app manifest.
 * @returns One entry per offending declaration; none when every reference
 *   resolves to something the generated surfaces declare.
 *
 * @internal Used within this package only (the manifest schema).
 */
export function findUnsupportedTypeReferences(
  manifest: Pick<AppManifest, 'resources' | 'enums' | 'commands'>
): UnsupportedTypeReference[] {
  const usable = new Set<string>()
  const unsupported = new Map<string, string>()
  for (const [key, resource] of Object.entries(manifest.resources)) {
    for (const alias of [key, resource.name, resource.plural]) {
      const normalized = normalizeTypeName(alias)
      if (!isResourceUnsupported(resource)) usable.add(normalized)
      else if (!unsupported.has(normalized)) unsupported.set(normalized, key)
    }
  }
  const enums = new Set(Object.keys(manifest.enums).map(normalizeTypeName))
  const references: UnsupportedTypeReference[] = []
  const check = (type: unknown, site: string, path: readonly (string | number)[]): void => {
    for (const resourceKey of unsupportedResourcesNamedBy(type, usable, unsupported, enums)) {
      references.push({ site, path, resourceKey })
    }
  }
  for (const [resourceKey, resource] of usableResources(manifest)) {
    for (const [propertyKey, property] of usableProperties(resource)) {
      check(property.type, `resources.${resourceKey}.properties.${propertyKey}`, [
        'resources',
        resourceKey,
        'properties',
        propertyKey,
        'type',
      ])
    }
  }
  for (const [commandKey, command] of usableCommands(manifest)) {
    command.parameters.forEach((parameter, index) => {
      check(parameter.type, `commands.${commandKey}.parameters.${parameter.name}`, [
        'commands',
        commandKey,
        'parameters',
        index,
        'type',
      ])
    })
    check(command.returns, `commands.${commandKey}.returns`, ['commands', commandKey, 'returns'])
  }
  return references
}

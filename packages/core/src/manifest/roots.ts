/**
 * Singleton roots: resources whose objects the app holds as properties of the
 * application itself, one per kind, rather than as elements of a collection
 * (an app holding its front desk as its `frontDesk` property and its back
 * desk as `backDesk`).
 *
 * A root resource records `roots: { <kind>: { property, evidence } }`. Its
 * identity is the kind: normalisation gives the resource a closed enum of its
 * kinds, a read-only `kind` property of that enum, and a primary identifier
 * on `kind` with `byRoot` targeting, unique by construction because each kind
 * names one application property. A get finds the object of one kind by
 * reading that property, and a list returns one record per kind the app
 * holds. References to a root are ordinary identity references by kind.
 *
 * Normalisation is idempotent, because a validated manifest (the one a
 * generated package embeds) is validated again before use: the pieces it adds
 * are accepted only when present in exactly the form it gives them.
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { AppManifest } from './schemas/app.js'
import type { Enum } from './schemas/enum.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import type { Property } from './schemas/property.js'
import type { Identifier, Resource, ResourceRoots } from './schemas/resource.js'
import { commandAppliesToResource } from './resource-commands.js'

/** The property that holds a root object's kind, and its primary identifier. */
export const ROOT_KIND_PROPERTY = 'kind'

/** The manifest key of the enum of a root resource's kinds: `<ResourceKey>Kind`. */
export function rootKindEnumKey(resourceKey: string): string {
  return `${resourceKey}Kind`
}

/**
 * The kinds of `resourceKey` and the application property each names, or
 * `undefined` when the resource is reached through a collection or the
 * manifest does not declare it.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the resource.
 */
export function resolveRoots(
  manifest: Pick<AppManifest, 'resources'>,
  resourceKey: string
): ResourceRoots | undefined {
  return Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]?.roots
    : undefined
}

/** Each kind of `roots` with the application property it names, in declaration order. */
export function rootProperties(roots: ResourceRoots): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(roots).map(([kind, root]) => [kind, root.property]))
}

/** The enum normalisation gives a root resource: one value per kind. */
function kindEnum(resourceKey: string, resource: Resource, roots: ResourceRoots): Enum {
  return {
    name: rootKindEnumKey(resourceKey),
    description: `The kinds of ${resource.name}: each names the application property that holds one.`,
    values: Object.keys(roots).map((kind) => ({ name: kind, value: kind })),
  }
}

/** The `kind` property normalisation gives a root resource. */
function kindProperty(resourceKey: string, resource: Resource): Property {
  return {
    access: 'r',
    type: { enum: rootKindEnumKey(resourceKey) },
    description: `Which ${resource.name} this is: the kind naming the application property that holds it`,
    optional: false,
  }
}

/** The primary identifier normalisation gives a root resource. */
const KIND_IDENTIFIER: Identifier = {
  property: ROOT_KIND_PROPERTY,
  primary: true,
  targeting: 'byRoot',
  unique: true,
  evidence: {
    unique: {
      source: 'curated',
      note: 'Each kind names one application property, which holds one object.',
    },
  },
}

/**
 * The manifest with every root resource's kind enum, `kind` property and
 * primary identifier in place (see the module comment). A manifest with no
 * roots is returned unchanged.
 */
export function normalizeRoots<M extends Pick<AppManifest, 'resources' | 'enums'>>(manifest: M): M {
  const rooted = Object.entries(manifest.resources).filter(
    (entry): entry is [string, Resource & { roots: ResourceRoots }] => entry[1].roots !== undefined
  )
  if (rooted.length === 0) return manifest
  const resources = { ...manifest.resources }
  const enums = { ...manifest.enums }
  for (const [key, resource] of rooted) {
    enums[rootKindEnumKey(key)] = kindEnum(key, resource, resource.roots)
    resources[key] = {
      ...resource,
      properties: { ...resource.properties, [ROOT_KIND_PROPERTY]: kindProperty(key, resource) },
      identifiers: [KIND_IDENTIFIER],
    }
  }
  return { ...manifest, resources, enums }
}

/** A manifest issue: what is wrong, and where in the manifest. */
interface RootIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/** Whether `type` is `{ enum: enumKey }`. */
function isEnumType(type: unknown, enumKey: string): boolean {
  return (
    typeof type === 'object' &&
    type !== null &&
    Object.keys(type).length === 1 &&
    Reflect.get(type, 'enum') === enumKey
  )
}

/**
 * Whether two manifest values are the same data: equal primitives, or arrays
 * and plain objects of the same shape holding the same data, whatever the
 * order of an object's keys. A value that normalisation derives is accepted
 * on re-validation only when it is the same data as the derived one, so a
 * piece of a root's identity cannot be dropped or changed.
 */
function isSameData(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameData(item, b[index]))
    )
  }
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) => Object.hasOwn(b, key) && isSameData(Reflect.get(a, key), Reflect.get(b, key))
    )
  )
}

/**
 * The issues of the manifest's singleton roots, checked before
 * normalisation:
 *
 * - What normalisation adds (the kind enum, the `kind` property, the
 *   identifier) is derived from the kinds, so a root declares none of them
 *   other than in exactly that form.
 * - `byRoot` targeting belongs to roots alone.
 * - A root has a get and a list, and no create, update or delete: its
 *   objects are the application's own properties.
 * - Its get takes one required parameter, typed by the kind enum; its list
 *   takes none. Neither records a parent, and no command records a root as
 *   its parent: a root is found at the application only.
 * - No hierarchy entry names a root: each entry is a collection.
 */
export function findRootIssues(
  manifest: Pick<AppManifest, 'resources' | 'commands' | 'hierarchy' | 'enums'>
): RootIssue[] {
  const issues: RootIssue[] = []
  const roots = new Map<string, ResourceRoots>()
  for (const [key, resource] of Object.entries(manifest.resources)) {
    if (resource.roots !== undefined) {
      roots.set(key, resource.roots)
      continue
    }
    resource.identifiers?.forEach((identifier, index) => {
      if (identifier.targeting === 'byRoot') {
        issues.push({
          message: `byRoot targeting finds a root's object from its kind, and "${key}" records no roots; choose another targeting.`,
          path: ['resources', key, 'identifiers', index, 'targeting'],
        })
      }
    })
  }
  if (roots.size === 0) return issues

  for (const [key, kinds] of roots) {
    const resource = manifest.resources[key]
    if (resource === undefined) continue
    const enumKey = rootKindEnumKey(key)
    const identifiers = resource.identifiers
    if (
      identifiers !== undefined &&
      !(identifiers.length === 1 && isSameData(identifiers[0], KIND_IDENTIFIER))
    ) {
      issues.push({
        message: `"${key}" is identified by its kind, which its roots define; remove identifiers, or leave exactly the one validation derives (${ROOT_KIND_PROPERTY}, primary, unique, byRoot, with its curated uniqueness evidence).`,
        path: ['resources', key, 'identifiers'],
      })
    }
    const declared = Object.hasOwn(resource.properties, ROOT_KIND_PROPERTY)
      ? resource.properties[ROOT_KIND_PROPERTY]
      : undefined
    if (declared !== undefined && !isSameData(declared, kindProperty(key, resource))) {
      issues.push({
        message: `"${key}" holds its kind in "${ROOT_KIND_PROPERTY}", of the enum ${enumKey} its roots define; remove the property, or leave exactly the one validation derives.`,
        path: ['resources', key, 'properties', ROOT_KIND_PROPERTY],
      })
    }
    const existing = Object.hasOwn(manifest.enums, enumKey) ? manifest.enums[enumKey] : undefined
    const kindNames = Object.keys(kinds)
    const values = existing?.values.map(({ value }) => value) ?? []
    if (
      existing !== undefined &&
      (values.length !== kindNames.length ||
        kindNames.some((kind, index) => values[index] !== kind))
    ) {
      issues.push({
        message: `The enum ${enumKey} is the kinds of the root "${key}", which its roots define; remove the enum or rename it.`,
        path: ['enums', enumKey],
      })
    }
  }

  for (const [commandKey, command] of Object.entries(manifest.commands)) {
    for (const [key] of roots) {
      if (!commandAppliesToResource(command, key)) continue
      const enumKey = rootKindEnumKey(key)
      if (command.name === 'create' || command.name === 'update' || command.name === 'delete') {
        issues.push({
          message: `"${key}" is held by the application as its properties, so it has no ${command.name}; its standard commands are a get and a list.`,
          path: ['commands', commandKey, 'name'],
        })
        continue
      }
      if (command.name !== 'get' && command.name !== 'list') continue
      const required = command.parameters.filter((parameter) => parameter.required)
      if (command.name === 'get') {
        const [only, ...more] = required
        if (only === undefined || more.length > 0 || !isEnumType(only.type, enumKey)) {
          issues.push({
            message: `The get of "${key}" finds an object from its kind, so it takes exactly one required parameter, of type { enum: ${enumKey} }.`,
            path: ['commands', commandKey, 'parameters'],
          })
        }
      } else if (required[0] !== undefined) {
        issues.push({
          message: `The list of "${key}" reads every kind the application holds, so it takes no required parameter; make "${required[0].name}" optional or remove it.`,
          path: ['commands', commandKey, 'parameters'],
        })
      }
      if (command.parent !== undefined) {
        issues.push({
          message: `"${key}" is held by the application as its properties, so its ${command.name} records no parent; remove parent.`,
          path: ['commands', commandKey, 'parent'],
        })
      }
    }
    const parent = command.parent?.resource
    if (parent !== undefined && roots.has(parent)) {
      issues.push({
        message: `"${parent}" is held by the application as its properties, so nothing is found within one yet; it cannot be a parent.`,
        path: ['commands', commandKey, 'parent', 'resource'],
      })
    }
  }

  const visit = (children: Record<string, HierarchyChild>, path: (string | number)[]): void => {
    for (const [key, child] of Object.entries(children)) {
      if (roots.has(child.resource)) {
        issues.push({
          message: `"${child.resource}" is held by the application as its properties, not in a collection, so no hierarchy entry names it.`,
          path: [...path, key, 'resource'],
        })
      }
      if (child.children !== undefined) visit(child.children, [...path, key, 'children'])
    }
  }
  visit(manifest.hierarchy.children, ['hierarchy', 'children'])
  return issues
}

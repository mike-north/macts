/**
 * Superclass inheritance in a manifest: the one place a resource that records
 * `inherits` gains what its dictionary class inherits, and the checks that the
 * recorded superclasses form a chain that can be followed.
 *
 * A scripting dictionary declares a class's superclass (`<class name="folder"
 * inherits="disk item">`), and an object of the class has every property of
 * its superclasses. A manifest records the superclass on the resource,
 * `inherits: { resource, evidence }`, and declares on each resource only what
 * the dictionary declares there. The manifest schema reads it flattened
 * ({@link flattenSuperclasses}, applied by `AppManifestSchema`), so every
 * reader of a parsed manifest (the generators, the runtime, the probes) sees a
 * subclass's record and identity as its superclass's, unless the resource
 * says otherwise.
 *
 * What a resource inherits is what the dictionary shows about its ancestors:
 * their property declarations, with codes, native spellings, a nullability
 * claim backed by the dictionary itself, and `unsupported` markers, and their
 * identifiers. Claims about an ancestor's own collection (a nullability claim
 * observed by a probe or curated, a resettability claim, an identifier's
 * uniqueness) stay with it: they describe the items that collection held, so
 * the subclass's collection needs its own evidence. Records about a resource
 * itself (its code, collection spelling, `unsupported` marker, probe blocks)
 * and commands are never inherited.
 *
 * Internal to this package: the manifest schema applies it, and nothing here
 * is part of the public entry.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import type { Identifier, Resource } from './schemas/resource.js'
import type { Property } from './schemas/property.js'

/** A manifest issue: what is wrong, and where in the manifest. */
export interface SuperclassIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/** The resources of a manifest, as far as superclasses are concerned. */
type InheritingResources = Readonly<
  Record<string, { readonly inherits?: { readonly resource: string } | undefined }>
>

/**
 * The issues of the manifest's recorded superclasses: a superclass that is
 * not a resource of the manifest, and a chain of superclasses that loops.
 * Each cycle is reported once, at the cycle's first resource in manifest
 * order, naming the cycle from there; a resource that only leads into a cycle
 * is not reported.
 *
 * @param resources - The manifest's resources, by key.
 *
 * @internal Used by the manifest schema.
 */
export function findSuperclassIssues(resources: InheritingResources): SuperclassIssue[] {
  const keys = Object.keys(resources)
  const order = new Map(keys.map((key, index) => [key, index]))
  const issues: SuperclassIssue[] = []
  const reported = new Set<string>()
  for (const key of keys) {
    const superclass = resources[key]?.inherits?.resource
    if (superclass === undefined) continue
    if (!order.has(superclass)) {
      issues.push({
        message: `resources.${key}.inherits.resource: "${superclass}" is not a resource the manifest declares; name the key of the resource the dictionary says this class inherits from.`,
        path: ['resources', key, 'inherits', 'resource'],
      })
    }
  }
  for (const key of keys) {
    const cycle = cycleFrom(key, resources)
    if (cycle === undefined) continue
    const start = cycle.reduce((first, member) =>
      (order.get(member) ?? 0) < (order.get(first) ?? 0) ? member : first
    )
    if (reported.has(start)) continue
    for (const member of cycle) reported.add(member)
    const from = cycle.indexOf(start)
    const named = [...cycle.slice(from), ...cycle.slice(0, from), start]
    issues.push({
      message: `resources.${start}.inherits: the superclasses form a cycle, ${named.join(' → ')}; a class cannot inherit from itself.`,
      path: ['resources', start, 'inherits', 'resource'],
    })
  }
  return issues
}

/**
 * The resources of the cycle the superclass chain from `key` runs into, in
 * chain order, or `undefined` when the chain ends: at a resource that
 * inherits nothing, or at a superclass the manifest does not declare.
 */
function cycleFrom(key: string, resources: InheritingResources): string[] | undefined {
  const chain: string[] = []
  let current: string | undefined = key
  while (current !== undefined && Object.hasOwn(resources, current)) {
    const seen = chain.indexOf(current)
    if (seen >= 0) return chain.slice(seen)
    chain.push(current)
    current = resources[current]?.inherits?.resource
  }
  return undefined
}

/**
 * The manifest read flattened: each resource that records `inherits` gains
 * every property of its ancestors that it does not declare, nearest ancestor
 * first, after its own properties and in each ancestor's order, and the
 * nearest ancestor's identifiers when it declares none. A property the
 * resource declares replaces the inherited one whole. What is inherited, and
 * what stays with the ancestor, is described in the module comment.
 *
 * The superclasses must already have passed {@link findSuperclassIssues}; a
 * chain that loops or leaves the manifest simply ends there. Flattening a
 * flattened manifest changes nothing: the inherited properties and
 * identifiers are then the resource's own.
 *
 * @param manifest - A parsed manifest whose superclasses are valid.
 * @returns The same manifest with each inheriting resource flattened.
 *
 * @internal Used by the manifest schema.
 */
export function flattenSuperclasses<M extends { readonly resources: Record<string, Resource> }>(
  manifest: M
): M {
  const { resources } = manifest
  if (!Object.values(resources).some(({ inherits }) => inherits !== undefined)) return manifest
  const flattened: Record<string, Resource> = {}
  for (const [key, resource] of Object.entries(resources)) {
    flattened[key] =
      resource.inherits === undefined
        ? resource
        : flattenResource(resource, ancestorsOf(key, resources))
  }
  return { ...manifest, resources: flattened }
}

/** The ancestors of resource `key`, nearest first, ending where the chain ends. */
function ancestorsOf(key: string, resources: Readonly<Record<string, Resource>>): Resource[] {
  const ancestors: Resource[] = []
  const seen = new Set([key])
  let superclass = resources[key]?.inherits?.resource
  while (
    superclass !== undefined &&
    !seen.has(superclass) &&
    Object.hasOwn(resources, superclass)
  ) {
    const ancestor = resources[superclass]
    if (ancestor === undefined) break
    seen.add(superclass)
    ancestors.push(ancestor)
    superclass = ancestor.inherits?.resource
  }
  return ancestors
}

/** `resource` with what it inherits from `ancestors`, nearest first. */
function flattenResource(resource: Resource, ancestors: readonly Resource[]): Resource {
  const properties: Record<string, Property> = { ...resource.properties }
  for (const ancestor of ancestors) {
    for (const [key, property] of Object.entries(ancestor.properties)) {
      if (!Object.hasOwn(properties, key)) properties[key] = inheritedProperty(property)
    }
  }
  const flattened: Resource = { ...resource, properties }
  if (resource.identifiers !== undefined) return flattened
  const identifiers = ancestors.find((ancestor) => ancestor.identifiers !== undefined)?.identifiers
  return identifiers === undefined
    ? flattened
    : { ...flattened, identifiers: identifiers.map(inheritedIdentifier) }
}

/**
 * An ancestor's property as a subclass inherits it: the declaration, code,
 * native spelling and `unsupported` marker, and a nullability claim only when
 * the dictionary backs it. A nullability claim from a probe or a curator, and
 * a resettability claim, describe the ancestor's own collection, so the
 * subclass falls back to the defaults until its own evidence says otherwise.
 */
function inheritedProperty(property: Property): Property {
  const {
    nullable: _nullable,
    resettable: _resettable,
    evidence: _evidence,
    ...declaration
  } = property
  const nullability = property.evidence?.nullable
  if (property.nullable === undefined || nullability?.source !== 'sdef') return declaration
  return { ...declaration, nullable: property.nullable, evidence: { nullable: nullability } }
}

/**
 * An ancestor's identifier as a subclass inherits it: how the resource is
 * identified and targeted, without the uniqueness claim, which describes the
 * items the ancestor's own collection held.
 */
function inheritedIdentifier(identifier: Identifier): Identifier {
  const { unique: _unique, evidence: _evidence, ...inherited } = identifier
  return inherited
}

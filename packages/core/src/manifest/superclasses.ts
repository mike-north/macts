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
 * What a resource inherits is its ancestors' property declarations and
 * identifiers, with every claim made about them: codes, native spellings,
 * nullability and resettability claims and `unsupported` markers, whatever
 * their evidence, and an identifier's targeting and uniqueness. An object of
 * the subclass is an object of each ancestor's class, so what was observed
 * or curated for the class holds for it, as the ancestor's evidence. A
 * subclass with evidence of its own states the claim in a claims-only overlay
 * (`inheritedClaims`), which replaces that claim and leaves the declaration
 * the ancestor's; a subclass that declares the property itself replaces it
 * whole, and one that declares identifiers replaces them. Inheritance runs
 * one way: a subclass's claims are about its own items and never reach an
 * ancestor. Records about a
 * resource itself (its code, collection spelling, `unsupported` marker, probe
 * blocks) and commands are never inherited.
 *
 * Internal to this package: the manifest schema applies it, and nothing here
 * is part of the public entry.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 */

import type { Resource } from './schemas/resource.js'
import type { Property, PropertyClaims } from './schemas/property.js'

/** A manifest issue: what is wrong, and where in the manifest. */
export interface SuperclassIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/** The resources of a manifest, as far as superclasses are concerned. */
type InheritingResources = Readonly<
  Record<
    string,
    {
      readonly inherits?: { readonly resource: string } | undefined
      readonly properties?: Readonly<Record<string, unknown>>
      readonly inheritedClaims?: Readonly<Record<string, unknown>> | undefined
    }
  >
>

/**
 * The issues of the manifest's recorded superclasses: a superclass that is
 * not a resource of the manifest, a chain of superclasses that loops, and a
 * claims-only overlay for a property the resource does not inherit (it
 * records no superclass, no ancestor declares the property, or the resource
 * declares the property itself, where the claim belongs). Each cycle is
 * reported once, at the cycle's first resource in manifest order, naming the
 * cycle from there; a resource that only leads into a cycle is not reported.
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
  for (const key of keys) issues.push(...overlayIssues(key, resources))
  return issues
}

/** The issues of resource `key`'s claims-only overlays (see {@link findSuperclassIssues}). */
function overlayIssues(key: string, resources: InheritingResources): SuperclassIssue[] {
  const resource = resources[key]
  const overlays = Object.keys(resource?.inheritedClaims ?? {})
  if (resource === undefined || overlays.length === 0) return []
  const path = (property: string): (string | number)[] => [
    'resources',
    key,
    'inheritedClaims',
    property,
  ]
  if (resource.inherits === undefined) {
    return overlays.map((property) => ({
      message: `resources.${key}.inheritedClaims.${property}: "${key}" records no superclass, so it inherits no property; state the claim on its own declaration.`,
      path: path(property),
    }))
  }
  const inherited = new Set<string>()
  for (const ancestor of superclassChain(key, resources)) {
    for (const property of Object.keys(resources[ancestor]?.properties ?? {})) {
      inherited.add(property)
    }
  }
  return overlays.flatMap((property) => {
    if (Object.hasOwn(resource.properties ?? {}, property)) {
      return [
        {
          message: `resources.${key}.inheritedClaims.${property}: "${key}" declares "${property}" itself, so the claim belongs on that declaration.`,
          path: path(property),
        },
      ]
    }
    if (!inherited.has(property)) {
      return [
        {
          message: `resources.${key}.inheritedClaims.${property}: no superclass of "${key}" declares "${property}", so there is no inherited property to make the claim about.`,
          path: path(property),
        },
      ]
    }
    return []
  })
}

/**
 * The keys of resource `key`'s ancestors, nearest first, ending where the
 * chain ends: at a resource that inherits nothing, a superclass the manifest
 * does not declare, or a resource already in the chain.
 *
 * @internal Used by the manifest schema.
 */
export function superclassChain(key: string, resources: InheritingResources): string[] {
  const ancestors: string[] = []
  const seen = new Set([key])
  let superclass = resources[key]?.inherits?.resource
  while (
    superclass !== undefined &&
    !seen.has(superclass) &&
    Object.hasOwn(resources, superclass)
  ) {
    seen.add(superclass)
    ancestors.push(superclass)
    superclass = resources[superclass]?.inherits?.resource
  }
  return ancestors
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
 * resource declares replaces the inherited one whole, and a claims-only
 * overlay replaces the claims it states. A resource inherits its superclass
 * as flattened, so an overlay a superclass states holds for its subclasses
 * too, unless one states its own. What is inherited is described in the
 * module comment.
 *
 * The superclasses must already have passed {@link findSuperclassIssues}; a
 * chain that loops or leaves the manifest simply ends there. Flattening a
 * flattened manifest changes nothing: the inherited properties and
 * identifiers are then the resource's own, and it records no overlays.
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
  const flattened = new Map<string, Resource>()
  const flatten = (key: string, visiting: ReadonlySet<string>): Resource | undefined => {
    const done = flattened.get(key)
    if (done !== undefined) return done
    const resource = Object.hasOwn(resources, key) ? resources[key] : undefined
    if (resource === undefined) return undefined
    const superclass = resource.inherits?.resource
    // A chain that loops or leaves the manifest ends where it does.
    const parent =
      superclass === undefined || visiting.has(superclass)
        ? undefined
        : flatten(superclass, new Set([...visiting, key]))
    const result = resource.inherits === undefined ? resource : flattenResource(resource, parent)
    flattened.set(key, result)
    return result
  }
  // Built in the manifest's own order: a superclass flattened early, for a
  // subclass declared before it, keeps its place.
  const ordered = Object.keys(resources).map((key) => [key, flatten(key, new Set())] as const)
  return { ...manifest, resources: Object.fromEntries(ordered) }
}

/**
 * `resource` with what it inherits from its flattened superclass, and its
 * claims-only overlays merged into the inherited properties they name. The
 * overlays are then the properties' own claims, so the flattened resource
 * records none.
 */
function flattenResource(resource: Resource, superclass: Resource | undefined): Resource {
  const { inheritedClaims, ...own } = resource
  const properties: Record<string, Property> = { ...own.properties }
  for (const [key, property] of Object.entries(superclass?.properties ?? {})) {
    if (Object.hasOwn(properties, key)) continue
    const claims = inheritedClaims !== undefined && Object.hasOwn(inheritedClaims, key)
    properties[key] = claims ? withClaims(property, inheritedClaims[key]) : property
  }
  const flattened: Resource = { ...own, properties }
  const identifiers = superclass?.identifiers
  return resource.identifiers !== undefined || identifiers === undefined
    ? flattened
    : { ...flattened, identifiers }
}

/**
 * An inherited property with the claims of an overlay in place of its own
 * (see `PropertyClaimsSchema`): each claim the overlay states replaces the
 * inherited one, and a marker also drops the inherited nullability and
 * resettability claims and native spelling.
 */
function withClaims(property: Property, claims: PropertyClaims | undefined): Property {
  if (claims === undefined) return property
  const { nullable, resettable, evidence, unsupported, native, ...declaration } = property
  if (claims.unsupported !== undefined) return { ...declaration, unsupported: claims.unsupported }
  const nullability =
    claims.nullable !== undefined || claims.evidence?.nullable !== undefined
      ? { nullable: claims.nullable, evidence: claims.evidence?.nullable }
      : { nullable, evidence: evidence?.nullable }
  const resettability =
    claims.resettable !== undefined || claims.evidence?.resettable !== undefined
      ? { resettable: claims.resettable, evidence: claims.evidence?.resettable }
      : { resettable, evidence: evidence?.resettable }
  const merged: Property = { ...declaration }
  if (native !== undefined) merged.native = native
  if (unsupported !== undefined) merged.unsupported = unsupported
  if (nullability.nullable !== undefined) merged.nullable = nullability.nullable
  if (resettability.resettable !== undefined) merged.resettable = resettability.resettable
  const mergedEvidence = {
    ...(nullability.evidence === undefined ? {} : { nullable: nullability.evidence }),
    ...(resettability.evidence === undefined ? {} : { resettable: resettability.evidence }),
  }
  if (Object.keys(mergedEvidence).length > 0) merged.evidence = mergedEvidence
  return merged
}

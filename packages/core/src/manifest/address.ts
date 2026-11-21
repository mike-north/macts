/**
 * Operation addresses describe navigation, independently of reference identity.
 * The same normalized path and refusal rules serve parsing, generation and
 * registration, so no consumer may guess an ancestor or item from argument order.
 */
import type { AppManifest } from './schemas/app.js'
import { CommandSchema, type Command, type AddressParent } from './schemas/command.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import { resolvePrimaryIdentifierProperty } from './identifier.js'
import { resolveCollectionAccessor } from './native-accessor.js'
import { resourceCommandEntries } from './resource-commands.js'
import { resolveManifestRoutes } from './route.js'
import { itemIdentifierParameter, selectsOneItem } from './item-selection.js'
import { PropertySchema } from './schemas/property.js'
import { ValidationError } from '@macts/contracts'

/** A path compiled from curated edges, with no executable expressions. @public */
export interface CommandAddress {
  /** Ancestors selected outside-in. */
  readonly parents: readonly AddressParent[]
  /** Collection of the target within the last selected ancestor. */
  readonly collection: string
  /** Explicit item binding, absent for collection operations. */
  readonly item?: { readonly by: 'identity' | 'index'; readonly parameter: string }
  /** Plural edges searched within the identified parent; never an app-wide fallback. */
  readonly traversal?: readonly string[]
}

/** A refusal at the manifest declaration responsible for it. @public */
export interface AddressIssue {
  readonly path: (string | number)[]
  readonly message: string
}

/** Validate position semantics after value validation and before governance or app access. @public */
export function assertAddressInput(
  address: CommandAddress | undefined,
  input: Readonly<Record<string, unknown>>
): void {
  const selections =
    address === undefined
      ? []
      : [...address.parents, ...(address.item === undefined ? [] : [address.item])]
  for (const { by, parameter } of selections) {
    if (by !== 'index') continue
    const value = input[parameter]
    const numeric =
      typeof value === 'number'
        ? value
        : value !== null &&
            typeof value === 'object' &&
            'integer' in value &&
            typeof value.integer === 'string'
          ? Number(value.integer)
          : NaN
    if (!Number.isSafeInteger(numeric) || numeric < 0) {
      throw new ValidationError('An address position must be a non-negative integer.', {
        issues: [{ path: [parameter], message: 'Expected a non-negative integer' }],
      })
    }
  }
}

/**
 * Normalize legacy scope without changing its sparse-hierarchy compatibility.
 * New paths are validated before consumption; their final edge is unique.
 * @public
 */
export function commandAddress(
  manifest: AppManifest,
  command: Command,
  resourceKey: string
): CommandAddress {
  const resource = manifest.resources[resourceKey]
  const parent = command.parent
  const parents =
    command.parents ??
    (parent === undefined
      ? []
      : [
          {
            ...parent,
            by: 'identity' as const,
            collection: resolveCollectionAccessor(
              manifest.resources[parent.resource] ?? { plural: parent.resource }
            ),
          },
        ])
  let children = manifest.hierarchy.children
  if (command.parents !== undefined) {
    for (const segment of parents) children = children[segment.collection]?.children ?? {}
  }
  const edge =
    command.parents === undefined
      ? undefined
      : Object.entries(children).find(([, child]) => child.resource === resourceKey)?.[0]
  const item = itemIdentifierParameter(command)
  return {
    parents,
    ...(command.identityTraversal === undefined
      ? {}
      : { traversal: command.identityTraversal.collections }),
    collection: edge ?? resolveCollectionAccessor(resource ?? { plural: resourceKey }),
    ...(selectsOneItem(command) && item !== undefined
      ? {
          item: command.item ?? {
            by: resource?.positional === undefined ? 'identity' : 'index',
            parameter: item.name,
          },
        }
      : {}),
  }
}

/** An ancestor's identifier namespace must agree with the context its usable get requires. */
function ancestorContextMatches(
  manifest: AppManifest,
  key: string,
  prefix: readonly AddressParent[]
): boolean {
  const reads = resourceCommandEntries(manifest, key).filter(
    ([, command]) => command.name === 'get'
  )
  const get = (reads.find(([, command]) => command.resolvesReferences !== false) ?? reads[0])?.[1]
  if (get === undefined || !CommandSchema.safeParse(get).success) return false
  const expected: { resource: string; by?: string }[] = commandAddress(
    manifest,
    get,
    key
  ).parents.map(({ resource, by }) => ({ resource, by }))
  let children = Object.values(manifest.hierarchy.children).find(
    ({ resource }) => resource === get.parent?.resource
  )?.children
  for (const edge of get.identityTraversal?.collections ?? []) {
    const child = children?.[edge]
    if (child === undefined) return false
    expected.push({ resource: child.resource })
    children = child.children
  }
  return (
    expected.length === prefix.length &&
    expected.every(
      (entry, index) =>
        entry.resource === prefix[index]?.resource &&
        (entry.by === undefined || entry.by === prefix[index].by)
    )
  )
}

/**
 * Validate only opted-in paths; existing single-parent contracts retain their
 * established validation. Raw-object consumers also reject malformed modes.
 * @public
 */
export function findAddressIssues(manifest: AppManifest): AddressIssue[] {
  const issues: AddressIssue[] = []
  for (const [key, command] of Object.entries(manifest.commands)) {
    if (
      (command.parents !== undefined ||
        command.item !== undefined ||
        command.identityTraversal !== undefined ||
        command.resolvesReferences !== undefined) &&
      !CommandSchema.safeParse(command).success
    ) {
      issues.push({
        path: ['commands', key],
        message: `Command "${key}" has malformed address or command metadata.`,
      })
    }
    if (
      manifest.version === '1.0' &&
      (command.parents !== undefined ||
        command.item !== undefined ||
        command.resolvesReferences !== undefined ||
        command.identityTraversal !== undefined)
    ) {
      issues.push({
        path: ['commands', key],
        message: `Command "${key}" uses explicit address metadata, which requires manifest format 1.1.`,
      })
    }
  }
  for (const [key, resource] of Object.entries(manifest.resources)) {
    for (const [name, property] of Object.entries(resource.properties)) {
      if (property.separateRead !== undefined && !PropertySchema.safeParse(property).success) {
        issues.push({
          path: ['resources', key, 'properties', name],
          message: 'Malformed separate-read metadata.',
        })
      }
      if (manifest.version === '1.0' && property.separateRead !== undefined) {
        issues.push({
          path: ['resources', key, 'properties', name],
          message: `Separate-read metadata requires manifest format 1.1.`,
        })
      }
    }
  }
  for (const { commandKey, command, resourceType } of resolveManifestRoutes(manifest)) {
    if (!CommandSchema.safeParse(command).success) continue
    if (command.identityTraversal !== undefined) {
      const parent = command.parent
      const roots = Object.values(manifest.hierarchy.children).filter(
        ({ resource }) => resource === parent?.resource
      )
      const resource = parent === undefined ? undefined : manifest.resources[parent.resource]
      const id = resolvePrimaryIdentifierProperty(resource)
      const parameter = command.parameters.find(({ name }) => name === parent?.parameter)
      const get =
        parent === undefined
          ? undefined
          : resourceCommandEntries(manifest, parent.resource).find(
              ([, entry]) => entry.name === 'get'
            )?.[1]
      let valid =
        roots.length === 1 &&
        resource !== undefined &&
        resource.unsupported === undefined &&
        resource.roots === undefined &&
        id !== undefined &&
        get !== undefined &&
        get.parent === undefined &&
        get.parents === undefined &&
        parameter?.required === true &&
        parameter.nullable !== true &&
        parameter.type === resource.properties[id]?.type
      let children = roots[0]?.children
      for (const edge of command.identityTraversal.collections) {
        const child = children?.[edge]
        const branch = child === undefined ? undefined : manifest.resources[child.resource]
        valid =
          valid &&
          branch !== undefined &&
          branch.unsupported === undefined &&
          branch.roots === undefined
        children = child?.children
      }
      if (
        !valid ||
        command.name !== 'get' ||
        parent === undefined ||
        command.parents !== undefined ||
        Object.values(children ?? {}).filter(({ resource }) => resource === resourceType).length !==
          1
      ) {
        issues.push({
          path: ['commands', commandKey, 'identityTraversal'],
          message: `Identity traversal needs an identified parent and a declared complete collection path to its get target.`,
        })
      }
    }
    if (command.parents === undefined && command.item === undefined) continue
    const base = ['commands', commandKey]
    const refuse = (message: string, field = 'parents'): void => {
      issues.push({
        path: [...base, field],
        message: `Command "${commandKey}" address: ${message}`,
      })
    }
    const shape = CommandSchema.safeParse(command)
    if (!shape.success) {
      refuse('unknown or malformed selection binding.')
      continue
    }
    if (command.parent !== undefined) refuse('parent and parents are mutually exclusive.')
    if (
      command.parents?.some(({ by }) => by === 'index') &&
      command.resolvesReferences !== false &&
      ['get', 'list'].includes(command.name)
    ) {
      refuse(
        'mixed paths require resolvesReferences: false; positions cannot be identity containers.'
      )
    }
    if (
      command.scope !== 'resource' ||
      resourceType === undefined ||
      command.parents === undefined
    ) {
      refuse('explicit selection requires a resource command with parents.')
      continue
    }
    if (selectsOneItem(command) !== (command.item !== undefined))
      refuse('item binding must be present exactly for an item operation.', 'item')
    const used = new Set<string>()
    const check = (selection: { by: string; parameter: string }, key: string): void => {
      const resource = manifest.resources[key]
      const parameter = command.parameters.find(({ name }) => name === selection.parameter)
      const id = resolvePrimaryIdentifierProperty(resource)
      const expected =
        selection.by === 'index'
          ? 'integer'
          : id === undefined
            ? undefined
            : resource?.properties[id]?.type
      if (used.has(selection.parameter))
        refuse(`selection parameter "${selection.parameter}" is reused.`)
      used.add(selection.parameter)
      if (
        resource === undefined ||
        resource.unsupported !== undefined ||
        resource.roots !== undefined ||
        !resourceCommandEntries(manifest, key).some(([, command]) => command.name === 'get') ||
        expected === undefined ||
        (selection.by === 'index' && resource.positional === undefined) ||
        parameter?.required !== true ||
        parameter.nullable === true ||
        parameter.type !== expected
      ) {
        refuse(
          `"${key}" requires a supported collection, usable get and required non-null ${selection.by} parameter of the matching type.`
        )
      }
    }
    let children: Record<string, HierarchyChild> = manifest.hierarchy.children
    for (const [index, segment] of command.parents.entries()) {
      const edge = children[segment.collection]
      if (edge?.resource !== segment.resource)
        refuse(`edge "${segment.collection}" does not reach "${segment.resource}" in this order.`)
      check(segment, segment.resource)
      if (!ancestorContextMatches(manifest, segment.resource, command.parents.slice(0, index))) {
        refuse(
          `ancestor "${segment.resource}" requires different identity context through its get.`
        )
      }
      children = edge?.children ?? {}
    }
    if (Object.values(children).filter(({ resource }) => resource === resourceType).length !== 1) {
      refuse(`target "${resourceType}" needs exactly one final containment edge.`)
    }
    if (command.item !== undefined) check(command.item, resourceType)
  }
  return issues
}

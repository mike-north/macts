/**
 * Operation addresses describe navigation, independently of reference identity.
 * The same normalized path and refusal rules serve parsing, generation and
 * registration, so no consumer may guess an ancestor or item from argument order.
 */
import { addressNormalization, normalizeManifestAddresses } from './normalize-addresses.js'
import type { AppManifest } from './schemas/app.js'
import {
  CommandSchema,
  type Command,
  type AddressParent,
  type CommandParameter,
} from './schemas/command.js'
import type { Resource } from './schemas/resource.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import { resolvePrimaryIdentifierProperty, resolveIdentifierTargeting } from './identifier.js'
import { resolveCollectionAccessor } from './native-accessor.js'
import { commandParents, resourceCommandEntries } from './resource-commands.js'
import { callableSurfaceIssues } from './callable-commands.js'
import { outputProperties, outputPropertyContainers } from './output-references.js'
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
 * The operation plan for canonical 1.1 paths or sparse 1.0 scope. Raw 1.1
 * commands pass through the shared normalizer before their path is read.
 * Validated paths have one final containment edge.
 * @public
 */
export function commandAddress(
  manifest: AppManifest,
  command: Command,
  resourceKey: string
): CommandAddress {
  if (manifest.version === '1.1') {
    const canonical = normalizeManifestAddresses({ ...manifest, commands: { operation: command } })
      .commands['operation']
    if (canonical === undefined)
      throw new ValidationError('Missing operation address.', {
        issues: [{ path: [], message: 'Expected a normalized operation.' }],
      })
    command = canonical
  }
  const resource = manifest.resources[resourceKey]
  // Plans have one stable field order regardless of how source objects were constructed.
  const parents = commandParents(manifest, command).map(
    ({ resource, collection, by, parameter }) => ({
      resource,
      collection,
      by,
      parameter,
    })
  )
  let children = manifest.hierarchy.children
  if (manifest.version === '1.1') {
    for (const segment of parents) children = children[segment.collection]?.children ?? {}
  }
  const edge =
    manifest.version === '1.0' || parents.length === 0
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
    ({ resource }) => resource === commandAddress(manifest, get, key).parents.at(-1)?.resource
  )?.children
  for (const edge of get.identityTraversal?.collections ?? []) {
    const child = children?.[edge]
    if (child === undefined) return false
    expected.push({ resource: child.resource })
    children = child.children
  }
  // Re-entering the same identified resource does not add an identity namespace.
  // Other ancestors, including all required canonical context, must still agree.
  const context = prefix.filter(({ resource, by }) => resource !== key || by !== 'identity')
  return (
    expected.length === context.length &&
    expected.every((entry, index) => {
      const selected = context.at(index)
      if (selected === undefined) return false
      return (
        entry.resource === selected.resource && (entry.by === undefined || entry.by === selected.by)
      )
    })
  )
}

/**
 * Whether a command is a non-CRUD resource command acting on one item, which
 * may select that item by the same scoped identity search an identity get
 * declares. Such a command sends the found item to the app as its direct
 * parameter, so its other inputs are action arguments rather than selectors.
 * List, create, get, update and delete keep their dedicated selection shapes,
 * and a property-backed convenience assigns through the update body, so none
 * of them qualifies.
 */
function actsOnTraversedItem(command: Command): boolean {
  return (
    command.scope === 'resource' &&
    command.assignsProperty === undefined &&
    !['list', 'create', 'get', 'update', 'delete'].includes(command.name) &&
    selectsOneItem(command)
  )
}

/** Selection inputs are required, non-null and match the selected identifier or position domain. */
function selectionParameterMatches(
  resource: Resource | undefined,
  parameter: CommandParameter | undefined,
  by: string
): boolean {
  const id = resolvePrimaryIdentifierProperty(resource)
  const expected =
    by === 'index' ? 'integer' : id === undefined ? undefined : resource?.properties[id]?.type
  return (
    parameter?.required === true &&
    parameter.nullable !== true &&
    expected !== undefined &&
    parameter.type === expected
  )
}

/**
 * Format 1.1 validates normalized selections independently of their spelling.
 * Format 1.0 retains its established single-parent and sparse-hierarchy rules.
 * @public
 */
export function findAddressIssues(manifest: AppManifest): AddressIssue[] {
  const normalized = addressNormalization(manifest)
  if (normalized.issues.length > 0) return normalized.issues
  manifest = normalized.manifest
  const issues: AddressIssue[] = []
  // A 1.1 declaration may advertise only methods present on every client surface.
  for (const { key, message } of callableSurfaceIssues(manifest))
    issues.push({ path: ['commands', key], message })
  for (const [key, command] of Object.entries(manifest.commands)) {
    const metadata =
      command.parents !== undefined ||
      command.item !== undefined ||
      command.identityTraversal !== undefined ||
      command.resolvesReferences !== undefined
    if ((manifest.version === '1.1' || metadata) && !CommandSchema.safeParse(command).success) {
      issues.push({
        path: ['commands', key],
        message: `Command "${key}" has malformed address or command metadata.`,
      })
    }
    if (manifest.version === '1.0' && metadata) {
      issues.push({
        path: ['commands', key],
        message: `Command "${key}" uses explicit address metadata, which requires manifest format 1.1.`,
      })
    }
  }
  for (const [key, resource] of Object.entries(manifest.resources)) {
    const identityProperties = [
      resolvePrimaryIdentifierProperty(resource),
      resolveIdentifierTargeting(resource)?.property,
    ]
    for (const [name, property] of Object.entries(resource.properties)) {
      // Ordinary records require identity and effective targeting reads under their own authority.
      if (property.separateRead !== undefined && identityProperties.includes(name)) {
        issues.push({
          path: ['resources', key, 'properties', name],
          message: 'Identity and targeting properties cannot use separate-read authority.',
        })
      }
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
    const address =
      resourceType === undefined ? undefined : commandAddress(manifest, command, resourceType)
    const parents = address?.parents ?? commandParents(manifest, command)
    // Read inputs follow selection semantics, independently of the address spelling.
    // An item command's action arguments are its own inputs, never selectors.
    if (
      (command.identityTraversal !== undefined && !actsOnTraversedItem(command)) ||
      (command.name === 'list' && manifest.version === '1.1' && parents.length > 0)
    ) {
      const selectors = new Set([
        ...parents.map(({ parameter }) => parameter),
        ...(command.name === 'get' ? [itemIdentifierParameter(command)?.name] : []),
      ])
      if (command.parameters.some(({ name }) => !selectors.has(name))) {
        issues.push({
          path: ['commands', commandKey, 'parameters'],
          message: `Command "${commandKey}": identity-traversal reads and scoped format 1.1 lists cannot declare non-selection inputs.`,
        })
      }
    }
    if (command.identityTraversal !== undefined) {
      const parent = parents[0]
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
        parents.length === 1 &&
        parent?.by === 'identity' &&
        roots.length === 1 &&
        resource !== undefined &&
        resource.unsupported === undefined &&
        resource.roots === undefined &&
        id !== undefined &&
        get !== undefined &&
        commandAddress(manifest, get, parent.resource).parents.length === 0 &&
        parameter?.required === true &&
        parameter.nullable !== true &&
        parameter.type === resource.properties[id]?.type &&
        selectionParameterMatches(
          resourceType === undefined ? undefined : manifest.resources[resourceType],
          itemIdentifierParameter(command),
          'identity'
        )
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
        (command.name !== 'get' && !actsOnTraversedItem(command)) ||
        parent === undefined ||
        Object.values(children ?? {}).filter(({ resource }) => resource === resourceType).length !==
          1
      ) {
        issues.push({
          path: ['commands', commandKey, 'identityTraversal'],
          message: `Identity traversal needs an identified parent, a declared complete collection path, and a required non-null item parameter matching the target identifier type.`,
        })
      }
    }
    const base = ['commands', commandKey]
    const refuse = (message: string, field = 'parents'): void => {
      issues.push({
        path: [...base, field],
        message: `Command "${commandKey}" address: ${message}`,
      })
    }
    // A retained field's identity namespace must come from this read, never another route.
    const resource = resourceType === undefined ? undefined : manifest.resources[resourceType]
    if (
      manifest.version === '1.1' &&
      resourceType !== undefined &&
      address !== undefined &&
      resource !== undefined &&
      ['get', 'list'].includes(command.name)
    ) {
      const available = address.parents
        .filter(({ by }) => by === 'identity')
        .map(({ resource }) => resource)
      if (resolvePrimaryIdentifierProperty(resource) !== undefined) available.push(resourceType)
      for (const [name, property] of outputProperties(manifest, resourceType, resource)) {
        // Match inside-out, like reference encoding: a row supplies its id, not its namespace.
        let before = available.length - 1
        for (const container of outputPropertyContainers(manifest, property).reverse()) {
          const index = available.lastIndexOf(container, before)
          if (before < 0 || index < 0) {
            refuse(
              `field "${name}" requires identified container "${container}" in this read path.`
            )
            break
          }
          before = index - 1
        }
      }
    }
    // Unscoped roots retain their own contract; scoped 1.1 commands have only explicit bindings.
    if (manifest.version === '1.0') continue
    if (command.item !== undefined && command.parents === undefined)
      refuse('an item binding requires parents.', 'item')
    if (parents.length === 0) continue
    if (
      address?.parents.some(({ by }) => by === 'index') &&
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
      address === undefined ||
      parents.length === 0
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
      if (used.has(selection.parameter))
        refuse(`selection parameter "${selection.parameter}" is reused.`)
      used.add(selection.parameter)
      if (
        resource === undefined ||
        resource.unsupported !== undefined ||
        resource.roots !== undefined ||
        !resourceCommandEntries(manifest, key).some(([, command]) => command.name === 'get') ||
        (selection.by === 'index' && resource.positional === undefined) ||
        !selectionParameterMatches(resource, parameter, selection.by)
      ) {
        refuse(
          `"${key}" requires a supported collection, usable get and required non-null ${selection.by} parameter of the matching type.`
        )
      }
    }
    let children: Record<string, HierarchyChild> = manifest.hierarchy.children
    for (const [index, segment] of address.parents.entries()) {
      const edge = children[segment.collection]
      if (edge?.resource !== segment.resource)
        refuse(`edge "${segment.collection}" does not reach "${segment.resource}" in this order.`)
      check(segment, segment.resource)
      if (!ancestorContextMatches(manifest, segment.resource, address.parents.slice(0, index))) {
        refuse(
          `ancestor "${segment.resource}" requires different identity context through its get.`
        )
      }
      children = edge?.children ?? {}
    }
    for (const edge of address.traversal ?? []) children = children[edge]?.children ?? {}
    if (Object.values(children).filter(({ resource }) => resource === resourceType).length !== 1) {
      refuse(`target "${resourceType}" needs exactly one final containment edge.`)
    }
    const item = command.item
    if (item !== undefined) check(item, resourceType)
  }
  return issues
}

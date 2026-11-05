/**
 * Resources whose objects are found by their position within their parent.
 *
 * Some app objects have no identifier: the app addresses each one only as an
 * element of its container, by position (an iTerm tab within its window). A
 * manifest marks such a resource `positional`, with curated evidence
 * (`ResourcePositionalSchema`); nothing is inferred from a missing
 * identifier. Then:
 *
 * - its `get`, `update` and `delete` find their item at the zero-based
 *   position their item parameter carries, within the parent the command
 *   records, as `parent[collection].at(index)`, and a position the
 *   collection does not reach is an invalid selection;
 * - a reference to one of its objects is an index selector within the object
 *   its parent is, and a native read emits that form at an output position
 *   whose record is the parent (phases/13 D7, "Emitted forms").
 *
 * This module states the marker's rule once, for the manifest schema, for
 * generation (`generationRefusals`) and for operation registration, so each
 * refuses the same manifests, and answers whether a resource is positional
 * for the native bodies, the codec's addressing and the output rule.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D7, §D10
 */

import type { AppManifest } from './schemas/app.js'
import type { Command } from './schemas/command.js'
import { placedEntries, type PlacedEntry } from './hierarchy-placement.js'
import { resolvePrimaryIdentifierProperty } from './identifier.js'
import { itemIdentifierParameter, selectsOneItem } from './item-selection.js'
import { CRUD_OPERATIONS, resourceCommandEntries, resolvingCommand } from './resource-commands.js'
import { isUnsupportedResourceKey } from './unsupported.js'
import { resolveManifestRoutes } from './route.js'

/**
 * Whether the objects of `resourceKey` are found by their position within
 * their parent: the resource is declared, usable, and marked `positional`.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the resource.
 */
export function isPositional(manifest: AppManifest, resourceKey: string): boolean {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  return resource?.positional !== undefined && !isUnsupportedResourceKey(manifest, resourceKey)
}

/** A manifest issue, at its path in the manifest. */
export interface PositionalIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/**
 * A recorded parent supplies one identity, with no ancestor arguments. It must
 * therefore be an ordinary identified collection item resolved at application
 * scope. Sparse placement is unknown; known nested-only placement contradicts
 * that address even when its get omits the missing ancestor. Conversely, an
 * explicit get ancestor cannot be discarded merely because a top-level entry
 * also exists: metadata does not establish globally equivalent identities.
 */
function parentProblem(
  manifest: AppManifest,
  resourceKey: string,
  placements: readonly PlacedEntry[]
): string | undefined {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  if (
    resource === undefined ||
    isUnsupportedResourceKey(manifest, resourceKey) ||
    isPositional(manifest, resourceKey) ||
    resource.roots !== undefined ||
    resolvePrimaryIdentifierProperty(resource) === undefined
  ) {
    return 'needs an ordinary collection parent with a primary identifier and a usable get'
  }
  const get = resolvingCommand(manifest, resourceKey, 'get')
  if (get === undefined) return 'needs a primary identifier and a usable get'
  if (get[1].parent !== undefined) {
    return `is found within "${get[1].parent.resource}"; nested parents are not supported yet`
  }
  const holders = placements.filter(({ child }) => child.resource === resourceKey)
  if (holders.length > 0 && !holders.some(({ holder }) => holder === undefined)) {
    return 'has a hierarchy placing its collection only within a parent; missing ancestor context is not supported'
  }
  return undefined
}

/**
 * Validate the supplied parent identity as well as the parent's address. Raw
 * generation/registration callers must meet the same data contract as parsed
 * manifests; hierarchy never supplies a missing command argument.
 */
function recordedParentIssue(
  manifest: AppManifest,
  commandKey: string,
  command: Command,
  placements: readonly PlacedEntry[]
): PositionalIssue | undefined {
  if (command.parent === undefined) return undefined
  const parameter = command.parameters.find(({ name }) => name === command.parent?.parameter)
  const problem =
    parameter === undefined || parameter.required !== true
      ? 'needs its declared required parent parameter'
      : parentProblem(manifest, command.parent.resource, placements)
  if (problem === undefined) return undefined
  return {
    message: `The ${command.name} command "${commandKey}" records parent "${command.parent.resource}", which ${problem}.`,
    path: ['commands', commandKey, 'parent'],
  }
}

/**
 * What is wrong with one positional resource's commands: its `get` must exist
 * and record a parent the app finds at the application by its identifier, and
 * every CRUD address must agree with known containment and supply a qualified
 * parent identity. Item commands additionally record the resolving get's parent
 * and select the item by an integer position.
 */
function commandIssues(
  manifest: AppManifest,
  resourceKey: string,
  placements: readonly PlacedEntry[]
): PositionalIssue[] {
  const at = ['resources', resourceKey, 'positional']
  const get = resolvingCommand(manifest, resourceKey, 'get')
  if (get === undefined) {
    return [
      {
        message: `A positional resource is found by its position within its parent, through its get, so "${resourceKey}" needs a get that records that parent.`,
        path: at,
      },
    ]
  }
  const [getKey, getCommand] = get
  const parent = getCommand.parent?.resource
  const issues: PositionalIssue[] = []
  if (parent === undefined) {
    issues.push({
      message: `A positional resource is found by its position within its parent, so the get "${getKey}" of "${resourceKey}" must record that parent.`,
      path: at,
    })
  }
  for (const [commandKey, command] of resourceCommandEntries(manifest, resourceKey)) {
    if (!CRUD_OPERATIONS.some((operation) => operation === command.name)) continue
    const qualification = recordedParentIssue(manifest, commandKey, command, placements)
    if (qualification !== undefined) issues.push(qualification)
    const containment = collectionPlacementIssue(commandKey, command, resourceKey, placements)
    if (containment !== undefined) issues.push(containment)
    if (parent !== undefined && selectsOneItem(command) && command.parent?.resource !== parent) {
      // Its body finds the item within the parent the command records, so a
      // command recording none, or another, could not find it.
      issues.push({
        message: `The ${command.name} command "${commandKey}" selects an item of the positional resource "${resourceKey}" within its parent, so it must record the parent "${parent}", as the get "${getKey}" does.`,
        path: ['commands', commandKey, 'parent'],
      })
    }
    const position = positionParameterIssue(commandKey, command, resourceKey)
    if (position !== undefined) issues.push(position)
  }
  return issues
}

/**
 * Every positional CRUD route addresses the collection at its recorded
 * parent, or at the application when it records none. A usable hierarchy
 * placement is evidence of where that collection exists; no placement leaves
 * existing sparse-manifest behavior unchanged.
 */
function collectionPlacementIssue(
  commandKey: string,
  command: Command,
  resourceKey: string,
  placements: readonly PlacedEntry[]
): PositionalIssue | undefined {
  const holders = placements
    .filter(({ child }) => child.resource === resourceKey)
    .map(({ holder }) => holder)
  if (holders.length === 0) return undefined
  const parent = command.parent?.resource
  if (holders.includes(parent)) return undefined
  return {
    message:
      parent === undefined
        ? `The ${command.name} command "${commandKey}" addresses the positional resource "${resourceKey}" at the application, but its hierarchy places the collection only within a parent. Record a declared parent.`
        : `The ${command.name} command "${commandKey}" addresses the positional resource "${resourceKey}" within "${parent}", but its hierarchy does not place the collection there.`,
    path:
      parent === undefined
        ? ['commands', commandKey, 'parent']
        : ['commands', commandKey, 'parent', 'resource'],
  }
}

/**
 * A positional item requires a declared, non-null integer parameter. Item
 * selection also refuses a missing one at generation and registration; this
 * shared rule holds at the manifest schema as well.
 */
function positionParameterIssue(
  commandKey: string,
  command: Command,
  resourceKey: string
): PositionalIssue | undefined {
  if (!selectsOneItem(command)) return undefined
  const parameter = itemIdentifierParameter(command)
  if (parameter === undefined) {
    const besides =
      command.parent === undefined ? '' : ` besides its parent's "${command.parent.parameter}"`
    return {
      message: `The ${command.name} command "${commandKey}" selects an item of the positional resource "${resourceKey}" by its zero-based position, so it must declare a required integer item parameter${besides}.`,
      path: ['commands', commandKey, 'parameters'],
    }
  }
  const index = command.parameters.indexOf(parameter)
  if (parameter.type === 'integer' && parameter.nullable === true) {
    return {
      message: `The ${command.name} command "${commandKey}" selects an item of the positional resource "${resourceKey}" by its zero-based position, so its item parameter "${parameter.name}" cannot be nullable.`,
      path: ['commands', commandKey, 'parameters', index, 'nullable'],
    }
  }
  if (parameter.type === 'integer') return undefined
  return {
    message: `The ${command.name} command "${commandKey}" selects an item of the positional resource "${resourceKey}" by its zero-based position, so its item parameter "${parameter.name}" must be of type integer.`,
    path: ['commands', commandKey, 'parameters', index, 'type'],
  }
}

/**
 * Every issue with the `positional` markers of a manifest read flattened, in
 * declaration order: a marked resource with a primary identifier, which is
 * found by that identifier instead, the issues of its commands
 * ({@link commandIssues}), and any executable command that records a positional
 * resource as its parent. A body binds its parent by the parent's identifier
 * (`recordedParentScope`), and a positional resource has none, so such a
 * command is refused until native binding supports positional parents. The
 * manifest schema reports them at their paths;
 * generation and registration refuse by them too ({@link positionalProblems}).
 *
 * @param manifest - The manifest, as validation reads it after flattening.
 */
export function findPositionalIssues(manifest: AppManifest): PositionalIssue[] {
  const issues: PositionalIssue[] = []
  const placements = placedEntries(manifest)
  for (const [resourceKey, resource] of Object.entries(manifest.resources)) {
    if (resource.positional === undefined || resource.unsupported !== undefined) continue
    const identifier = resolvePrimaryIdentifierProperty(resource)
    if (identifier !== undefined) {
      issues.push({
        message: `"${resourceKey}" is found by its primary identifier "${identifier}", so it cannot also be positional: a positional resource has no identifier. Remove positional, or the identifier.`,
        path: ['resources', resourceKey, 'positional'],
      })
      continue
    }
    issues.push(...commandIssues(manifest, resourceKey, placements))
  }
  // Route expansion owns executable target semantics, including app scope and
  // scalar, array and omitted resource targets. Check each command only once.
  const commands = new Map(
    resolveManifestRoutes(manifest).map(({ commandKey, command }) => [commandKey, command])
  )
  for (const [commandKey, command] of commands) {
    const parent = command.parent?.resource
    if (parent === undefined || !isPositional(manifest, parent)) continue
    issues.push({
      message: `The command "${commandKey}" records the positional resource "${parent}" as its parent, but a parent is found by its identifier and "${parent}" has none. Commands under a positional parent are not supported yet.`,
      path: ['commands', commandKey, 'parent'],
    })
  }
  return issues
}

/**
 * Why a manifest's `positional` markers refuse it, one reason per issue
 * ({@link findPositionalIssues}), each naming the resource or command. The
 * generators and operation registration prefix each with the app and what is
 * refused, as they do the item-selection rule's.
 *
 * @param manifest - The app manifest.
 * @returns The reasons, empty when every marker holds.
 */
export function positionalProblems(manifest: AppManifest): string[] {
  return findPositionalIssues(manifest).map(({ message }) => message)
}

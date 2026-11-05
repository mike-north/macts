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
import { resolvePrimaryIdentifierProperty } from './identifier.js'
import { itemIdentifierParameter, selectsOneItem } from './item-selection.js'
import { resourceCommandEntries, resolvingCommand } from './resource-commands.js'
import { isUnsupportedResourceKey } from './unsupported.js'

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
 * Whether the app finds an object of `resourceKey` by its identifier, level by
 * level: it has a primary identifier, is not positional, has a usable `get`,
 * and, when that `get` records a parent, the parent is found the same way. A
 * chain of parents that comes back to a resource already in it has no
 * top-level container to start from.
 */
function foundByIdentifier(
  manifest: AppManifest,
  resourceKey: string,
  seen: ReadonlySet<string> = new Set()
): boolean {
  const resource = Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]
    : undefined
  if (resource === undefined || seen.has(resourceKey) || isPositional(manifest, resourceKey)) {
    return false
  }
  if (resolvePrimaryIdentifierProperty(resource) === undefined) return false
  const get = resolvingCommand(manifest, resourceKey, 'get')
  if (get === undefined) return false
  const parent = get[1].parent?.resource
  return (
    parent === undefined || foundByIdentifier(manifest, parent, new Set([...seen, resourceKey]))
  )
}

/**
 * What is wrong with one positional resource's commands: its `get` must exist
 * and record a parent the app finds by its identifier, and every command that
 * selects one of its items must select it by an integer position.
 */
function commandIssues(manifest: AppManifest, resourceKey: string): PositionalIssue[] {
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
  } else if (!foundByIdentifier(manifest, parent)) {
    issues.push({
      message: `A positional resource is counted within a parent the app finds by its identifier, but "${parent}", the parent the get "${getKey}" of "${resourceKey}" records, is not: it needs a primary identifier and a get, and so does each parent above it.`,
      path: at,
    })
  }
  for (const [commandKey, command] of resourceCommandEntries(manifest, resourceKey)) {
    const position = positionParameterIssue(commandKey, command, resourceKey)
    if (position !== undefined) issues.push(position)
  }
  return issues
}

/** The issue of an item command of a positional resource whose item parameter is not an integer. */
function positionParameterIssue(
  commandKey: string,
  command: Command,
  resourceKey: string
): PositionalIssue | undefined {
  if (!selectsOneItem(command)) return undefined
  const parameter = itemIdentifierParameter(command)
  // A command that declares no item parameter is refused by item selection.
  if (parameter === undefined || parameter.type === 'integer') return undefined
  const index = command.parameters.indexOf(parameter)
  return {
    message: `The ${command.name} command "${commandKey}" selects an item of the positional resource "${resourceKey}" by its zero-based position, so its item parameter "${parameter.name}" must be of type integer.`,
    path: ['commands', commandKey, 'parameters', index, 'type'],
  }
}

/**
 * Every issue with the `positional` markers of a manifest read flattened, in
 * declaration order: a marked resource with a primary identifier, which is
 * found by that identifier instead, and the issues of its commands
 * ({@link commandIssues}). The manifest schema reports them at their paths;
 * generation and registration refuse by them too ({@link positionalProblems}).
 *
 * @param manifest - The manifest, as validation reads it after flattening.
 */
export function findPositionalIssues(manifest: AppManifest): PositionalIssue[] {
  const issues: PositionalIssue[] = []
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
    issues.push(...commandIssues(manifest, resourceKey))
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

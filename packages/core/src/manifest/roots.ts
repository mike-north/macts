/**
 * Singleton roots: resources whose one object the app holds as a property of
 * the application itself, rather than as an element of a collection (an app's
 * front desk, which it reaches as its `frontDesk` property).
 *
 * A root's object is found by reading that property, so it needs no
 * identifier and no collection. Its only standard command is a get, which
 * takes no identifier. No reference names a root yet: a reference carries an
 * identity value, and a root has none. Every surface asks this module whether
 * a resource is a root, and the manifest rules for a root's commands, parents
 * and hierarchy entries are checked here.
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { AppManifest } from './schemas/app.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import type { ResourceRoot } from './schemas/resource.js'
import { CRUD_OPERATIONS, commandAppliesToResource } from './resource-commands.js'

/**
 * The application property that holds the one object of `resourceKey`, with
 * its evidence, or `undefined` when the resource is reached through a
 * collection or the manifest does not declare it.
 *
 * @param manifest - The app manifest.
 * @param resourceKey - The manifest key of the resource.
 */
export function resolveRoot(
  manifest: Pick<AppManifest, 'resources'>,
  resourceKey: string
): ResourceRoot | undefined {
  return Object.hasOwn(manifest.resources, resourceKey)
    ? manifest.resources[resourceKey]?.root
    : undefined
}

/** A manifest issue: what is wrong, and where in the manifest. */
interface RootIssue {
  readonly message: string
  readonly path: (string | number)[]
}

/**
 * The issues of the manifest's singleton roots that span more than the root
 * resource itself:
 *
 * - The only standard command of a root is its get: a list, create, update
 *   or delete that applies to it has no collection or identity to act on.
 * - That get reads the application property, so it takes no required
 *   parameter (nothing identifies the object) and records no parent.
 * - No command records a root as its parent: a parent is found from an
 *   identifier the command carries, which a root does not have.
 * - No hierarchy entry names a root: each entry is a collection.
 */
export function findRootIssues(
  manifest: Pick<AppManifest, 'resources' | 'commands' | 'hierarchy'>
): RootIssue[] {
  const issues: RootIssue[] = []
  const roots = Object.entries(manifest.resources).flatMap(([key, resource]) =>
    resource.root === undefined ? [] : [[key, resource.root.property] as const]
  )
  if (roots.length === 0) return issues
  const standard: readonly string[] = CRUD_OPERATIONS

  for (const [commandKey, command] of Object.entries(manifest.commands)) {
    for (const [rootKey, property] of roots) {
      if (!commandAppliesToResource(command, rootKey)) continue
      if (command.name !== 'get' && standard.includes(command.name)) {
        issues.push({
          message: `"${rootKey}" is the application's "${property}" property, a single object, so its only standard command is a get; remove the ${command.name}.`,
          path: ['commands', commandKey, 'name'],
        })
        continue
      }
      if (command.name !== 'get') continue
      const required = command.parameters.find((parameter) => parameter.required)
      if (required !== undefined) {
        issues.push({
          message: `The get of "${rootKey}" reads the application's "${property}" property, so it takes no required parameter; make "${required.name}" optional or remove it.`,
          path: ['commands', commandKey, 'parameters'],
        })
      }
      if (command.parent !== undefined) {
        issues.push({
          message: `The get of "${rootKey}" reads the application's "${property}" property, so it records no parent; remove parent.`,
          path: ['commands', commandKey, 'parent'],
        })
      }
    }
    const parent = command.parent?.resource
    const parentRoot = roots.find(([rootKey]) => rootKey === parent)
    if (parentRoot !== undefined) {
      issues.push({
        message: `"${parentRoot[0]}" is the application's "${parentRoot[1]}" property, which has no identifier to carry in a parameter, so it cannot be a parent yet.`,
        path: ['commands', commandKey, 'parent', 'resource'],
      })
    }
  }

  const visit = (children: Record<string, HierarchyChild>, path: (string | number)[]): void => {
    for (const [key, child] of Object.entries(children)) {
      const root = roots.find(([rootKey]) => rootKey === child.resource)
      if (root !== undefined) {
        issues.push({
          message: `"${root[0]}" is the application's "${root[1]}" property, not a collection, so no hierarchy entry names it.`,
          path: [...path, key, 'resource'],
        })
      }
      if (child.children !== undefined) visit(child.children, [...path, key, 'children'])
    }
  }
  visit(manifest.hierarchy.children, ['hierarchy', 'children'])
  return issues
}

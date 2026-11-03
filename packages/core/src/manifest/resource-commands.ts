/**
 * The commands of a resource, as the manifest declares them: which commands
 * apply to a resource, which of them backs each standard CRUD shape, and which
 * one resolves references to the resource.
 *
 * Which command resolves a resource is manifest knowledge, not generation. The
 * generators read it to decide the contract's resource table and the input
 * satisfiability judgment, and the native executor reads it to decide whether
 * an object a reference names can be addressed at the application. All of them
 * ask this module, so the command that resolves a reference is chosen in one
 * place and every surface agrees on it.
 *
 * Everything here is pure and returns manifest data. Commands and resources
 * marked unsupported never appear (see `./unsupported.ts`).
 *
 * Internal to this package: nothing here is part of the public entry.
 */

import type { AppManifest } from './schemas/app.js'
import type { Command } from './schemas/command.js'
import { isUnsupportedResourceKey, usableCommands } from './unsupported.js'

/**
 * The standard CRUD shapes. A resource command's `name` says which shape (if
 * any) it fulfils; its key in `manifest.commands` is what addresses its route.
 */
export const CRUD_OPERATIONS = ['list', 'get', 'create', 'update', 'delete'] as const

/** One of the standard CRUD shapes. */
export type CrudOperation = (typeof CRUD_OPERATIONS)[number]

/**
 * Whether a resource-scoped command applies to a resource: it names the
 * resource in `resourceType`, or omits `resourceType` and so applies to every
 * resource. This is the same rule the route derivation uses, so every client
 * method has a route.
 */
export function commandAppliesToResource(cmd: Command, resourceName: string): boolean {
  if (cmd.scope !== 'resource') return false
  if (cmd.resourceType === undefined) return true
  if (Array.isArray(cmd.resourceType)) return cmd.resourceType.includes(resourceName)
  return cmd.resourceType === resourceName
}

/**
 * The commands that apply to a resource, as `[commandKey, command]` pairs in
 * manifest declaration order. None apply to a resource marked unsupported,
 * which has no routes, and none is marked unsupported itself.
 */
export function resourceCommandEntries(
  manifest: AppManifest,
  resourceName: string
): [string, Command][] {
  if (isUnsupportedResourceKey(manifest, resourceName)) return []
  return usableCommands(manifest).filter(([, cmd]) => commandAppliesToResource(cmd, resourceName))
}

/**
 * The backing command for a CRUD shape among a resource's commands: the first,
 * in declaration order, whose `name` is `operation`. Returns `undefined` when
 * the manifest declares no such command, so the client has no such method.
 * Later commands with the same CRUD name still have routes, but no client
 * method.
 */
export function findCrudCommand(
  resourceCommands: readonly [string, Command][],
  operation: CrudOperation
): [string, Command] | undefined {
  return resourceCommands.find(([, cmd]) => cmd.name === operation)
}

/**
 * The command whose operation resolves references to a resource: its first
 * usable `get` (single references, containers, and identity-collection
 * entries) or `list` (collections), as a `[commandKey, command]` pair.
 *
 * It is the one place this choice is made. The contract's resource table
 * records the operations of these commands, the input satisfiability judgment
 * asks whether a `get` exists, and the native executor addresses a referenced
 * object at the application only when that `get` records no parent, so none of
 * them can disagree.
 */
export function resolvingCommand(
  manifest: AppManifest,
  resourceName: string,
  shape: 'get' | 'list'
): [string, Command] | undefined {
  return findCrudCommand(resourceCommandEntries(manifest, resourceName), shape)
}

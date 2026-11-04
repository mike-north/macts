/**
 * Which declared parameter selects the item a command acts on.
 *
 * A resource-scoped `get`, `update` or `delete` acts on one item of its
 * resource, and a `delete` at either scope removes one item. Each selects
 * that item by a parameter the manifest declares: its first required
 * parameter other than its parent's (the parameter `command.parent` names).
 * Every surface reads that one parameter. The generated contract, HTTP client
 * and CLI take it as the item's identifier, the native body addresses the
 * item by it, and registration admits it as input. No surface supplies a name
 * of its own when the manifest declares none.
 *
 * A command that must select an item and declares no such parameter is
 * refused, by generation and by registration alike, through
 * {@link itemSelectionProblem}. Any other command, including an
 * application-scoped `get` or `update`, is a call on the app with its
 * parameters and selects no item, so this rule does not apply to it.
 *
 * @packageDocumentation
 */

import type { AppManifest } from './schemas/app.js'
import type { Command, CommandParameter } from './schemas/command.js'
import { resolveManifestRoutes } from './route.js'

/**
 * The command names that act on one item of a resource when the command is
 * resource-scoped. A command of any other name selects no item.
 */
export const ITEM_COMMAND_NAMES: readonly string[] = ['get', 'update', 'delete']

/**
 * Whether a command must select one item by a declared identifier parameter:
 * a resource-scoped `get`, `update` or `delete`, or a `delete` at application
 * scope, which has no other way to name what it removes.
 *
 * @param command - A manifest command.
 * @returns `true` when the command acts on one item it must select.
 */
export function selectsOneItem(command: Command): boolean {
  if (command.scope === 'resource') return ITEM_COMMAND_NAMES.includes(command.name)
  return command.name === 'delete'
}

/**
 * The declared parameter a command selects its item by: its first required
 * parameter, in declaration order, other than its parent's.
 *
 * @param command - A manifest command.
 * @returns The identifier parameter, or `undefined` when the command declares
 *   no required parameter besides its parent's.
 */
export function itemIdentifierParameter(command: Command): CommandParameter | undefined {
  const parent = command.parent?.parameter
  return command.parameters.find((p) => p.required && p.name !== parent)
}

/**
 * Why a command cannot be offered, when it must select one item
 * ({@link selectsOneItem}) and declares no parameter to select it by
 * ({@link itemIdentifierParameter}).
 *
 * @remarks
 * The text names the command key and says what to declare. Callers prefix it
 * with the app and what is refused, such as registration or generation.
 *
 * @param commandKey - The command's key in `manifest.commands`.
 * @param command - The command definition.
 * @returns The reason, starting with "its ...", or `undefined` when the
 *   command selects its item by a declared parameter or selects none.
 */
export function itemSelectionProblem(commandKey: string, command: Command): string | undefined {
  if (!selectsOneItem(command) || itemIdentifierParameter(command) !== undefined) return undefined
  const parent = command.parent?.parameter
  const besideParent = parent === undefined ? '' : ` other than its parent parameter "${parent}"`
  if (command.scope === 'application') {
    return `its application-scoped delete command "${commandKey}" declares no identifier parameter. A delete acts on one item, selected by a required parameter, so without one no item can be selected. Scope "${commandKey}" to the resource whose items it deletes and declare the item's identifier as a required parameter.`
  }
  return `its ${command.name} command "${commandKey}" declares no identifier parameter. A ${command.name} acts on one item, selected by a required parameter${besideParent}, so without one no item can be selected. Declare the item's identifier as a required parameter of "${commandKey}".`
}

/** A routed command that must select one item and declares no parameter to do so. */
export interface UnselectableItemCommand {
  /** The command's key in `manifest.commands`. */
  readonly commandKey: string
  /** The command definition. */
  readonly command: Command
  /** The reason, as {@link itemSelectionProblem} gives it. */
  readonly problem: string
}

/**
 * The commands of a manifest that would be offered as an operation but cannot
 * select the item they act on, in declaration order, each once.
 *
 * @remarks
 * Only a command with a route is considered: a command or resource marked
 * unsupported is offered nowhere, so it is never refused.
 *
 * @param manifest - A validated app manifest.
 * @returns One entry per such command; empty when every command qualifies.
 */
export function unselectableItemCommands(manifest: AppManifest): UnselectableItemCommand[] {
  const found = new Map<string, UnselectableItemCommand>()
  for (const { commandKey, command } of resolveManifestRoutes(manifest)) {
    if (found.has(commandKey)) continue
    const problem = itemSelectionProblem(commandKey, command)
    if (problem !== undefined) found.set(commandKey, { commandKey, command, problem })
  }
  return [...found.values()]
}

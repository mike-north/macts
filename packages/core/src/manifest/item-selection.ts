/**
 * Which declared parameter selects the item a command acts on.
 *
 * Every resource-scoped command other than a `list` or a `create` acts on one
 * item of its resource: a `get`, `update` or `delete`, and any other command
 * the app's dictionary defines on the resource's class (Notes' `show`,
 * Xcode's `build`, Mail's `send`), whose direct parameter is that item. It
 * selects the item by a parameter the manifest declares:
 * its first required parameter other than its parent's (the parameter
 * `command.parent` names). The generated contract, HTTP client and CLI take
 * that parameter as the item's identifier, the native body addresses the item
 * in its resource's collection by it, exactly as a get does, and
 * registration admits it as input.
 *
 * A `delete` at application scope must declare a required parameter too. Its
 * native body is a call on the app: it passes the command's declared
 * parameters to the app's delete as they are declared, and addresses no item
 * itself.
 *
 * No surface supplies a parameter name of its own when the manifest declares
 * none.
 *
 * A command that must select an item and declares no such parameter is
 * refused, by generation and by registration alike, through
 * {@link itemSelectionProblem}, unless it is one of the shipped commands
 * that cannot select their item yet (`KNOWN_ITEM_SELECTION_GAPS`), which stay
 * offered as a call on the app that sends no item. A resource-scoped `list` or `create` acts on
 * the collection, and any other application-scoped command, an
 * application-scoped `get` or `update` included, is a call on the app with
 * its parameters, so neither selects an item and this rule does not apply to
 * them.
 *
 * @packageDocumentation
 */

import type { AppManifest } from './schemas/app.js'
import type { Command, CommandParameter } from './schemas/command.js'
import { knownItemSelectionGap } from './item-selection-gaps.js'
import { resolveManifestRoutes } from './route.js'

/**
 * The command names that act on a resource's collection rather than on one
 * of its items when the command is resource-scoped: a `list` reads the
 * collection and a `create` adds to it. Every other resource-scoped command
 * selects one item.
 */
const COLLECTION_COMMAND_NAMES: readonly string[] = ['list', 'create']

/**
 * Whether a command must declare a required identifier parameter: any
 * resource-scoped command other than a `list` or `create`, or a `delete` at
 * application scope, which has no other way to name what it removes.
 *
 * @param command - A manifest command.
 * @returns `true` when the command acts on one item it must name.
 *
 * @internal Used within this package only; the public rule is
 *   {@link itemSelectionProblem} and {@link unselectableItemCommands}.
 */
export function selectsOneItem(command: Command): boolean {
  if (command.scope === 'resource') return !COLLECTION_COMMAND_NAMES.includes(command.name)
  return command.name === 'delete'
}

/**
 * The declared parameter that identifies a command's item: its first required
 * parameter, in declaration order, other than its parent's. A resource-scoped
 * command's native body addresses the item by it; an application-scoped
 * delete passes it to the app's delete with its other declared parameters.
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
 * Why a command cannot be offered, when it must name one item
 * (a resource-scoped command other than a list or create, or a delete at
 * application scope) and declares no identifier parameter
 * ({@link itemIdentifierParameter}).
 *
 * @remarks
 * The text names the command key and says what to declare. Callers prefix it
 * with the app and what is refused, such as registration or generation.
 *
 * @param commandKey - The command's key in `manifest.commands`.
 * @param command - The command definition.
 * @returns The reason, starting with "its ...", or `undefined` when the
 *   command declares its identifier parameter or selects no item.
 */
export function itemSelectionProblem(commandKey: string, command: Command): string | undefined {
  if (!selectsOneItem(command) || itemIdentifierParameter(command) !== undefined) return undefined
  const parent = command.parent?.parameter
  const besideParent = parent === undefined ? '' : ` other than its parent parameter "${parent}"`
  if (command.scope === 'application') {
    return `its application-scoped delete command "${commandKey}" declares no identifier parameter. A delete acts on one item, selected by a required parameter, so without one no item can be selected. Scope "${commandKey}" to the resource whose items it deletes and declare the item's identifier as a required parameter.`
  }
  if (CRUD_ITEM_COMMAND_NAMES.includes(command.name)) {
    return `its ${command.name} command "${commandKey}" declares no identifier parameter. A ${command.name} acts on one item, selected by a required parameter${besideParent}, so without one no item can be selected. Declare the item's identifier as a required parameter of "${commandKey}".`
  }
  return `its resource-scoped command "${commandKey}" declares no identifier parameter. A resource-scoped command acts on one item, which the app receives as the command's direct parameter, selected by a required parameter${besideParent}, so without one no item can be selected. Declare the item's identifier as a required parameter of "${commandKey}", as the resource's get declares it.`
}

/** The item commands that are standard CRUD shapes, whose refusal names the shape. */
const CRUD_ITEM_COMMAND_NAMES: readonly string[] = ['get', 'update', 'delete']

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
 * Whether a resource-scoped command acts on one item yet declares no
 * parameter to select it by, so it sends the app no item. Generation and
 * registration refuse every such command except the known gaps
 * (`KNOWN_ITEM_SELECTION_GAPS`), so a generator that meets one is generating
 * a known gap.
 *
 * @param command - A manifest command.
 */
export function sendsNoItem(command: Command): boolean {
  return (
    command.scope === 'resource' &&
    selectsOneItem(command) &&
    itemIdentifierParameter(command) === undefined
  )
}

/**
 * The commands of a manifest that would be offered as an operation but cannot
 * select the item they act on, in declaration order, each once.
 *
 * @remarks
 * Only a command with a route is considered: a command or resource marked
 * unsupported is offered nowhere, so it is never refused. A known gap
 * (`knownItemSelectionGap`) is not refused either.
 *
 * @param manifest - A validated app manifest.
 * @returns One entry per such command; empty when every command qualifies.
 */
export function unselectableItemCommands(manifest: AppManifest): UnselectableItemCommand[] {
  const found = new Map<string, UnselectableItemCommand>()
  for (const { commandKey, command } of resolveManifestRoutes(manifest)) {
    if (found.has(commandKey) || knownItemSelectionGap(manifest, commandKey) !== undefined) continue
    const problem = itemSelectionProblem(commandKey, command)
    if (problem !== undefined) found.set(commandKey, { commandKey, command, problem })
  }
  return [...found.values()]
}

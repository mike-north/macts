/**
 * Per-command item binding, independent of route expansion. Normalization and
 * consumers share which operations select items and which declared input binds one.
 */
import type { Command, CommandParameter } from './schemas/command.js'

/**
 * Every resource command except list/create acts on one item. Application
 * deletion also needs an item input, although the app receives its parameters directly.
 * @internal
 */
export function selectsOneItem(command: Command): boolean {
  return command.scope === 'resource'
    ? !['list', 'create'].includes(command.name)
    : command.name === 'delete'
}

/**
 * The required input that names an operation's item. Canonical scoped paths
 * name it explicitly; unscoped commands and format 1.0 use the first required
 * input outside the parent binding. Normalization uses that same declaration
 * rule when converting a format 1.1 source parent. No input is invented.
 * @public
 */
export function itemIdentifierParameter(command: Command): CommandParameter | undefined {
  if (command.parents !== undefined || command.item !== undefined) {
    return command.parameters.find((p) => p.required && p.name === command.item?.parameter)
  }
  return command.parameters.find((p) => p.required && p.name !== command.parent?.parameter)
}

import type { CliPlugin } from '@macts/cli'
import { MakeCommand } from './commands/make.js'
import { AddCommand } from './commands/add.js'
import { RemoveCommand } from './commands/remove.js'
import { SaveCommand } from './commands/save.js'
import { ActionPropertyCommand } from './commands/action-property.js'

/**
 * CLI plugin for Contacts.
 */
export const plugin: CliPlugin = {
  name: 'contacts',
  description: 'Commands for Contacts',
  commands: [MakeCommand, AddCommand, RemoveCommand, SaveCommand, ActionPropertyCommand],
}

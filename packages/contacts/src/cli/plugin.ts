import type { CliPlugin } from '@macts/cli'
import { MakeCommand } from './commands/make.js'
import { AddCommand } from './commands/add.js'
import { RemoveCommand } from './commands/remove.js'
import { SaveCommand } from './commands/save.js'
import { ActionPropertyCommand } from './commands/action-property.js'
import { ActionTitleCommand } from './commands/action-title.js'
import { PerformActionCommand } from './commands/perform-action.js'
import { ShouldEnableActionCommand } from './commands/should-enable-action.js'

/**
 * CLI plugin for Contacts.
 */
export const plugin: CliPlugin = {
  name: 'contacts',
  description: 'Commands for Contacts',
  commands: [
    MakeCommand,
    AddCommand,
    RemoveCommand,
    SaveCommand,
    ActionPropertyCommand,
    ActionTitleCommand,
    PerformActionCommand,
    ShouldEnableActionCommand,
  ],
}

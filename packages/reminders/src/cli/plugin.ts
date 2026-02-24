import type { CliPlugin } from '@macts/cli'
import { ListAccountsCommand } from './commands/accounts/list.js'
import { GetAccountCommand } from './commands/accounts/get.js'
import { ListListsCommand } from './commands/lists/list.js'
import { CreateListCommand } from './commands/lists/create.js'
import { GetListCommand } from './commands/lists/get.js'
import { ListRemindersCommand } from './commands/lists/reminders/list.js'
import { CreateReminderCommand } from './commands/lists/reminders/create.js'
import { GetReminderCommand } from './commands/lists/reminders/get.js'
import { CompleteReminderCommand } from './commands/lists/reminders/complete.js'
import { ShowReminderCommand } from './commands/lists/reminders/show.js'

/**
 * CLI plugin for Reminders.
 */
export const plugin: CliPlugin = {
  name: 'reminders',
  description: 'Commands for Reminders',
  commands: [
    ListAccountsCommand,
    GetAccountCommand,
    ListListsCommand,
    CreateListCommand,
    GetListCommand,
    ListRemindersCommand,
    CreateReminderCommand,
    GetReminderCommand,
    CompleteReminderCommand,
    ShowReminderCommand,
  ],
}

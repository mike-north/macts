import type { CliPlugin } from '@macts/cli'
import { ListGroupsCommand } from './commands/groups/list.js'
import { GetGroupCommand } from './commands/groups/get.js'
import { ListPeopleCommand } from './commands/groups/people/list.js'
import { GetPersonCommand } from './commands/groups/people/get.js'
import { ListAddressesCommand } from './commands/groups/people/addresses/list.js'
import { GetAddressCommand } from './commands/groups/people/addresses/get.js'
import { ListPhonesCommand } from './commands/groups/people/phones/list.js'
import { GetPhoneCommand } from './commands/groups/people/phones/get.js'
import { ListEmailsCommand } from './commands/groups/people/emails/list.js'
import { GetEmailCommand } from './commands/groups/people/emails/get.js'
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
    ListGroupsCommand,
    GetGroupCommand,
    ListPeopleCommand,
    GetPersonCommand,
    ListAddressesCommand,
    GetAddressCommand,
    ListPhonesCommand,
    GetPhoneCommand,
    ListEmailsCommand,
    GetEmailCommand,
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

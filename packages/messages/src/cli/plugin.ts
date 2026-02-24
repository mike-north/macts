import type { CliPlugin } from '@macts/cli'
import { ListParticipantsCommand } from './commands/participants/list.js'
import { GetParticipantCommand } from './commands/participants/get.js'
import { ListAccountsCommand } from './commands/accounts/list.js'
import { GetAccountCommand } from './commands/accounts/get.js'
import { ListChatsCommand } from './commands/accounts/chats/list.js'
import { GetChatCommand } from './commands/accounts/chats/get.js'
import { SendCommand } from './commands/send.js'
import { LoginCommand } from './commands/login.js'
import { LogoutCommand } from './commands/logout.js'

/**
 * CLI plugin for Messages.
 */
export const plugin: CliPlugin = {
  name: 'messages',
  description: 'Commands for Messages',
  commands: [
    ListParticipantsCommand,
    GetParticipantCommand,
    ListAccountsCommand,
    GetAccountCommand,
    ListChatsCommand,
    GetChatCommand,
    SendCommand,
    LoginCommand,
    LogoutCommand,
  ],
}

import type { CliPlugin } from '@macts/cli'
import { BounceMessageCommand } from './commands/accounts/mailboxes/messages/bounce.js'
import { ForwardMessageCommand } from './commands/accounts/mailboxes/messages/forward.js'
import { RedirectMessageCommand } from './commands/accounts/mailboxes/messages/redirect.js'
import { ReplyMessageCommand } from './commands/accounts/mailboxes/messages/reply.js'
import { SendOutgoingMessageCommand } from './commands/outgoingMessages/send.js'
import { DeleteCommand } from './commands/delete.js'
import { DuplicateCommand } from './commands/duplicate.js'
import { MoveCommand } from './commands/move.js'
import { CheckForNewMailCommand } from './commands/check-for-new-mail.js'
import { ExtractNameFromCommand } from './commands/extract-name-from.js'
import { ExtractAddressFromCommand } from './commands/extract-address-from.js'
import { GetURLCommand } from './commands/get-url.js'
import { ImportMailMailboxCommand } from './commands/import-mail-mailbox.js'
import { MailtoCommand } from './commands/mailto.js'
import { PerformMailActionWithMessagesCommand } from './commands/perform-mail-action-with-messages.js'
import { SynchronizeCommand } from './commands/synchronize.js'

/**
 * CLI plugin for Mail.
 */
export const plugin: CliPlugin = {
  name: 'mail',
  description: 'Commands for Mail',
  commands: [
    BounceMessageCommand,
    ForwardMessageCommand,
    RedirectMessageCommand,
    ReplyMessageCommand,
    SendOutgoingMessageCommand,
    DeleteCommand,
    DuplicateCommand,
    MoveCommand,
    CheckForNewMailCommand,
    ExtractNameFromCommand,
    ExtractAddressFromCommand,
    GetURLCommand,
    ImportMailMailboxCommand,
    MailtoCommand,
    PerformMailActionWithMessagesCommand,
    SynchronizeCommand,
  ],
}

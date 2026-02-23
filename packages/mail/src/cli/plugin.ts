import type { CliPlugin } from '@macts/cli';
import { ListAccountsCommand } from './commands/accounts/list.js';
import { CreateAccountCommand } from './commands/accounts/create.js';
import { GetAccountCommand } from './commands/accounts/get.js';
import { ListMailboxesCommand } from './commands/accounts/mailboxes/list.js';
import { CreateMailboxCommand } from './commands/accounts/mailboxes/create.js';
import { GetMailboxCommand } from './commands/accounts/mailboxes/get.js';
import { ListMessagesCommand } from './commands/accounts/mailboxes/messages/list.js';
import { CreateMessageCommand } from './commands/accounts/mailboxes/messages/create.js';
import { GetMessageCommand } from './commands/accounts/mailboxes/messages/get.js';
import { BounceMessageCommand } from './commands/accounts/mailboxes/messages/bounce.js';
import { ForwardMessageCommand } from './commands/accounts/mailboxes/messages/forward.js';
import { RedirectMessageCommand } from './commands/accounts/mailboxes/messages/redirect.js';
import { ReplyMessageCommand } from './commands/accounts/mailboxes/messages/reply.js';
import { ListBccRecipientsCommand } from './commands/accounts/mailboxes/messages/bccRecipients/list.js';
import { CreateBccRecipientCommand } from './commands/accounts/mailboxes/messages/bccRecipients/create.js';
import { GetBccRecipientCommand } from './commands/accounts/mailboxes/messages/bccRecipients/get.js';
import { ListCcRecipientsCommand } from './commands/accounts/mailboxes/messages/ccRecipients/list.js';
import { CreateCcRecipientCommand } from './commands/accounts/mailboxes/messages/ccRecipients/create.js';
import { GetCcRecipientCommand } from './commands/accounts/mailboxes/messages/ccRecipients/get.js';
import { ListRecipientsCommand } from './commands/accounts/mailboxes/messages/recipients/list.js';
import { CreateRecipientCommand } from './commands/accounts/mailboxes/messages/recipients/create.js';
import { GetRecipientCommand } from './commands/accounts/mailboxes/messages/recipients/get.js';
import { ListToRecipientsCommand } from './commands/accounts/mailboxes/messages/toRecipients/list.js';
import { CreateToRecipientCommand } from './commands/accounts/mailboxes/messages/toRecipients/create.js';
import { GetToRecipientCommand } from './commands/accounts/mailboxes/messages/toRecipients/get.js';
import { ListHeadersCommand } from './commands/accounts/mailboxes/messages/headers/list.js';
import { CreateHeaderCommand } from './commands/accounts/mailboxes/messages/headers/create.js';
import { GetHeaderCommand } from './commands/accounts/mailboxes/messages/headers/get.js';
import { ListMailAttachmentsCommand } from './commands/accounts/mailboxes/messages/mailAttachments/list.js';
import { CreateMailAttachmentCommand } from './commands/accounts/mailboxes/messages/mailAttachments/create.js';
import { GetMailAttachmentCommand } from './commands/accounts/mailboxes/messages/mailAttachments/get.js';
import { ListOutgoingMessagesCommand } from './commands/outgoingMessages/list.js';
import { CreateOutgoingMessageCommand } from './commands/outgoingMessages/create.js';
import { GetOutgoingMessageCommand } from './commands/outgoingMessages/get.js';
import { SendOutgoingMessageCommand } from './commands/outgoingMessages/send.js';
import { ListMessageViewersCommand } from './commands/messageViewers/list.js';
import { CreateMessageViewerCommand } from './commands/messageViewers/create.js';
import { GetMessageViewerCommand } from './commands/messageViewers/get.js';
import { ListRulesCommand } from './commands/rules/list.js';
import { CreateRuleCommand } from './commands/rules/create.js';
import { GetRuleCommand } from './commands/rules/get.js';
import { ListRuleConditionsCommand } from './commands/rules/ruleConditions/list.js';
import { CreateRuleConditionCommand } from './commands/rules/ruleConditions/create.js';
import { GetRuleConditionCommand } from './commands/rules/ruleConditions/get.js';
import { DeleteCommand } from './commands/delete.js';
import { DuplicateCommand } from './commands/duplicate.js';
import { MoveCommand } from './commands/move.js';
import { CheckForNewMailCommand } from './commands/check-for-new-mail.js';
import { ExtractNameFromCommand } from './commands/extract-name-from.js';
import { ExtractAddressFromCommand } from './commands/extract-address-from.js';
import { GetURLCommand } from './commands/get-url.js';
import { ImportMailMailboxCommand } from './commands/import-mail-mailbox.js';
import { MailtoCommand } from './commands/mailto.js';
import { PerformMailActionWithMessagesCommand } from './commands/perform-mail-action-with-messages.js';
import { SynchronizeCommand } from './commands/synchronize.js';

/**
 * CLI plugin for Mail.
 */
export const plugin: CliPlugin = {
  name: 'mail',
  description: 'Commands for Mail',
  commands: [
    ListAccountsCommand,
    CreateAccountCommand,
    GetAccountCommand,
    ListMailboxesCommand,
    CreateMailboxCommand,
    GetMailboxCommand,
    ListMessagesCommand,
    CreateMessageCommand,
    GetMessageCommand,
    BounceMessageCommand,
    ForwardMessageCommand,
    RedirectMessageCommand,
    ReplyMessageCommand,
    ListBccRecipientsCommand,
    CreateBccRecipientCommand,
    GetBccRecipientCommand,
    ListCcRecipientsCommand,
    CreateCcRecipientCommand,
    GetCcRecipientCommand,
    ListRecipientsCommand,
    CreateRecipientCommand,
    GetRecipientCommand,
    ListToRecipientsCommand,
    CreateToRecipientCommand,
    GetToRecipientCommand,
    ListHeadersCommand,
    CreateHeaderCommand,
    GetHeaderCommand,
    ListMailAttachmentsCommand,
    CreateMailAttachmentCommand,
    GetMailAttachmentCommand,
    ListOutgoingMessagesCommand,
    CreateOutgoingMessageCommand,
    GetOutgoingMessageCommand,
    SendOutgoingMessageCommand,
    ListMessageViewersCommand,
    CreateMessageViewerCommand,
    GetMessageViewerCommand,
    ListRulesCommand,
    CreateRuleCommand,
    GetRuleCommand,
    ListRuleConditionsCommand,
    CreateRuleConditionCommand,
    GetRuleConditionCommand,
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
};

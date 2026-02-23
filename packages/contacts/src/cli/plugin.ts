import type { CliPlugin } from '@macts/cli';
import { ListGroupsCommand } from './commands/groups/list.js';
import { CreateGroupCommand } from './commands/groups/create.js';
import { GetGroupCommand } from './commands/groups/get.js';
import { ListPeopleCommand } from './commands/groups/people/list.js';
import { GetPersonCommand } from './commands/groups/people/get.js';
import { ListMSNHandlesCommand } from './commands/groups/people/mSNHandles/list.js';
import { CreateMSNHandleCommand } from './commands/groups/people/mSNHandles/create.js';
import { GetMSNHandleCommand } from './commands/groups/people/mSNHandles/get.js';
import { ListUrlsCommand } from './commands/groups/people/urls/list.js';
import { CreateUrlCommand } from './commands/groups/people/urls/create.js';
import { GetUrlCommand } from './commands/groups/people/urls/get.js';
import { ListAddressesCommand } from './commands/groups/people/addresses/list.js';
import { CreateAddressCommand } from './commands/groups/people/addresses/create.js';
import { GetAddressCommand } from './commands/groups/people/addresses/get.js';
import { ListPhonesCommand } from './commands/groups/people/phones/list.js';
import { CreatePhoneCommand } from './commands/groups/people/phones/create.js';
import { GetPhoneCommand } from './commands/groups/people/phones/get.js';
import { ListJabberHandlesCommand } from './commands/groups/people/jabberHandles/list.js';
import { CreateJabberHandleCommand } from './commands/groups/people/jabberHandles/create.js';
import { GetJabberHandleCommand } from './commands/groups/people/jabberHandles/get.js';
import { ListCustomDatesCommand } from './commands/groups/people/customDates/list.js';
import { CreateCustomDateCommand } from './commands/groups/people/customDates/create.js';
import { GetCustomDateCommand } from './commands/groups/people/customDates/get.js';
import { ListAIMHandlesCommand } from './commands/groups/people/aIMHandles/list.js';
import { CreateAIMHandleCommand } from './commands/groups/people/aIMHandles/create.js';
import { GetAIMHandleCommand } from './commands/groups/people/aIMHandles/get.js';
import { ListYahooHandlesCommand } from './commands/groups/people/yahooHandles/list.js';
import { CreateYahooHandleCommand } from './commands/groups/people/yahooHandles/create.js';
import { GetYahooHandleCommand } from './commands/groups/people/yahooHandles/get.js';
import { ListICQHandlesCommand } from './commands/groups/people/iCQHandles/list.js';
import { CreateICQHandleCommand } from './commands/groups/people/iCQHandles/create.js';
import { GetICQHandleCommand } from './commands/groups/people/iCQHandles/get.js';
import { ListInstantMessagesCommand } from './commands/groups/people/instantMessages/list.js';
import { CreateInstantMessageCommand } from './commands/groups/people/instantMessages/create.js';
import { GetInstantMessageCommand } from './commands/groups/people/instantMessages/get.js';
import { ListSocialProfilesCommand } from './commands/groups/people/socialProfiles/list.js';
import { CreateSocialProfileCommand } from './commands/groups/people/socialProfiles/create.js';
import { GetSocialProfileCommand } from './commands/groups/people/socialProfiles/get.js';
import { ListRelatedNamesCommand } from './commands/groups/people/relatedNames/list.js';
import { CreateRelatedNameCommand } from './commands/groups/people/relatedNames/create.js';
import { GetRelatedNameCommand } from './commands/groups/people/relatedNames/get.js';
import { ListEmailsCommand } from './commands/groups/people/emails/list.js';
import { CreateEmailCommand } from './commands/groups/people/emails/create.js';
import { GetEmailCommand } from './commands/groups/people/emails/get.js';
import { CreatePersonCommand } from './commands/people/create.js';
import { MakeCommand } from './commands/make.js';
import { AddCommand } from './commands/add.js';
import { RemoveCommand } from './commands/remove.js';
import { SaveCommand } from './commands/save.js';
import { ActionPropertyCommand } from './commands/action-property.js';
import { ActionTitleCommand } from './commands/action-title.js';
import { PerformActionCommand } from './commands/perform-action.js';
import { ShouldEnableActionCommand } from './commands/should-enable-action.js';

/**
 * CLI plugin for Contacts.
 */
export const plugin: CliPlugin = {
  name: 'contacts',
  description: 'Commands for Contacts',
  commands: [
    ListGroupsCommand,
    CreateGroupCommand,
    GetGroupCommand,
    ListPeopleCommand,
    GetPersonCommand,
    ListMSNHandlesCommand,
    CreateMSNHandleCommand,
    GetMSNHandleCommand,
    ListUrlsCommand,
    CreateUrlCommand,
    GetUrlCommand,
    ListAddressesCommand,
    CreateAddressCommand,
    GetAddressCommand,
    ListPhonesCommand,
    CreatePhoneCommand,
    GetPhoneCommand,
    ListJabberHandlesCommand,
    CreateJabberHandleCommand,
    GetJabberHandleCommand,
    ListCustomDatesCommand,
    CreateCustomDateCommand,
    GetCustomDateCommand,
    ListAIMHandlesCommand,
    CreateAIMHandleCommand,
    GetAIMHandleCommand,
    ListYahooHandlesCommand,
    CreateYahooHandleCommand,
    GetYahooHandleCommand,
    ListICQHandlesCommand,
    CreateICQHandleCommand,
    GetICQHandleCommand,
    ListInstantMessagesCommand,
    CreateInstantMessageCommand,
    GetInstantMessageCommand,
    ListSocialProfilesCommand,
    CreateSocialProfileCommand,
    GetSocialProfileCommand,
    ListRelatedNamesCommand,
    CreateRelatedNameCommand,
    GetRelatedNameCommand,
    ListEmailsCommand,
    CreateEmailCommand,
    GetEmailCommand,
    CreatePersonCommand,
    MakeCommand,
    AddCommand,
    RemoveCommand,
    SaveCommand,
    ActionPropertyCommand,
    ActionTitleCommand,
    PerformActionCommand,
    ShouldEnableActionCommand,
  ],
};

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new account.
 */
export class CreateAccountCommand extends Command {
  static override paths = [['mail', 'accounts', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new account',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  deliveryAccount = Option.String('--delivery-account', {
    required: true,
    description: 'The delivery account used when sending mail from this account',
  })
  name = Option.String('--name', { required: true, description: 'The name of an account' })
  password = Option.String('--password', {
    required: true,
    description: 'Password for this account. Can be set, but not read via scripting',
  })
  authentication = Option.String('--authentication', {
    required: true,
    description: 'Preferred authentication scheme for account',
  })
  emailAddresses = Option.String('--email-addresses', {
    required: true,
    description: 'The list of email addresses configured for an account',
  })
  fullName = Option.String('--full-name', {
    required: true,
    description: 'The users full name configured for an account',
  })
  emptyJunkMessagesFrequency = Option.String('--empty-junk-messages-frequency', {
    required: true,
    description:
      'Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete)',
  })
  emptySentMessagesFrequency = Option.String('--empty-sent-messages-frequency', {
    required: true,
    description: 'Does nothing at all (deprecated)',
  })
  emptyTrashFrequency = Option.String('--empty-trash-frequency', {
    required: true,
    description:
      'Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete)',
  })
  emptyJunkMessagesOnQuit = Option.Boolean('--empty-junk-messages-on-quit', {
    description:
      'Indicates whether the messages in the junk messages mailboxes will be deleted on quit',
  })
  emptySentMessagesOnQuit = Option.Boolean('--empty-sent-messages-on-quit', {
    description: 'Does nothing at all (deprecated)',
  })
  emptyTrashOnQuit = Option.Boolean('--empty-trash-on-quit', {
    description:
      'Indicates whether the messages in deleted messages mailboxes will be permanently deleted on quit',
  })
  enabled = Option.Boolean('--enabled', {
    description: 'Indicates whether the account is enabled or not',
  })
  userName = Option.String('--user-name', {
    required: true,
    description: 'The user name used to connect to an account',
  })
  port = Option.String('--port', {
    required: true,
    description: 'The port used to connect to an account',
  })
  serverName = Option.String('--server-name', {
    required: true,
    description: 'The host name used to connect to an account',
  })
  includeWhenGettingNewMail = Option.Boolean('--include-when-getting-new-mail', {
    description: 'Does nothing at all (deprecated)',
  })
  moveDeletedMessagesToTrash = Option.Boolean('--move-deleted-messages-to-trash', {
    description: 'Indicates whether messages that are deleted will be moved to the trash mailbox',
  })
  usesSsl = Option.Boolean('--uses-ssl', {
    description: 'Indicates whether SSL is enabled for this receiving account',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.accounts.create({
        deliveryAccount: this.deliveryAccount,
        name: this.name,
        password: this.password,
        authentication: this.authentication,
        emailAddresses: this.emailAddresses,
        fullName: this.fullName,
        emptyJunkMessagesFrequency: this.emptyJunkMessagesFrequency,
        emptySentMessagesFrequency: this.emptySentMessagesFrequency,
        emptyTrashFrequency: this.emptyTrashFrequency,
        emptyJunkMessagesOnQuit: this.emptyJunkMessagesOnQuit,
        emptySentMessagesOnQuit: this.emptySentMessagesOnQuit,
        emptyTrashOnQuit: this.emptyTrashOnQuit,
        enabled: this.enabled,
        userName: this.userName,
        port: this.port,
        serverName: this.serverName,
        includeWhenGettingNewMail: this.includeWhenGettingNewMail,
        moveDeletedMessagesToTrash: this.moveDeletedMessagesToTrash,
        usesSsl: this.usesSsl,
      } as unknown as Parameters<typeof client.accounts.create>[0])

      const output = formatter.format({
        message: 'Account created successfully',
        deliveryAccount: item.deliveryAccount,
        name: item.name,
        id: item.id,
        password: item.password,
        authentication: item.authentication,
        accountType: item.accountType,
        emailAddresses: item.emailAddresses,
        fullName: item.fullName,
        emptyJunkMessagesFrequency: item.emptyJunkMessagesFrequency,
        emptySentMessagesFrequency: item.emptySentMessagesFrequency,
        emptyTrashFrequency: item.emptyTrashFrequency,
        emptyJunkMessagesOnQuit: item.emptyJunkMessagesOnQuit,
        emptySentMessagesOnQuit: item.emptySentMessagesOnQuit,
        emptyTrashOnQuit: item.emptyTrashOnQuit,
        enabled: item.enabled,
        userName: item.userName,
        accountDirectory: item.accountDirectory,
        port: item.port,
        serverName: item.serverName,
        includeWhenGettingNewMail: item.includeWhenGettingNewMail,
        moveDeletedMessagesToTrash: item.moveDeletedMessagesToTrash,
        usesSsl: item.usesSsl,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

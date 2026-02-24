import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List accounts.
 */
export class ListAccountsCommand extends Command {
  static override paths = [['mail', 'accounts', 'list']]

  static override usage = Command.Usage({
    description: 'List accounts',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.accounts.list()

      const output = formatter.formatList(
        items.map((item) => ({
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
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

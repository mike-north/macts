import { Command, Option } from 'clipanion'
import { getClient } from '../../../../../sdk.js'
import { createFormatter } from '../../../../../output/index.js'

/**
 * Get a recipient by ID.
 */
export class GetRecipientCommand extends Command {
  static override paths = [['mail', 'accounts', 'mailboxes', 'messages', 'recipients', 'get']]

  static override usage = Command.Usage({
    description: 'Get a recipient by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })

  recipientId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.recipients.get(this.recipientId)

      const output = formatter.format({
        address: item.address,
        name: item.name,
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

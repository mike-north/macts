import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new torecipient.
 */
export class CreateToRecipientCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'toRecipients', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new torecipient',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.torecipients.create({} as Record<string, unknown>)

      const output = formatter.format({
        message: 'ToRecipient created successfully',
        id: item.id,
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

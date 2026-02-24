import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List torecipients.
 */
export class ListToRecipientsCommand extends Command {
  static override paths = [['mail', 'outgoingMessages', 'toRecipients', 'list']]

  static override usage = Command.Usage({
    description: 'List torecipients',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  outgoingMessageId = Option.String('--outgoing-message-id', {
    required: true,
    description: 'OutgoingMessage ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.torecipients.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
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

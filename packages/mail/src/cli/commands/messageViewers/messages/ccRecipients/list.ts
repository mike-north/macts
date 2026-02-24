import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List ccrecipients.
 */
export class ListCcRecipientsCommand extends Command {
  static override paths = [['mail', 'messageViewers', 'messages', 'ccRecipients', 'list']]

  static override usage = Command.Usage({
    description: 'List ccrecipients',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  messageViewerId = Option.String('--message-viewer-id', {
    required: true,
    description: 'MessageViewer ID',
  })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.ccrecipients.list()

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

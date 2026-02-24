import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List headers.
 */
export class ListHeadersCommand extends Command {
  static override paths = [['mail', 'messageViewers', 'messages', 'headers', 'list']]

  static override usage = Command.Usage({
    description: 'List headers',
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
      const items = await client.headers.list()

      const output = formatter.formatList(
        items.map((item) => ({
          content: item.content,
          name: item.name,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List tabs.
 */
export class ListTabsCommand extends Command {
  static override paths = [['safari', 'documents', 'tabs', 'list']]

  static override usage = Command.Usage({
    description: 'List tabs',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.tabs.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          id: item.id,
          url: item.url,
          source: item.source,
          text: item.text,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a tab by ID.
 */
export class GetTabCommand extends Command {
  static override paths = [['safari', 'documents', 'tabs', 'get']]

  static override usage = Command.Usage({
    description: 'Get a tab by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  tabId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tabs.get(this.tabId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        url: item.url,
        source: item.source,
        text: item.text,
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

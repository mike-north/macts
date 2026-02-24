import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new tab.
 */
export class CreateTabCommand extends Command {
  static override paths = [['safari', 'documents', 'tabs', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new tab',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  url = Option.String('--url', { required: true, description: 'The tab URL' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tabs.create({
        url: this.url,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Tab created successfully',
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

import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.
 */
export class AddReadingListItemCommand extends Command {
  static override paths = [['safari', 'add-reading-list-item']]

  static override usage = Command.Usage({
    description:
      'Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  andPreviewText = Option.String('--and-preview-text', {
    required: false,
    description:
      'Preview text for the Reading List item, usually the first few sentences of the article',
  })
  withTitle = Option.String('--with-title', {
    required: false,
    description: 'Title of the Reading List item',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.addReadingListItem(
        this.andPreviewText as unknown as Parameters<typeof client.addReadingListItem>[0],
        this.withTitle as unknown as Parameters<typeof client.addReadingListItem>[1]
      )

      const output = formatter.formatSuccess('addReadingListItem completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

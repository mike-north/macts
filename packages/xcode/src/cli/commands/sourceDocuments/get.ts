import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a sourcedocument by ID.
 */
export class GetSourceDocumentCommand extends Command {
  static override paths = [['xcode', 'sourceDocuments', 'get']]

  static override usage = Command.Usage({
    description: 'Get a sourcedocument by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  sourceDocumentId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.sourcedocuments.get(this.sourceDocumentId)

      const output = formatter.format({
        name: item.name,
        modified: item.modified,
        file: item.file,
        path: item.path,
        selectedCharacterRange: item.selectedCharacterRange,
        selectedParagraphRange: item.selectedParagraphRange,
        text: item.text,
        notifiesWhenClosing: item.notifiesWhenClosing,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a document by ID.
 */
export class GetDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'get']]

  static override usage = Command.Usage({
    description: 'Get a document by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  documentId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.documents.get(this.documentId)

      const output = formatter.format({
        name: item.name,
        fullName: item.fullName,
        posixFullName: item.posixFullName,
        path: item.path,
        saved: item.saved,
        readOnly: item.readOnly,
        active: item.active,
        content: item.content,
        trackRevisions: item.trackRevisions,
        showRevisions: item.showRevisions,
        defaultTabStop: item.defaultTabStop,
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

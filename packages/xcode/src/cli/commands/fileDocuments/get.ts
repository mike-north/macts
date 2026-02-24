import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a filedocument by ID.
 */
export class GetFileDocumentCommand extends Command {
  static override paths = [['xcode', 'fileDocuments', 'get']]

  static override usage = Command.Usage({
    description: 'Get a filedocument by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  fileDocumentId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.filedocuments.get(this.fileDocumentId)

      const output = formatter.format({
        name: item.name,
        modified: item.modified,
        file: item.file,
        path: item.path,
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

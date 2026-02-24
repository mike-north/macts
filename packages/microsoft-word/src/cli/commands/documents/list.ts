import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List documents.
 */
export class ListDocumentsCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'list']]

  static override usage = Command.Usage({
    description: 'List documents',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.documents.list()

      const output = formatter.formatList(
        items.map((item) => ({
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

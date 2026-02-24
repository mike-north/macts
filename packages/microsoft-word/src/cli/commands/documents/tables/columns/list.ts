import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List columns.
 */
export class ListColumnsCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'tables', 'columns', 'list']]

  static override usage = Command.Usage({
    description: 'List columns',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.columns.list()

      const output = formatter.formatList(
        items.map((item) => ({
          width: item.width,
          preferredWidth: item.preferredWidth,
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

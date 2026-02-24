import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a row by ID.
 */
export class GetRowCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'tables', 'rows', 'get']]

  static override usage = Command.Usage({
    description: 'Get a row by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' })

  rowId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.rows.get(this.rowId)

      const output = formatter.format({
        height: item.height,
        allowBreakAcrossPages: item.allowBreakAcrossPages,
        headingFormat: item.headingFormat,
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

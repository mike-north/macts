import { Command, Option } from 'clipanion'
import { getClient } from '../../../../../sdk.js'
import { createFormatter } from '../../../../../output/index.js'

/**
 * Get a cell by ID.
 */
export class GetCellCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'tables', 'rows', 'cells', 'get']]

  static override usage = Command.Usage({
    description: 'Get a cell by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' })
  rowId = Option.String('--row-id', { required: true, description: 'Row ID' })

  cellId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.cells.get(this.cellId)

      const output = formatter.format({
        content: item.content,
        width: item.width,
        height: item.height,
        verticalAlignment: item.verticalAlignment,
        rowIndex: item.rowIndex,
        columnIndex: item.columnIndex,
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

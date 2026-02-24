import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new table.
 */
export class CreateTableCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'tables', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new table',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  allowAutoFit = Option.Boolean('--allow-auto-fit', {
    description: 'Whether the table is allowed to autofit',
  })
  borders = Option.Boolean('--borders', { description: 'Whether the table has borders' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tables.create({
        allowAutoFit: this.allowAutoFit,
        borders: this.borders,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Table created successfully',
        rowCount: item.rowCount,
        columnCount: item.columnCount,
        allowAutoFit: item.allowAutoFit,
        borders: item.borders,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new row.
 */
export class CreateRowCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'tables', 'rows', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new row',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' })
  height = Option.String('--height', {
    required: true,
    description: 'The height of the row in points',
  })
  allowBreakAcrossPages = Option.Boolean('--allow-break-across-pages', {
    description: 'Whether the row can break across pages',
  })
  headingFormat = Option.Boolean('--heading-format', {
    description: 'Whether the row is formatted as a heading',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.rows.create({
        height: this.height,
        allowBreakAcrossPages: this.allowBreakAcrossPages,
        headingFormat: this.headingFormat,
      } as unknown as Parameters<typeof client.rows.create>[0])

      const output = formatter.format({
        message: 'Row created successfully',
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

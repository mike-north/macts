import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List fields.
 */
export class ListFieldsCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'fields', 'list']]

  static override usage = Command.Usage({
    description: 'List fields',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.fields.list()

      const output = formatter.formatList(
        items.map((item) => ({
          fieldType: item.fieldType,
          fieldCode: item.fieldCode,
          fieldText: item.fieldText,
          locked: item.locked,
          showCodes: item.showCodes,
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

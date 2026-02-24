import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new document.
 */
export class CreateDocumentCommand extends Command {
  static override paths = [['system-information', 'documents', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new document',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  detailLevel = Option.String('--detail-level', {
    required: true,
    description: 'The desired level of detail for the system profile document',
    validator: t.isEnum(['mini', 'basic', 'full']),
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.documents.create({
        detailLevel: this.detailLevel,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Document created successfully',
        name: item.name,
        plainText: item.plainText,
        xmlText: item.xmlText,
        detailLevel: item.detailLevel,
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

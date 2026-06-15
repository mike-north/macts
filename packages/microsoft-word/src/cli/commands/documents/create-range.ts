import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a text range by character positions
 */
export class CreateRangeDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'create-range']]

  static override usage = Command.Usage({
    description: 'Create a text range by character positions',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String({ required: true })
  start = Option.String('--start', {
    required: false,
    description: 'The starting character position',
  })
  end = Option.String('--end', { required: false, description: 'The ending character position' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.documents.createRange(
        this.start as unknown as Parameters<typeof client.documents.createRange>[0],
        this.end as unknown as Parameters<typeof client.documents.createRange>[1]
      )

      const output = formatter.formatSuccess('createRange completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

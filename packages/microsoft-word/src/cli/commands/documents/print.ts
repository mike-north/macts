import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Print the specified document. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class PrintDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'print']]

  static override usage = Command.Usage({
    description:
      "Print the specified document. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String({ name: 'name', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.documents.print(
        this.documentId as unknown as Parameters<typeof client.documents.print>[0]
      )

      const output = formatter.formatSuccess('print completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

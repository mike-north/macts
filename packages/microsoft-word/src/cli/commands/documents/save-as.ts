import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Save the document with a new name or format. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class SaveAsDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'save-as']]

  static override usage = Command.Usage({
    description:
      "Save the document with a new name or format. When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String({ name: 'name', required: true })
  fileName = Option.String('--file-name', {
    required: true,
    description: 'The file name for the document',
  })
  fileFormat = Option.String('--file-format', {
    required: false,
    description: 'The file format for saving',
    validator: t.isEnum(['document', 'documentFormat97', 'template', 'rtf', 'text', 'html', 'pdf']),
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.documents.saveAs(
        this.documentId as unknown as Parameters<typeof client.documents.saveAs>[0],
        this.fileName as unknown as Parameters<typeof client.documents.saveAs>[1],
        this.fileFormat as unknown as Parameters<typeof client.documents.saveAs>[2]
      )

      const output = formatter.formatSuccess('saveAs completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

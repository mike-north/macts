import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new document.
 */
export class CreateDocumentCommand extends Command {
  static override paths = [['script-editor', 'documents', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new document',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of the document' })
  contents = Option.String('--contents', {
    required: true,
    description: 'The source code of the script',
  })
  language = Option.String('--language', {
    required: true,
    description: 'The scripting language (AppleScript or JavaScript)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.documents.create({
        name: this.name,
        contents: this.contents,
        language: this.language,
      } as unknown as Parameters<typeof client.documents.create>[0])

      const output = formatter.format({
        message: 'Document created successfully',
        name: item.name,
        path: item.path,
        contents: item.contents,
        language: item.language,
        modified: item.modified,
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

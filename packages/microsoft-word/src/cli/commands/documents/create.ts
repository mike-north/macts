import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new document.
 */
export class CreateDocumentCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new document',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  saved = Option.Boolean('--saved', { description: 'Whether the document has been saved' })
  trackRevisions = Option.Boolean('--track-revisions', {
    description: 'Whether changes are tracked in the document',
  })
  showRevisions = Option.Boolean('--show-revisions', {
    description: 'Whether tracked changes are shown',
  })
  defaultTabStop = Option.String('--default-tab-stop', {
    required: true,
    description: 'The interval in points between default tab stops',
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
        saved: this.saved,
        trackRevisions: this.trackRevisions,
        showRevisions: this.showRevisions,
        defaultTabStop: this.defaultTabStop,
      } as unknown as Parameters<typeof client.documents.create>[0])

      const output = formatter.format({
        message: 'Document created successfully',
        name: item.name,
        fullName: item.fullName,
        posixFullName: item.posixFullName,
        path: item.path,
        saved: item.saved,
        readOnly: item.readOnly,
        active: item.active,
        content: item.content,
        trackRevisions: item.trackRevisions,
        showRevisions: item.showRevisions,
        defaultTabStop: item.defaultTabStop,
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

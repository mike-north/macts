import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a scheme by ID.
 */
export class GetSchemeCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'schemes', 'get']]

  static override usage = Command.Usage({
    description: 'Get a scheme by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String('--workspace-document-id', {
    required: true,
    description: 'WorkspaceDocument ID',
  })

  schemeId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.schemes.get(this.schemeId)

      const output = formatter.format({
        id: item.id,
        name: item.name,
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

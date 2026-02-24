import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List projects.
 */
export class ListProjectsCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'projects', 'list']]

  static override usage = Command.Usage({
    description: 'List projects',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String('--workspace-document-id', {
    required: true,
    description: 'WorkspaceDocument ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.projects.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          name: item.name,
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

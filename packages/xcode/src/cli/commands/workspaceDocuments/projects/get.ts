import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a project by ID.
 */
export class GetProjectCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'projects', 'get']]

  static override usage = Command.Usage({
    description: 'Get a project by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceDocumentId = Option.String('--workspace-document-id', {
    required: true,
    description: 'WorkspaceDocument ID',
  })

  projectId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.projects.get(this.projectId)

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

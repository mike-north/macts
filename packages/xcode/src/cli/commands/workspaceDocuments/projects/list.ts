import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List projects.
 */
export class ListProjectsCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'projects', 'list']]

  static override usage = Command.Usage({
    description:
      "List projects. When several workspace documents share the same name, the first match in the app's order is used as the workspace document.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.projects.list(this.workspaceName)

      const output = formatter.formatList(
        page.items.map((item) => ({
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

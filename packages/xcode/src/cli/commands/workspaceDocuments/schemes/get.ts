import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a scheme by ID.
 */
export class GetSchemeCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'schemes', 'get']]

  static override usage = Command.Usage({
    description:
      "Get a scheme by ID. When several workspace documents share the same name, the first match in the app's order is used as the workspace document.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })

  schemeId = Option.String({ name: 'id', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.schemes.get(this.workspaceName, this.schemeId)

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

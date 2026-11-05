import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a run destination by name.
 */
export class GetRunDestinationCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'runDestinations', 'get']]

  static override usage = Command.Usage({
    description:
      "Get a run destination by name. When several run destinations share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous. When several workspace documents share the same name, the first match in the app's order is used as the workspace document.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })

  runDestinationId = Option.String({ name: 'name', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.runDestinations.get(this.workspaceName, this.runDestinationId)

      const output = formatter.format({
        name: item.name,
        architecture: item.architecture,
        platform: item.platform,
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

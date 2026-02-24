import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a container by ID.
 */
export class GetContainerCommand extends Command {
  static override paths = [['photos', 'folders', 'containers', 'get']]

  static override usage = Command.Usage({
    description: 'Get a container by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  folderId = Option.String('--folder-id', { required: true, description: 'Folder ID' })

  containerId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.containers.get(this.containerId)

      const output = formatter.format({
        id: item.id,
        name: item.name,
        parent: item.parent,
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

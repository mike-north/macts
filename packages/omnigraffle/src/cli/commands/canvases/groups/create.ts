import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new group.
 */
export class CreateGroupCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'groups', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new group',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })
  rotation = Option.String('--rotation', {
    required: true,
    description: 'Rotation of the group in degrees',
  })
  connectToGroupOnly = Option.Boolean('--connect-to-group-only', {
    description: 'Only connect to the group?',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.groups.create({
        rotation: this.rotation,
        connectToGroupOnly: this.connectToGroupOnly,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Group created successfully',
        id: item.id,
        rotation: item.rotation,
        connectToGroupOnly: item.connectToGroupOnly,
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

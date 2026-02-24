import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new group.
 */
export class CreateGroupCommand extends Command {
  static override paths = [['contacts', 'groups', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new group',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of this group.' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.groups.create({
        name: this.name,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Group created successfully',
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

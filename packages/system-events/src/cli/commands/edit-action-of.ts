import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Edit an action of a folder
 */
export class EditActionOfCommand extends Command {
  static override paths = [['system-events', 'edit-action-of']]

  static override usage = Command.Usage({
    description: 'Edit an action of a folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  usingActionName = Option.String('--using-action-name', {
    required: false,
    description: '...or the name of the action to edit',
  })
  usingActionNumber = Option.String('--using-action-number', {
    required: false,
    description: 'the index number of the action to edit...',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.editActionOf(this.usingActionName as unknown, this.usingActionNumber as unknown)

      const output = formatter.formatSuccess('editActionOf completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

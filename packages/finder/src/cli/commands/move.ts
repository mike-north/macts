import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Move object(s) to a new location
 */
export class MoveCommand extends Command {
  static override paths = [['finder', 'move']]

  static override usage = Command.Usage({
    description: 'Move object(s) to a new location',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  to = Option.String('--to', { required: true, description: 'the new location for the object(s)' })
  replacing = Option.Boolean('--replacing', {
    description:
      'Specifies whether or not to replace items in the destination that have the same name as items being moved',
  })
  positionedAt = Option.String('--positioned-at', {
    required: false,
    description:
      'Gives a list (in local window coordinates) of positions for the destination items',
  })
  routingSuppressed = Option.Boolean('--routing-suppressed', {
    description:
      'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.move(
        this.to as unknown as Parameters<typeof client.move>[0],
        this.replacing as unknown as Parameters<typeof client.move>[1],
        this.positionedAt as unknown as Parameters<typeof client.move>[2],
        this.routingSuppressed as unknown as Parameters<typeof client.move>[3]
      )

      const output = formatter.formatSuccess('move completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

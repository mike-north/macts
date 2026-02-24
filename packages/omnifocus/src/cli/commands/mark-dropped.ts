import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Mark one or more projects or tasks as dropped
 */
export class MarkDroppedCommand extends Command {
  static override paths = [['omnifocus', 'mark-dropped']]

  static override usage = Command.Usage({
    description: 'Mark one or more projects or tasks as dropped',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  targets = Option.String('--targets', { required: true, description: 'Objects to mark dropped' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.markDropped(this.targets as unknown)

      const output = formatter.formatSuccess('markDropped completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

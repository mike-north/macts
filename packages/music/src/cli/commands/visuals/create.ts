import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new visual.
 */
export class CreateVisualCommand extends Command {
  static override paths = [['music', 'visuals', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new visual',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.visuals.create({} as Record<string, unknown>)

      const output = formatter.format({
        message: 'Visual created successfully',
        id: item.id,
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

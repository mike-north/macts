import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Flip graphics
 */
export class FlipCommand extends Command {
  static override paths = [['omnigraffle', 'flip']]

  static override usage = Command.Usage({
    description: 'Flip graphics',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  over = Option.String('--over', {
    required: true,
    description: 'Flip orientation',
    validator: t.isEnum(['horizontally', 'vertically']),
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.flip(this.over as unknown)

      const output = formatter.formatSuccess('flip completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

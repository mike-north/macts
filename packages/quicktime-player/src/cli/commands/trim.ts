import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Trim the movie.
 */
export class TrimCommand extends Command {
  static override paths = [['quicktime-player', 'trim']]

  static override usage = Command.Usage({
    description: 'Trim the movie.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  from = Option.String('--from', { required: true, description: 'start time in seconds' })
  to = Option.String('--to', { required: true, description: 'end time in seconds' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.trim(
        this.from as unknown as Parameters<typeof client.trim>[0],
        this.to as unknown as Parameters<typeof client.trim>[1]
      )

      const output = formatter.formatSuccess('trim completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

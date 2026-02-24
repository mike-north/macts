import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Create a new screen recording document.
 */
export class NewScreenRecordingCommand extends Command {
  static override paths = [['quicktime-player', 'new-screen-recording']]

  static override usage = Command.Usage({
    description: 'Create a new screen recording document.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.newScreenRecording()

      const output = formatter.formatSuccess('newScreenRecording completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

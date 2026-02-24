import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Send a file to a bluetooth device
 */
export class SendCommand extends Command {
  static override paths = [['bluetooth-file-exchange', 'send']]

  static override usage = Command.Usage({
    description: 'Send a file to a bluetooth device',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  file = Option.String('--file', { required: false, description: 'The file(s) to send' })
  toDevice = Option.String('--to-device', {
    required: false,
    description: 'The device to send the file to',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.send(this.file as unknown, this.toDevice as unknown)

      const output = formatter.formatSuccess('send completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

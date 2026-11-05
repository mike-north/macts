import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Creates a forwarded message. macts does not yet send the message to the app, so the app acts on whatever it chooses.
 */
export class ForwardMessageCommand extends Command {
  static override paths = [['mail', 'accounts', 'mailboxes', 'messages', 'forward']]

  static override usage = Command.Usage({
    description:
      'Creates a forwarded message. macts does not yet send the message to the app, so the app acts on whatever it chooses.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  openingWindow = Option.Boolean('--opening-window', {
    description:
      'Whether the window for the forwarded message is shown. Default is to not show the window.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.messages.forward(
        this.openingWindow as unknown as Parameters<typeof client.messages.forward>[0]
      )

      const output = formatter.formatSuccess('forward completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

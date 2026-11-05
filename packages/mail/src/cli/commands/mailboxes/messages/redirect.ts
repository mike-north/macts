import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Creates a redirected message. macts does not yet send the message to the app, so the app acts on whatever it chooses.
 */
export class RedirectMessageCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'redirect']]

  static override usage = Command.Usage({
    description:
      'Creates a redirected message. macts does not yet send the message to the app, so the app acts on whatever it chooses.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String({ name: 'id', required: true })
  openingWindow = Option.Boolean('--opening-window', {
    description:
      'Whether the window for the redirected message is shown. Default is to not show the window.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.messages.redirect(
        this.openingWindow as unknown as Parameters<typeof client.messages.redirect>[0]
      )

      const output = formatter.formatSuccess('redirect completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

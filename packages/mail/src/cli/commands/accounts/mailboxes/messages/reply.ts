import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Creates a reply message.
 */
export class ReplyMessageCommand extends Command {
  static override paths = [['mail', 'accounts', 'mailboxes', 'messages', 'reply']]

  static override usage = Command.Usage({
    description: 'Creates a reply message.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })

  messageId = Option.String({ required: true })
  openingWindow = Option.Boolean('--opening-window', {
    description:
      'Whether the window for the reply message is shown. Default is to not show the window.',
  })
  replyToAll = Option.Boolean('--reply-to-all', {
    description: 'Whether to reply to all recipients. Default is to reply to the sender only.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.messages.reply(this.openingWindow as unknown, this.replyToAll as unknown)

      const output = formatter.formatSuccess('reply completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

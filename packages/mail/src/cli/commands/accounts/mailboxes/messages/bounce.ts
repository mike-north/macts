import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Does nothing at all (deprecated)
 */
export class BounceMessageCommand extends Command {
  static override paths = [['mail', 'accounts', 'mailboxes', 'messages', 'bounce']]

  static override usage = Command.Usage({
    description: 'Does nothing at all (deprecated)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  accountId = Option.String('--account-id', { required: true, description: 'Account ID' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })

  messageId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.messages.bounce()

      const output = formatter.formatSuccess('bounce completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

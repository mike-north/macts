import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new recipient.
 */
export class CreateRecipientCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'recipients', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new recipient',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })
  address = Option.String('--address', {
    required: true,
    description: 'The recipients email address',
  })
  name = Option.String('--name', { required: true, description: 'The name used for display' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.recipients.create({
        address: this.address,
        name: this.name,
      } as unknown as Parameters<typeof client.recipients.create>[0])

      const output = formatter.format({
        message: 'Recipient created successfully',
        address: item.address,
        name: item.name,
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

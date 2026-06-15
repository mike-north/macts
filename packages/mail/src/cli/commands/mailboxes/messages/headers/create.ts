import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new header.
 */
export class CreateHeaderCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'headers', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new header',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })
  content = Option.String('--content', { required: true, description: 'Contents of the header' })
  name = Option.String('--name', { required: true, description: 'Name of the header value' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.headers.create({
        content: this.content,
        name: this.name,
      } as unknown as Parameters<typeof client.headers.create>[0])

      const output = formatter.format({
        message: 'Header created successfully',
        content: item.content,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a mailattachment by ID.
 */
export class GetMailAttachmentCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'mailAttachments', 'get']]

  static override usage = Command.Usage({
    description: 'Get a mailattachment by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  messageId = Option.String('--message-id', { required: true, description: 'Message ID' })

  mailAttachmentId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.mailattachments.get(this.mailAttachmentId)

      const output = formatter.format({
        name: item.name,
        mIMEType: item.mIMEType,
        fileSize: item.fileSize,
        downloaded: item.downloaded,
        id: item.id,
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

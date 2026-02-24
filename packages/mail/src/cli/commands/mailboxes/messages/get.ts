import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a message by ID.
 */
export class GetMessageCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'get']]

  static override usage = Command.Usage({
    description: 'Get a message by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })

  messageId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.messages.get(this.messageId)

      const output = formatter.format({
        id: item.id,
        allHeaders: item.allHeaders,
        backgroundColor: item.backgroundColor,
        mailbox: item.mailbox,
        content: item.content,
        dateReceived: item.dateReceived,
        dateSent: item.dateSent,
        deletedStatus: item.deletedStatus,
        flaggedStatus: item.flaggedStatus,
        flagIndex: item.flagIndex,
        junkMailStatus: item.junkMailStatus,
        readStatus: item.readStatus,
        messageId: item.messageId,
        source: item.source,
        replyTo: item.replyTo,
        messageSize: item.messageSize,
        sender: item.sender,
        subject: item.subject,
        wasForwarded: item.wasForwarded,
        wasRedirected: item.wasRedirected,
        wasRepliedTo: item.wasRepliedTo,
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

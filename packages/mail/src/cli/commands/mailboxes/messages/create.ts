import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new message.
 */
export class CreateMessageCommand extends Command {
  static override paths = [['mail', 'mailboxes', 'messages', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new message',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mailboxId = Option.String('--mailbox-id', { required: true, description: 'Mailbox ID' })
  backgroundColor = Option.String('--background-color', {
    required: true,
    description: 'The background color of the message',
  })
  mailbox = Option.String('--mailbox', {
    required: true,
    description: 'The mailbox in which this message is filed',
  })
  deletedStatus = Option.Boolean('--deleted-status', {
    description: 'Indicates whether the message is deleted or not',
  })
  flaggedStatus = Option.Boolean('--flagged-status', {
    description: 'Indicates whether the message is flagged or not',
  })
  flagIndex = Option.String('--flag-index', {
    required: true,
    description: 'The flag on the message, or -1 if the message is not flagged',
  })
  junkMailStatus = Option.Boolean('--junk-mail-status', {
    description:
      'Indicates whether the message has been marked junk or evaluated to be junk by the junk mail filter.',
  })
  readStatus = Option.Boolean('--read-status', {
    description: 'Indicates whether the message is read or not',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.messages.create({
        backgroundColor: this.backgroundColor,
        mailbox: this.mailbox,
        deletedStatus: this.deletedStatus,
        flaggedStatus: this.flaggedStatus,
        flagIndex: this.flagIndex,
        junkMailStatus: this.junkMailStatus,
        readStatus: this.readStatus,
      } as unknown as Parameters<typeof client.messages.create>[0])

      const output = formatter.format({
        message: 'Message created successfully',
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

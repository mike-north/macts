import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List messages.
 */
export class ListMessagesCommand extends Command {
  static override paths = [['mail', 'messageViewers', 'messages', 'list']]

  static override usage = Command.Usage({
    description: 'List messages',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  messageViewerId = Option.String('--message-viewer-id', {
    required: true,
    description: 'MessageViewer ID',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.messages.list()

      const output = formatter.formatList(
        items.map((item) => ({
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
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

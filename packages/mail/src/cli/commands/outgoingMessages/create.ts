import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new outgoingmessage.
 */
export class CreateOutgoingMessageCommand extends Command {
  static override paths = [['mail', 'outgoingMessages', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new outgoingmessage',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sender = Option.String('--sender', { required: true, description: 'The sender of the message' })
  subject = Option.String('--subject', {
    required: true,
    description: 'The subject of the message',
  })
  visible = Option.Boolean('--visible', {
    description: 'Controls whether the message window is shown on the screen. The default is false',
  })
  messageSignature = Option.String('--message-signature', {
    required: true,
    description: 'The signature of the message',
  })
  htmlContent = Option.String('--html-content', {
    required: true,
    description: 'Does nothing at all (deprecated)',
  })
  vcardPath = Option.String('--vcard-path', {
    required: true,
    description: 'Does nothing at all (deprecated)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.outgoingmessages.create({
        sender: this.sender,
        subject: this.subject,
        visible: this.visible,
        messageSignature: this.messageSignature,
        htmlContent: this.htmlContent,
        vcardPath: this.vcardPath,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'OutgoingMessage created successfully',
        sender: item.sender,
        subject: item.subject,
        visible: item.visible,
        messageSignature: item.messageSignature,
        id: item.id,
        htmlContent: item.htmlContent,
        vcardPath: item.vcardPath,
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

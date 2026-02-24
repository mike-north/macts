import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a chat by ID.
 */
export class GetChatCommand extends Command {
  static override paths = [['messages', 'chats', 'get']]

  static override usage = Command.Usage({
    description: 'Get a chat by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  chatId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.chats.get(this.chatId)

      const output = formatter.format({
        id: item.id,
        name: item.name,
        account: item.account,
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

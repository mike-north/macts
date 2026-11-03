import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.
 */
export class PerformMailActionWithMessagesCommand extends Command {
  static override paths = [['mail', 'perform-mail-action-with-messages']]

  static override usage = Command.Usage({
    description:
      'Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.performMailActionWithMessages(undefined, undefined)

      const output = formatter.formatSuccess('performMailActionWithMessages completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

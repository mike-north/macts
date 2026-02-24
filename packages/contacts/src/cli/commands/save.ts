import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Save all Contacts changes. Also see the unsaved property for the application class.
 */
export class SaveCommand extends Command {
  static override paths = [['contacts', 'save']]

  static override usage = Command.Usage({
    description:
      'Save all Contacts changes. Also see the unsaved property for the application class.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.save()

      const output = formatter.formatSuccess('save completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

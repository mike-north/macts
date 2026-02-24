import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List notes.
 */
export class ListNotesCommand extends Command {
  static override paths = [['notes', 'notes', 'list']]

  static override usage = Command.Usage({
    description: 'List notes',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.notes.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          id: item.id,
          body: item.body,
          plaintext: item.plaintext,
          creationDate: item.creationDate,
          modificationDate: item.modificationDate,
          shared: item.shared,
          passwordProtected: item.passwordProtected,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Show a note in the Notes app
 */
export class ShowNoteCommand extends Command {
  static override paths = [['notes', 'notes', 'show']]

  static override usage = Command.Usage({
    description: 'Show a note in the Notes app',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  noteId = Option.String({ required: true })
  name = Option.String('--name', { required: true, description: 'Note name' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.notes.show(this.name as unknown as Parameters<typeof client.notes.show>[0])

      const output = formatter.formatSuccess('show completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

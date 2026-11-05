import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Show a note in the Notes app. When several notes share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
 */
export class ShowNoteCommand extends Command {
  static override paths = [['notes', 'notes', 'show']]

  static override usage = Command.Usage({
    description:
      "Show a note in the Notes app. When several notes share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  noteId = Option.String({ name: 'name', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.notes.show(this.noteId as unknown as Parameters<typeof client.notes.show>[0])

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

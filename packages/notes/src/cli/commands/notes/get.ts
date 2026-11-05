import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a note by name.
 */
export class GetNoteCommand extends Command {
  static override paths = [['notes', 'notes', 'get']]

  static override usage = Command.Usage({
    description:
      "Get a note by name. When several notes share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  noteId = Option.String({ name: 'name', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.notes.get(this.noteId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        body: item.body,
        plaintext: item.plaintext,
        creationDate: item.creationDate,
        modificationDate: item.modificationDate,
        shared: item.shared,
        passwordProtected: item.passwordProtected,
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

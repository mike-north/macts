import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new note.
 */
export class CreateNoteCommand extends Command {
  static override paths = [['notes', 'notes', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new note',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', {
    required: true,
    description: 'The name of the note (first line)',
  })
  body = Option.String('--body', {
    required: true,
    description: 'The HTML content of the note body',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.notes.create({
        name: this.name,
        body: this.body,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Note created successfully',
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

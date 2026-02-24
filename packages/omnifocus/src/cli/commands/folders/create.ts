import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new folder.
 */
export class CreateFolderCommand extends Command {
  static override paths = [['omnifocus', 'folders', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of the folder' })
  note = Option.String('--note', { required: true, description: 'The note of the folder' })
  hidden = Option.Boolean('--hidden', { description: 'Set if the folder is currently hidden' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.folders.create({
        name: this.name,
        note: this.note,
        hidden: this.hidden,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Folder created successfully',
        id: item.id,
        name: item.name,
        note: item.note,
        hidden: item.hidden,
        effectivelyHidden: item.effectivelyHidden,
        creationDate: item.creationDate,
        modificationDate: item.modificationDate,
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

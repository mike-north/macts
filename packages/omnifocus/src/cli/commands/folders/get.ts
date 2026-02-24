import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a folder by ID.
 */
export class GetFolderCommand extends Command {
  static override paths = [['omnifocus', 'folders', 'get']]

  static override usage = Command.Usage({
    description: 'Get a folder by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  folderId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.folders.get(this.folderId)

      const output = formatter.format({
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

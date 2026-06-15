import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Delete an album or folder
 */
export class DeleteCommand extends Command {
  static override paths = [['photos', 'delete']]

  static override usage = Command.Usage({
    description: 'Delete an album or folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  target = Option.String('--target', {
    required: true,
    description: 'The album or folder to delete',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client._delete(this.target as unknown as Parameters<typeof client._delete>[0])

      const output = formatter.formatSuccess('delete completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

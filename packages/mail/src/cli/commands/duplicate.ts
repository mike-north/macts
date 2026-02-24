import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Copy an object.
 */
export class DuplicateCommand extends Command {
  static override paths = [['mail', 'duplicate']]

  static override usage = Command.Usage({
    description: 'Copy an object.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  to = Option.String('--to', {
    required: false,
    description: 'The location for the new copy or copies.',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description: 'Properties to set in the new copy or copies right away.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.duplicate(this.to as unknown, this.withProperties as unknown)

      const output = formatter.formatSuccess('duplicate completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

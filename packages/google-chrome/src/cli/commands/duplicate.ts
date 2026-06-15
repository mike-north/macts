import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Copy object(s) and put the copies at a new location.
 */
export class DuplicateCommand extends Command {
  static override paths = [['google-chrome', 'duplicate']]

  static override usage = Command.Usage({
    description: 'Copy object(s) and put the copies at a new location.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  to = Option.String('--to', {
    required: false,
    description: 'The location for the new object(s).',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description: 'Properties to be set in the new duplicated object(s).',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.duplicate(
        this.to as unknown as Parameters<typeof client.duplicate>[0],
        this.withProperties as unknown as Parameters<typeof client.duplicate>[1]
      )

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

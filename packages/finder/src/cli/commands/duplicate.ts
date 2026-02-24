import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Duplicate one or more object(s)
 */
export class DuplicateCommand extends Command {
  static override paths = [['finder', 'duplicate']]

  static override usage = Command.Usage({
    description: 'Duplicate one or more object(s)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  to = Option.String('--to', { required: false, description: 'the new location for the object(s)' })
  replacing = Option.Boolean('--replacing', {
    description:
      'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
  })
  routingSuppressed = Option.Boolean('--routing-suppressed', {
    description:
      'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
  })
  exactCopy = Option.Boolean('--exact-copy', {
    description: 'Specifies whether or not to copy permissions/ownership as is',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.duplicate(
        this.to as unknown,
        this.replacing as unknown,
        this.routingSuppressed as unknown,
        this.exactCopy as unknown
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

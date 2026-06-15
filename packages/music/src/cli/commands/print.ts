import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Print the specified object(s)
 */
export class PrintCommand extends Command {
  static override paths = [['music', 'print']]

  static override usage = Command.Usage({
    description: 'Print the specified object(s)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  printDialog = Option.Boolean('--print-dialog', {
    description: 'Should the application show the print dialog',
  })
  withProperties = Option.String('--with-properties', {
    required: false,
    description: 'the print settings',
  })
  kind = Option.String('--kind', { required: false, description: 'the kind of printout desired' })
  theme = Option.String('--theme', {
    required: false,
    description: 'name of theme to use for formatting the printout',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.print(
        this.printDialog as unknown as Parameters<typeof client.print>[0],
        this.withProperties as unknown as Parameters<typeof client.print>[1],
        this.kind as unknown as Parameters<typeof client.print>[2],
        this.theme as unknown as Parameters<typeof client.print>[3]
      )

      const output = formatter.formatSuccess('print completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

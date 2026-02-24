import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List settingssets.
 */
export class ListSettingsSetsCommand extends Command {
  static override paths = [['terminal', 'settingsSets', 'list']]

  static override usage = Command.Usage({
    description: 'List settingssets',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.settingssets.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          id: item.id,
          numberOfRows: item.numberOfRows,
          numberOfColumns: item.numberOfColumns,
          fontName: item.fontName,
          fontSize: item.fontSize,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

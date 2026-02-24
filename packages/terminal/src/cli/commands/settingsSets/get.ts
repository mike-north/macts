import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a settingsset by ID.
 */
export class GetSettingsSetCommand extends Command {
  static override paths = [['terminal', 'settingsSets', 'get']]

  static override usage = Command.Usage({
    description: 'Get a settingsset by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  settingsSetId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.settingssets.get(this.settingsSetId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        numberOfRows: item.numberOfRows,
        numberOfColumns: item.numberOfColumns,
        fontName: item.fontName,
        fontSize: item.fontSize,
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

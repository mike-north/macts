import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new settingsset.
 */
export class CreateSettingsSetCommand extends Command {
  static override paths = [['terminal', 'settingsSets', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new settingsset',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of the settings set' })
  numberOfRows = Option.String('--number-of-rows', {
    required: true,
    description: 'The number of rows',
  })
  numberOfColumns = Option.String('--number-of-columns', {
    required: true,
    description: 'The number of columns',
  })
  fontName = Option.String('--font-name', { required: true, description: 'The name of the font' })
  fontSize = Option.String('--font-size', { required: true, description: 'The size of the font' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.settingssets.create({
        name: this.name,
        numberOfRows: this.numberOfRows,
        numberOfColumns: this.numberOfColumns,
        fontName: this.fontName,
        fontSize: this.fontSize,
      } as unknown as Parameters<typeof client.settingssets.create>[0])

      const output = formatter.format({
        message: 'SettingsSet created successfully',
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

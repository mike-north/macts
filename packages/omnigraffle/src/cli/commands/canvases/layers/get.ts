import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a layer by name.
 */
export class GetLayerCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'layers', 'get']]

  static override usage = Command.Usage({
    description:
      "Get a layer by name. When several layers share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  layerId = Option.String({ name: 'name', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.layers.get(this.layerId)

      const output = formatter.format({
        name: item.name,
        locked: item.locked,
        visible: item.visible,
        prints: item.prints,
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

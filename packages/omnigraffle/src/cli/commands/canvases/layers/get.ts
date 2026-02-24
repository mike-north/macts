import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a layer by ID.
 */
export class GetLayerCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'layers', 'get']]

  static override usage = Command.Usage({
    description: 'Get a layer by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })

  layerId = Option.String({ required: true })

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

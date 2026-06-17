import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List layers.
 */
export class ListLayersCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'layers', 'list']]

  static override usage = Command.Usage({
    description: 'List layers',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.layers.list(this.canvasId)

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          locked: item.locked,
          visible: item.visible,
          prints: item.prints,
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

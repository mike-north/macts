import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List shapes.
 */
export class ListShapesCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'shapes', 'list']]

  static override usage = Command.Usage({
    description: 'List shapes',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.shapes.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          text: item.text,
          fill: item.fill,
          fillColor: item.fillColor,
          gradientColor: item.gradientColor,
          gradientAngle: item.gradientAngle,
          rotation: item.rotation,
          textPlacement: item.textPlacement,
          autosizing: item.autosizing,
          sidePadding: item.sidePadding,
          verticalPadding: item.verticalPadding,
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

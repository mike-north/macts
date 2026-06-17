import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List graphics.
 */
export class ListGraphicsCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'graphics', 'list']]

  static override usage = Command.Usage({
    description: 'List graphics',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.graphics.list(this.canvasId)

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          origin: item.origin,
          size: item.size,
          locked: item.locked,
          allowsConnections: item.allowsConnections,
          alignsEdgesToGrid: item.alignsEdgesToGrid,
          cornerRadius: item.cornerRadius,
          drawsShadow: item.drawsShadow,
          drawsStroke: item.drawsStroke,
          doubleStroke: item.doubleStroke,
          flippedHorizontally: item.flippedHorizontally,
          flippedVertically: item.flippedVertically,
          shadowColor: item.shadowColor,
          shadowFuzziness: item.shadowFuzziness,
          shadowVector: item.shadowVector,
          shadowBeneath: item.shadowBeneath,
          strokeColor: item.strokeColor,
          strokeCap: item.strokeCap,
          strokeJoin: item.strokeJoin,
          strokePattern: item.strokePattern,
          thickness: item.thickness,
          notes: item.notes,
          userName: item.userName,
          tag: item.tag,
          url: item.url,
          script: item.script,
          rankGroup: item.rankGroup,
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

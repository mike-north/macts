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
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.graphics.list(this.canvasId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
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
        })),
        page.nextCursor
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

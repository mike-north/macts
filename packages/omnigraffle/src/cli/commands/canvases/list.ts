import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List canvases.
 */
export class ListCanvasesCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'list']]

  static override usage = Command.Usage({
    description: 'List canvases',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.canvases.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          adjustsPages: item.adjustsPages,
          canvasSizeIsMeasuredInPages: item.canvasSizeIsMeasuredInPages,
          canvasSize: item.canvasSize,
          pageSize: item.pageSize,
          horizontalPages: item.horizontalPages,
          verticalPages: item.verticalPages,
          columnAlignment: item.columnAlignment,
          rowAlignment: item.rowAlignment,
          columnSpacing: item.columnSpacing,
          rowSpacing: item.rowSpacing,
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

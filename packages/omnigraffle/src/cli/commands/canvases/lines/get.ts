import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a line by ID.
 */
export class GetLineCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'lines', 'get']]

  static override usage = Command.Usage({
    description: 'Get a line by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })

  lineId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.lines.get(this.lineId)

      const output = formatter.format({
        id: item.id,
        lineType: item.lineType,
        hopType: item.hopType,
        headType: item.headType,
        tailType: item.tailType,
        headScale: item.headScale,
        tailScale: item.tailScale,
        headMagnet: item.headMagnet,
        tailMagnet: item.tailMagnet,
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

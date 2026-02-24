import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new canvas.
 */
export class CreateCanvasCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new canvas',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  id = Option.String('--id', { required: true, description: 'Unique identifier' })
  name = Option.String('--name', { required: true, description: 'Name of this canvas' })
  adjustsPages = Option.Boolean('--adjusts-pages', {
    description: 'Adjust number of pages on the canvas automatically?',
  })
  canvasSizeIsMeasuredInPages = Option.Boolean('--canvas-size-is-measured-in-pages', {
    description: 'Whether canvas size is reported as multiples of page size',
  })
  canvasSize = Option.String('--canvas-size', {
    required: true,
    description: 'Size of the canvas (page size multiplied by number of pages)',
  })
  horizontalPages = Option.String('--horizontal-pages', {
    required: true,
    description: 'Horizontal pages',
  })
  verticalPages = Option.String('--vertical-pages', {
    required: true,
    description: 'Vertical pages',
  })
  columnAlignment = Option.String('--column-alignment', {
    required: true,
    description: 'Column alignment',
    validator: t.isEnum(['left', 'center', 'right']),
  })
  rowAlignment = Option.String('--row-alignment', {
    required: true,
    description: 'Row alignment',
    validator: t.isEnum(['top', 'center', 'bottom']),
  })
  columnSpacing = Option.String('--column-spacing', {
    required: true,
    description: 'Spacing between graphics in a column',
  })
  rowSpacing = Option.String('--row-spacing', {
    required: true,
    description: 'Spacing between graphics in a row',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.canvases.create({
        id: this.id,
        name: this.name,
        adjustsPages: this.adjustsPages,
        canvasSizeIsMeasuredInPages: this.canvasSizeIsMeasuredInPages,
        canvasSize: this.canvasSize,
        horizontalPages: this.horizontalPages,
        verticalPages: this.verticalPages,
        columnAlignment: this.columnAlignment,
        rowAlignment: this.rowAlignment,
        columnSpacing: this.columnSpacing,
        rowSpacing: this.rowSpacing,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Canvas created successfully',
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

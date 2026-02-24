import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new shape.
 */
export class CreateShapeCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'shapes', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new shape',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })
  name = Option.String('--name', { required: true, description: 'Name of the shape' })
  text = Option.String('--text', { required: true, description: 'The text inside the shape' })
  fill = Option.String('--fill', {
    required: true,
    description: 'The type of fill for this shape',
    validator: t.isEnum(['noFill', 'solidFill', 'linearFill', 'radialFill']),
  })
  fillColor = Option.String('--fill-color', { required: true, description: 'The fill color' })
  gradientColor = Option.String('--gradient-color', {
    required: true,
    description: 'For linear and radial fills, this is the ending color',
  })
  gradientAngle = Option.String('--gradient-angle', {
    required: true,
    description: 'Angle of a linear gradient fill',
  })
  rotation = Option.String('--rotation', {
    required: true,
    description: 'Rotation of the graphic in degrees',
  })
  textPlacement = Option.String('--text-placement', {
    required: true,
    description: 'Placement of the text inside the shape',
    validator: t.isEnum(['top', 'center', 'bottom']),
  })
  autosizing = Option.String('--autosizing', {
    required: true,
    description: 'Autosizing behavior of the shape around the text',
    validator: t.isEnum(['overflow', 'full', 'verticallyOnly', 'clip']),
  })
  sidePadding = Option.String('--side-padding', {
    required: true,
    description: 'Padding at the left and right of the text space',
  })
  verticalPadding = Option.String('--vertical-padding', {
    required: true,
    description: 'Padding at the top and bottom of the text space',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.shapes.create({
        name: this.name,
        text: this.text,
        fill: this.fill,
        fillColor: this.fillColor,
        gradientColor: this.gradientColor,
        gradientAngle: this.gradientAngle,
        rotation: this.rotation,
        textPlacement: this.textPlacement,
        autosizing: this.autosizing,
        sidePadding: this.sidePadding,
        verticalPadding: this.verticalPadding,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Shape created successfully',
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

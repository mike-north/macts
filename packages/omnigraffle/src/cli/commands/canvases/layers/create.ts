import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new layer.
 */
export class CreateLayerCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'layers', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new layer',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })
  name = Option.String('--name', { required: true, description: 'Name of the layer' })
  locked = Option.Boolean('--locked', { description: "Are the layer's graphics locked?" })
  visible = Option.Boolean('--visible', { description: "Are the layer's graphics visible?" })
  prints = Option.Boolean('--prints', { description: "Do the layer's graphics print?" })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.layers.create({
        name: this.name,
        locked: this.locked,
        visible: this.visible,
        prints: this.prints,
      } as unknown as Parameters<typeof client.layers.create>[0])

      const output = formatter.format({
        message: 'Layer created successfully',
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

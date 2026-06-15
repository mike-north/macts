import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new subgraph.
 */
export class CreateSubgraphCommand extends Command {
  static override paths = [['omnigraffle', 'canvases', 'subgraphs', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new subgraph',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' })
  collapsed = Option.Boolean('--collapsed', { description: 'Is the subgraph collapsed?' })
  topMargin = Option.String('--top-margin', { required: true, description: 'Top margin' })
  bottomMargin = Option.String('--bottom-margin', { required: true, description: 'Bottom margin' })
  leftMargin = Option.String('--left-margin', { required: true, description: 'Left margin' })
  rightMargin = Option.String('--right-margin', { required: true, description: 'Right margin' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.subgraphs.create({
        collapsed: this.collapsed,
        topMargin: this.topMargin,
        bottomMargin: this.bottomMargin,
        leftMargin: this.leftMargin,
        rightMargin: this.rightMargin,
      } as unknown as Parameters<typeof client.subgraphs.create>[0])

      const output = formatter.format({
        message: 'Subgraph created successfully',
        id: item.id,
        collapsed: item.collapsed,
        topMargin: item.topMargin,
        bottomMargin: item.bottomMargin,
        leftMargin: item.leftMargin,
        rightMargin: item.rightMargin,
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

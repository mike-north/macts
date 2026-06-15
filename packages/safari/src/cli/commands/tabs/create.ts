import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new tab.
 */
export class CreateTabCommand extends Command {
  static override paths = [['safari', 'tabs', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new tab',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  url = Option.String('--url', { required: true, description: 'The tab URL' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.tabs.create({
        url: this.url,
      } as unknown as Parameters<typeof client.tabs.create>[0])

      const output = formatter.format({
        message: 'Tab created successfully',
        name: item.name,
        id: item.id,
        url: item.url,
        source: item.source,
        text: item.text,
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

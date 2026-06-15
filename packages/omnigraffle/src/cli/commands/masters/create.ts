import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new master.
 */
export class CreateMasterCommand extends Command {
  static override paths = [['omnigraffle', 'masters', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new master',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  id = Option.String('--id', { required: true, description: 'Unique identifier' })
  name = Option.String('--name', { required: true, description: 'Name of this master' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.masters.create({
        id: this.id,
        name: this.name,
      } as unknown as Parameters<typeof client.masters.create>[0])

      const output = formatter.format({
        message: 'Master created successfully',
        id: item.id,
        name: item.name,
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

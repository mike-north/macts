import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new jabberhandle.
 */
export class CreateJabberHandleCommand extends Command {
  static override paths = [['contacts', 'groups', 'people', 'jabberHandles', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new jabberhandle',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })
  label = Option.String('--label', { required: true, description: 'Label for this handle' })
  value = Option.String('--value', { required: true, description: 'The Jabber handle value' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.jabberhandles.create({
        label: this.label,
        value: this.value,
      } as unknown as Parameters<typeof client.jabberhandles.create>[0])

      const output = formatter.format({
        message: 'JabberHandle created successfully',
        id: item.id,
        label: item.label,
        value: item.value,
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

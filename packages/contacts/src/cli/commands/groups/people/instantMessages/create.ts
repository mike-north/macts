import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new instantmessage.
 */
export class CreateInstantMessageCommand extends Command {
  static override paths = [['contacts', 'groups', 'people', 'instantMessages', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new instantmessage',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })
  serviceType = Option.String('--service-type', {
    required: true,
    description: 'The service type of this instant message address.',
  })
  userName = Option.String('--user-name', {
    required: true,
    description: 'The user name of this instant message address.',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.instantmessages.create({
        serviceType: this.serviceType,
        userName: this.userName,
      } as unknown as Parameters<typeof client.instantmessages.create>[0])

      const output = formatter.format({
        message: 'InstantMessage created successfully',
        serviceName: item.serviceName,
        serviceType: item.serviceType,
        userName: item.userName,
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

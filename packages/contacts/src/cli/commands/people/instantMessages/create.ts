import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new instantmessage.
 */
export class CreateInstantMessageCommand extends Command {
  static override paths = [['contacts', 'people', 'instantMessages', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new instantmessage',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
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
      const item = await client.instantmessages.create({
        serviceType: this.serviceType,
        userName: this.userName,
      } as Record<string, unknown>)

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

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new inboxtask.
 */
export class CreateInboxTaskCommand extends Command {
  static override paths = [['omnifocus', 'inboxTasks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new inboxtask',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of the inbox task' })
  note = Option.String('--note', { required: true, description: 'The note of the inbox task' })
  flagged = Option.Boolean('--flagged', { description: 'True if flagged' })
  deferDate = Option.String('--defer-date', {
    required: true,
    description: 'When the task should become available for action',
  })
  dueDate = Option.String('--due-date', {
    required: true,
    description: 'When the task must be finished',
  })
  creationDate = Option.String('--creation-date', {
    required: true,
    description: 'When the task was created',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.inboxtasks.create({
        name: this.name,
        note: this.note,
        flagged: this.flagged,
        deferDate: this.deferDate,
        dueDate: this.dueDate,
        creationDate: this.creationDate,
      } as unknown as Parameters<typeof client.inboxtasks.create>[0])

      const output = formatter.format({
        message: 'InboxTask created successfully',
        id: item.id,
        name: item.name,
        note: item.note,
        flagged: item.flagged,
        deferDate: item.deferDate,
        dueDate: item.dueDate,
        creationDate: item.creationDate,
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

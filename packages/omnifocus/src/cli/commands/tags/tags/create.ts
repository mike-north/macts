import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new tag.
 */
export class CreateTagCommand extends Command {
  static override paths = [['omnifocus', 'tags', 'tags', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new tag',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  tagId = Option.String('--tag-id', { required: true, description: 'Tag ID' })
  name = Option.String('--name', { required: true, description: 'The name of the tag' })
  note = Option.String('--note', { required: true, description: 'The note of the tag' })
  allowsNextAction = Option.Boolean('--allows-next-action', {
    description:
      'If false, tasks associated with this tag will be skipped when determining the next action for a project',
  })
  hidden = Option.Boolean('--hidden', { description: 'Set if the tag is currently hidden' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.tags.create({
        name: this.name,
        note: this.note,
        allowsNextAction: this.allowsNextAction,
        hidden: this.hidden,
      } as unknown as Parameters<typeof client.tags.create>[0])

      const output = formatter.format({
        message: 'Tag created successfully',
        id: item.id,
        name: item.name,
        note: item.note,
        allowsNextAction: item.allowsNextAction,
        hidden: item.hidden,
        effectivelyHidden: item.effectivelyHidden,
        availableTaskCount: item.availableTaskCount,
        remainingTaskCount: item.remainingTaskCount,
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

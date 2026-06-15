import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new shortcut.
 */
export class CreateShortcutCommand extends Command {
  static override paths = [['shortcuts', 'folders', 'shortcuts', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new shortcut',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  folderId = Option.String('--folder-id', { required: true, description: 'Folder ID' })
  folder = Option.String('--folder', {
    required: true,
    description: 'The folder containing this shortcut (folder ID)',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.shortcuts.create({
        folder: this.folder,
      } as unknown as Parameters<typeof client.shortcuts.create>[0])

      const output = formatter.format({
        message: 'Shortcut created successfully',
        name: item.name,
        subtitle: item.subtitle,
        id: item.id,
        folder: item.folder,
        color: item.color,
        icon: item.icon,
        acceptsInput: item.acceptsInput,
        actionCount: item.actionCount,
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

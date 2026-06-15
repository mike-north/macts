import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new bookmarkitem.
 */
export class CreateBookmarkItemCommand extends Command {
  static override paths = [['google-chrome', 'bookmarkFolders', 'bookmarkItems', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new bookmarkitem',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  bookmarkFolderId = Option.String('--bookmark-folder-id', {
    required: true,
    description: 'BookmarkFolder ID',
  })
  title = Option.String('--title', {
    required: true,
    description: 'The title of the bookmark item.',
  })
  uRL = Option.String('--u-rl', { required: true, description: 'The URL of the bookmark.' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.bookmarkitems.create({
        title: this.title,
        uRL: this.uRL,
      } as unknown as Parameters<typeof client.bookmarkitems.create>[0])

      const output = formatter.format({
        message: 'BookmarkItem created successfully',
        id: item.id,
        title: item.title,
        uRL: item.uRL,
        index: item.index,
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

import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List messageviewers.
 */
export class ListMessageViewersCommand extends Command {
  static override paths = [['mail', 'messageViewers', 'list']]

  static override usage = Command.Usage({
    description: 'List messageviewers',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.messageviewers.list()

      const output = formatter.formatList(
        items.map((item) => ({
          draftsMailbox: item.draftsMailbox,
          inbox: item.inbox,
          junkMailbox: item.junkMailbox,
          outbox: item.outbox,
          sentMailbox: item.sentMailbox,
          trashMailbox: item.trashMailbox,
          sortColumn: item.sortColumn,
          sortedAscending: item.sortedAscending,
          mailboxListVisible: item.mailboxListVisible,
          previewPaneIsVisible: item.previewPaneIsVisible,
          visibleColumns: item.visibleColumns,
          id: item.id,
          visibleMessages: item.visibleMessages,
          selectedMessages: item.selectedMessages,
          selectedMailboxes: item.selectedMailboxes,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

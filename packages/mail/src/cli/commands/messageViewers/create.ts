import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new messageviewer.
 */
export class CreateMessageViewerCommand extends Command {
  static override paths = [['mail', 'messageViewers', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new messageviewer',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sortColumn = Option.String('--sort-column', {
    required: true,
    description: 'The column that is currently sorted in the viewer',
  })
  sortedAscending = Option.Boolean('--sorted-ascending', {
    description: 'Whether the viewer is sorted ascending or not',
  })
  mailboxListVisible = Option.Boolean('--mailbox-list-visible', {
    description: 'Controls whether the list of mailboxes is visible or not',
  })
  previewPaneIsVisible = Option.Boolean('--preview-pane-is-visible', {
    description: 'Controls whether the preview pane of the message viewer window is visible or not',
  })
  visibleColumns = Option.String('--visible-columns', {
    required: true,
    description:
      'List of columns that are visible. The subject column and the message status column will always be visible',
  })
  visibleMessages = Option.String('--visible-messages', {
    required: true,
    description: 'List of messages currently being displayed in the viewer',
  })
  selectedMessages = Option.String('--selected-messages', {
    required: true,
    description: 'List of messages currently selected',
  })
  selectedMailboxes = Option.String('--selected-mailboxes', {
    required: true,
    description: 'List of mailboxes currently selected in the list of mailboxes',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.messageviewers.create({
        sortColumn: this.sortColumn,
        sortedAscending: this.sortedAscending,
        mailboxListVisible: this.mailboxListVisible,
        previewPaneIsVisible: this.previewPaneIsVisible,
        visibleColumns: this.visibleColumns,
        visibleMessages: this.visibleMessages,
        selectedMessages: this.selectedMessages,
        selectedMailboxes: this.selectedMailboxes,
      } as unknown as Parameters<typeof client.messageviewers.create>[0])

      const output = formatter.format({
        message: 'MessageViewer created successfully',
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

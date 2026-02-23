import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a messageviewer by ID.
 */
export class GetMessageViewerCommand extends Command {
  static override paths = [["mail", "messageViewers", "get"]];

  static override usage = Command.Usage({
    description: 'Get a messageviewer by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  messageViewerId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.messageviewers.get(this.messageViewerId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('MessageViewer not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

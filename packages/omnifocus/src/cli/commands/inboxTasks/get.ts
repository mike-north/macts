import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a inboxtask by ID.
 */
export class GetInboxTaskCommand extends Command {
  static override paths = [["omnifocus", "inboxTasks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a inboxtask by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  inboxTaskId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.inboxtasks.get(this.inboxTaskId);

      const output = formatter.format({
        id: item.id,
        name: item.name,
        note: item.note,
        flagged: item.flagged,
        deferDate: item.deferDate,
        dueDate: item.dueDate,
        creationDate: item.creationDate,
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

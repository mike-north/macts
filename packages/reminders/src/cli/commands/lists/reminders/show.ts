import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Show the reminder in Reminders.app UI
 */
export class ShowReminderCommand extends Command {
  static override paths = [["reminders", "lists", "reminders", "show"]];

  static override usage = Command.Usage({
    description: "Show the reminder in Reminders.app UI",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  listId = Option.String('--list-id', { required: true, description: 'List ID' });

  reminderId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.reminders.show();

      const output = formatter.formatSuccess('show completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

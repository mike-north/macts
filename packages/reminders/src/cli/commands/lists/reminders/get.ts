import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a reminder by ID.
 */
export class GetReminderCommand extends Command {
  static override paths = [["reminders", "lists", "reminders", "get"]];

  static override usage = Command.Usage({
    description: 'Get a reminder by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  listId = Option.String('--list-id', { required: true, description: 'List ID' });

  reminderId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.reminders.get(this.reminderId);

      const output = formatter.format({
        name: item.name,
        id: item.id,
        body: item.body,
        completed: item.completed,
        completionDate: item.completionDate,
        dueDate: item.dueDate,
        remindMeDate: item.remindMeDate,
        priority: item.priority,
        flagged: item.flagged,
        creationDate: item.creationDate,
        modificationDate: item.modificationDate,
        allDayDueDate: item.allDayDueDate,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new list.
 */
export class CreateListCommand extends Command {
  static override paths = [["reminders", "lists", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new list',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  name = Option.String('--name', { required: true, description: "The name of the list" });
  color = Option.String('--color', { required: true, description: "The color of the list" });
  emblem = Option.String('--emblem', { required: true, description: "The emblem icon name of the list" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.lists.create({
        name: this.name,
        color: this.color,
        emblem: this.emblem,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'List created successfully',
        name: item.name,
        id: item.id,
        color: item.color,
        emblem: item.emblem,
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

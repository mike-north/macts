import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Create a new url.
 */
export class CreateUrlCommand extends Command {
  static override paths = [["contacts", "groups", "people", "urls", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new url',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });
  label = Option.String('--label', { required: true, description: "Label for this URL" });
  value = Option.String('--value', { required: true, description: "The URL value" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.urls.create({
        label: this.label,
        value: this.value,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Url created successfully',
        id: item.id,
        label: item.label,
        value: item.value,
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

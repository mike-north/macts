import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new email.
 */
export class CreateEmailCommand extends Command {
  static override paths = [["contacts", "people", "emails", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new email',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });
  label = Option.String('--label', { required: true, description: "Label for this email" });
  value = Option.String('--value', { required: true, description: "The email address" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.emails.create({
        label: this.label,
        value: this.value,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Email created successfully',
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

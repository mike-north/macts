import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
 */
export class ExtractAddressFromCommand extends Command {
  static override paths = [["mail", "extract-address-from"]];

  static override usage = Command.Usage({
    description: "Command to get just the email address of a fully specified email address. E.g. Calling this with \"John Doe <jdoe@example.com>\" as the direct object would return \"jdoe@example.com\"",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.extractAddressFrom();

      const output = formatter.formatSuccess('extractAddressFrom completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

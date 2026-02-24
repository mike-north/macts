import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Triggers a check for email.
 */
export class CheckForNewMailCommand extends Command {
  static override paths = [["mail", "check-for-new-mail"]];

  static override usage = Command.Usage({
    description: "Triggers a check for email.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  for = Option.String('--for', { required: false, description: "Specify the account that you wish to check for mail" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.checkForNewMail(this.for as unknown);

      const output = formatter.formatSuccess('checkForNewMail completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

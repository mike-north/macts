import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Create a new window with the default profile
 */
export class CreateWindowWithDefaultProfileCommand extends Command {
  static override paths = [["iterm", "create-window-with-default-profile"]];

  static override usage = Command.Usage({
    description: "Create a new window with the default profile",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  command = Option.String('--command', { required: false, description: "Shell command to run" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.createWindowWithDefaultProfile(this.command as unknown);

      const output = formatter.formatSuccess('createWindowWithDefaultProfile completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Create a new tab with the default profile
 */
export class CreateTabWithDefaultProfileCommand extends Command {
  static override paths = [["iterm", "create-tab-with-default-profile"]];

  static override usage = Command.Usage({
    description: "Create a new tab with the default profile",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  command = Option.String('--command', { required: false, description: "Shell command to run" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.createTabWithDefaultProfile(this.command as any);

      const output = formatter.formatSuccess('createTabWithDefaultProfile completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

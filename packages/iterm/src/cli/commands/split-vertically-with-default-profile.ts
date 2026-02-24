import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Split a session vertically, using the default profile for the new session
 */
export class SplitVerticallyWithDefaultProfileCommand extends Command {
  static override paths = [["iterm", "split-vertically-with-default-profile"]];

  static override usage = Command.Usage({
    description: "Split a session vertically, using the default profile for the new session",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  command = Option.String('--command', { required: false, description: "Shell command to run" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.splitVerticallyWithDefaultProfile(this.command as unknown);

      const output = formatter.formatSuccess('splitVerticallyWithDefaultProfile completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

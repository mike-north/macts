import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Split a session horizontally, using the original session's profile for the new session
 */
export class SplitHorizontallyWithSameProfileCommand extends Command {
  static override paths = [["iterm", "split-horizontally-with-same-profile"]];

  static override usage = Command.Usage({
    description: "Split a session horizontally, using the original session's profile for the new session",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  command = Option.String('--command', { required: false, description: "Shell command to run" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.splitHorizontallyWithSameProfile(this.command as any);

      const output = formatter.formatSuccess('splitHorizontallyWithSameProfile completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

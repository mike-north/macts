import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Shut Down the computer
 */
export class ShutDownCommand extends Command {
  static override paths = [["system-events", "shut-down"]];

  static override usage = Command.Usage({
    description: "Shut Down the computer",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  stateSavingPreference = Option.Boolean('--state-saving-preference', { description: "Is the user defined state saving preference followed?" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.shutDown(this.stateSavingPreference as any);

      const output = formatter.formatSuccess('shutDown completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

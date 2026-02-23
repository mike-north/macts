import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Reveals a hotkey window. Only to be called on windows that are hotkey windows.
 */
export class RevealHotkeyWindowCommand extends Command {
  static override paths = [["iterm", "reveal-hotkey-window"]];

  static override usage = Command.Usage({
    description: "Reveals a hotkey window. Only to be called on windows that are hotkey windows.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.revealHotkeyWindow();

      const output = formatter.formatSuccess('revealHotkeyWindow completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

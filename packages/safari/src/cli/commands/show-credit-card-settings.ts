import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show Safari Credit Card Settings.
 */
export class ShowCreditCardSettingsCommand extends Command {
  static override paths = [["safari", "show-credit-card-settings"]];

  static override usage = Command.Usage({
    description: "Show Safari Credit Card Settings.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.showCreditCardSettings();

      const output = formatter.formatSuccess('showCreditCardSettings completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

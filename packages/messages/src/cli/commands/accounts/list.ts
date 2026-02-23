import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List accounts.
 */
export class ListAccountsCommand extends Command {
  static override paths = [["messages", "accounts", "list"]];

  static override usage = Command.Usage({
    description: 'List accounts',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.accounts.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        description: item.description,
        enabled: item.enabled,
        connectionStatus: item.connectionStatus,
        serviceType: item.serviceType,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

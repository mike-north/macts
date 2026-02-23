import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List containers.
 */
export class ListContainersCommand extends Command {
  static override paths = [["photos", "folders", "containers", "list"]];

  static override usage = Command.Usage({
    description: 'List containers',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  folderId = Option.String('--folder-id', { required: true, description: 'Folder ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.containers.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        parent: item.parent,
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

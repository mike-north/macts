import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a folder by ID.
 */
export class GetFolderCommand extends Command {
  static override paths = [["notes", "folders", "get"]];

  static override usage = Command.Usage({
    description: 'Get a folder by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  folderId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.folders.get(this.folderId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Folder not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        id: item.id,
        container: item.container,
        shared: item.shared,
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

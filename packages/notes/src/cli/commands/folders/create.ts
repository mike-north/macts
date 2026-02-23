import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new folder.
 */
export class CreateFolderCommand extends Command {
  static override paths = [["notes", "folders", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new folder',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  name = Option.String('--name', { required: true, description: "The name of the folder" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.folders.create({
        name: this.name,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Folder created successfully',
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

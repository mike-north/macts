import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
 */
export class RunShortcutCommand extends Command {
  static override paths = [["shortcuts", "folders", "shortcuts", "run"]];

  static override usage = Command.Usage({
    description: "Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  folderId = Option.String('--folder-id', { required: true, description: 'Folder ID' });

  shortcutId = Option.String({ required: true });
  id = Option.String('--id', { required: true, description: "The shortcut to run" });
  withInput = Option.String('--with-input', { required: false, description: "The input to provide to the shortcut" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.shortcuts.run(this.id as unknown, this.withInput as unknown);

      const output = formatter.formatSuccess('run completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

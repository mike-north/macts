import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Replace text in the document
 */
export class ReplaceCommand extends Command {
  static override paths = [["microsoft-word", "replace"]];

  static override usage = Command.Usage({
    description: "Replace text in the document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  findText = Option.String('--find-text', { required: true, description: "The text to search for" });
  replaceWith = Option.String('--replace-with', { required: true, description: "The replacement text" });
  replaceAll = Option.Boolean('--replace-all', { description: "Whether to replace all occurrences" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.replace(this.findText as any, this.replaceWith as any, this.replaceAll as any);

      const output = formatter.formatSuccess('replace completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

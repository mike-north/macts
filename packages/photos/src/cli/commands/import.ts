import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Import files into the library
 */
export class ImportCommand extends Command {
  static override paths = [["photos", "import"]];

  static override usage = Command.Usage({
    description: "Import files into the library",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  files = Option.String('--files', { required: true, description: "The list of files to copy" });
  into = Option.String('--into', { required: false, description: "The album to import into" });
  skipCheckDuplicates = Option.Boolean('--skip-check-duplicates', { description: "Skip duplicate checking and import everything" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client._import(this.files as unknown, this.into as unknown, this.skipCheckDuplicates as unknown);

      const output = formatter.formatSuccess('import completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

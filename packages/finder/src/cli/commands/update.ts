import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Update the display of the specified object(s) to match their on-disk representation
 */
export class UpdateCommand extends Command {
  static override paths = [["finder", "update"]];

  static override usage = Command.Usage({
    description: "Update the display of the specified object(s) to match their on-disk representation",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  necessity = Option.Boolean('--necessity', { description: "only update if necessary (i.e. a finder window is open). default is false" });
  registeringApplications = Option.Boolean('--registering-applications', { description: "register applications. default is true" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.update(this.necessity as unknown, this.registeringApplications as unknown);

      const output = formatter.formatSuccess('update completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}

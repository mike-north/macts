import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a disk by ID.
 */
export class GetDiskCommand extends Command {
  static override paths = [["finder", "disks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a disk by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  diskId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.disks.get(this.diskId);

      const output = formatter.format({
        id: item.id,
        capacity: item.capacity,
        freeSpace: item.freeSpace,
        ejectable: item.ejectable,
        localVolume: item.localVolume,
        startup: item.startup,
        format: item.format,
        journalingEnabled: item.journalingEnabled,
        ignorePrivileges: item.ignorePrivileges,
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

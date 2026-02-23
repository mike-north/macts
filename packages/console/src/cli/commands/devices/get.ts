import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a device by ID.
 */
export class GetDeviceCommand extends Command {
  static override paths = [["console", "devices", "get"]];

  static override usage = Command.Usage({
    description: 'Get a device by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  deviceId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.devices.get(this.deviceId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Device not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        id: item.id,
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

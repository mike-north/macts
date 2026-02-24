import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a airplaydevice by ID.
 */
export class GetAirPlayDeviceCommand extends Command {
  static override paths = [["music", "airPlayDevices", "get"]];

  static override usage = Command.Usage({
    description: 'Get a airplaydevice by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  airPlayDeviceId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.airplaydevices.get(this.airPlayDeviceId);

      const output = formatter.format({
        active: item.active,
        available: item.available,
        kind: item.kind,
        networkAddress: item.networkAddress,
        protected: item.protected,
        selected: item.selected,
        supportsAudio: item.supportsAudio,
        supportsVideo: item.supportsVideo,
        soundVolume: item.soundVolume,
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

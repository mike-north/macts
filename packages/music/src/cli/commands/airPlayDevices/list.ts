import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List airplaydevices.
 */
export class ListAirPlayDevicesCommand extends Command {
  static override paths = [["music", "airPlayDevices", "list"]];

  static override usage = Command.Usage({
    description: 'List airplaydevices',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.airplaydevices.list();

      const output = formatter.formatList(items.map(item => ({
        active: item.active,
        available: item.available,
        kind: item.kind,
        networkAddress: item.networkAddress,
        protected: item.protected,
        selected: item.selected,
        supportsAudio: item.supportsAudio,
        supportsVideo: item.supportsVideo,
        soundVolume: item.soundVolume,
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

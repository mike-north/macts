import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List eqpresets.
 */
export class ListEQPresetsCommand extends Command {
  static override paths = [["music", "eQPresets", "list"]];

  static override usage = Command.Usage({
    description: 'List eqpresets',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.eqpresets.list();

      const output = formatter.formatList(items.map(item => ({
        band1: item.band1,
        band2: item.band2,
        band3: item.band3,
        band4: item.band4,
        band5: item.band5,
        band6: item.band6,
        band7: item.band7,
        band8: item.band8,
        band9: item.band9,
        band10: item.band10,
        modifiable: item.modifiable,
        preamp: item.preamp,
        updateTracks: item.updateTracks,
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

import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a urltrack by ID.
 */
export class GetURLTrackCommand extends Command {
  static override paths = [["music", "sources", "radioTunerPlaylists", "uRLTracks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a urltrack by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  radioTunerPlaylistId = Option.String('--radio-tuner-playlist-id', { required: true, description: 'RadioTunerPlaylist ID' });

  uRLTrackId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.urltracks.get(this.uRLTrackId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('URLTrack not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        address: item.address,
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

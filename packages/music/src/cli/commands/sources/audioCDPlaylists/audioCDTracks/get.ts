import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a audiocdtrack by ID.
 */
export class GetAudioCDTrackCommand extends Command {
  static override paths = [["music", "sources", "audioCDPlaylists", "audioCDTracks", "get"]];

  static override usage = Command.Usage({
    description: 'Get a audiocdtrack by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  audioCDPlaylistId = Option.String('--audio-cdplaylist-id', { required: true, description: 'AudioCDPlaylist ID' });

  audioCDTrackId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.audiocdtracks.get(this.audioCDTrackId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('AudioCDTrack not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        location: item.location,
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

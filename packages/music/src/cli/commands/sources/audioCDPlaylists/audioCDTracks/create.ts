import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Create a new audiocdtrack.
 */
export class CreateAudioCDTrackCommand extends Command {
  static override paths = [["music", "sources", "audioCDPlaylists", "audioCDTracks", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new audiocdtrack',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' });
  audioCDPlaylistId = Option.String('--audio-cdplaylist-id', { required: true, description: 'AudioCDPlaylist ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.audiocdtracks.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'AudioCDTrack created successfully',
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

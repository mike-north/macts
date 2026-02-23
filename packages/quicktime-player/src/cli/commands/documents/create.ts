import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new document.
 */
export class CreateDocumentCommand extends Command {
  static override paths = [["quicktime-player", "documents", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new document',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  playing = Option.Boolean('--playing', { description: "Whether the document is currently playing" });
  currentTime = Option.String('--current-time', { required: true, description: "The current playback time in seconds" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.documents.create({
        playing: this.playing,
        currentTime: this.currentTime,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Document created successfully',
        name: item.name,
        id: item.id,
        path: item.path,
        playing: item.playing,
        duration: item.duration,
        currentTime: item.currentTime,
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

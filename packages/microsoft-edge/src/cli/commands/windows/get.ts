import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a window by ID.
 */
export class GetWindowCommand extends Command {
  static override paths = [["microsoft-edge", "windows", "get"]];

  static override usage = Command.Usage({
    description: 'Get a window by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  windowId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.windows.get(this.windowId);

      const output = formatter.format({
        givenName: item.givenName,
        name: item.name,
        id: item.id,
        index: item.index,
        bounds: item.bounds,
        closeable: item.closeable,
        minimizable: item.minimizable,
        minimized: item.minimized,
        resizable: item.resizable,
        visible: item.visible,
        zoomable: item.zoomable,
        zoomed: item.zoomed,
        activeTab: item.activeTab,
        mode: item.mode,
        activeTabIndex: item.activeTabIndex,
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

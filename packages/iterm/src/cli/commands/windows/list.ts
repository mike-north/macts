import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List windows.
 */
export class ListWindowsCommand extends Command {
  static override paths = [["iterm", "windows", "list"]];

  static override usage = Command.Usage({
    description: 'List windows',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.windows.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        alternateIdentifier: item.alternateIdentifier,
        name: item.name,
        index: item.index,
        bounds: item.bounds,
        closeable: item.closeable,
        miniaturizable: item.miniaturizable,
        miniaturized: item.miniaturized,
        resizable: item.resizable,
        visible: item.visible,
        zoomable: item.zoomable,
        zoomed: item.zoomed,
        frontmost: item.frontmost,
        currentTab: item.currentTab,
        currentSession: item.currentSession,
        isHotkeyWindow: item.isHotkeyWindow,
        hotkeyWindowProfile: item.hotkeyWindowProfile,
        position: item.position,
        origin: item.origin,
        size: item.size,
        frame: item.frame,
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

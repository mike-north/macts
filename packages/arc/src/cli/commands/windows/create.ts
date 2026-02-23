import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new window.
 */
export class CreateWindowCommand extends Command {
  static override paths = [["arc", "windows", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new window',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  index = Option.String('--index', { required: true, description: "The index of the window, ordered front to back." });
  minimized = Option.Boolean('--minimized', { description: "Whether the window is currently minimized." });
  visible = Option.Boolean('--visible', { description: "Whether the window is currently visible." });
  zoomed = Option.Boolean('--zoomed', { description: "Whether the window is currently zoomed." });
  incognito = Option.Boolean('--incognito', { description: "Whether the window is an incognito window." });
  mode = Option.String('--mode', { required: true, description: "Represents the mode of the window which can be 'normal' or 'incognito', can be set only once during creation of the window." });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.windows.create({
        index: this.index,
        minimized: this.minimized,
        visible: this.visible,
        zoomed: this.zoomed,
        incognito: this.incognito,
        mode: this.mode,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Window created successfully',
        id: item.id,
        name: item.name,
        index: item.index,
        closeable: item.closeable,
        minimizable: item.minimizable,
        minimized: item.minimized,
        resizable: item.resizable,
        visible: item.visible,
        zoomable: item.zoomable,
        zoomed: item.zoomed,
        activeTab: item.activeTab,
        activeSpace: item.activeSpace,
        incognito: item.incognito,
        mode: item.mode,
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
